import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireSuperAdmin, generatePassword, hashPassword } from "../lib/auth";
import { logAction } from "../lib/audit";

const router = Router();

const formatUser = (u: typeof usersTable.$inferSelect) => ({
  id: u.id,
  username: u.username,
  fullName: u.fullName,
  email: u.email,
  role: u.role,
  isActive: u.isActive,
  lastLogin: u.lastLogin?.toISOString() ?? null,
  createdAt: u.createdAt.toISOString(),
});

router.get("/", requireAuth, async (req, res) => {
  const { role } = req.query;
  const users = await db.select().from(usersTable);
  const filtered = role ? users.filter(u => u.role === role) : users;
  res.json(filtered.map(formatUser));
});

router.post("/", requireSuperAdmin, async (req, res) => {
  const { username, password, fullName, email, role } = req.body;
  if (!fullName || !role) {
    res.status(400).json({ error: "fullName and role are required" });
    return;
  }
  if (!username) {
    res.status(400).json({ error: "username is required" });
    return;
  }
  // Check username uniqueness
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existing) {
    res.status(400).json({ error: "Username already exists" });
    return;
  }
  const finalPassword = password || generatePassword();
  const passwordHash = hashPassword(finalPassword);
  const [user] = await db.insert(usersTable).values({
    username,
    passwordHash,
    fullName,
    email: email || null,
    role,
    isActive: true,
  }).returning();
  await logAction(req, "CREATE_USER", "user", user.id, `Created user ${username} with role ${role}`);
  res.status(201).json({ ...formatUser(user), generatedPassword: password ? undefined : finalPassword });
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

router.put("/:id", requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { fullName, email, role, isActive, username } = req.body;
  // Check username uniqueness if changing
  if (username) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, username));
    if (existing && existing.id !== id) {
      res.status(400).json({ error: "Username already taken" });
      return;
    }
  }
  const [user] = await db.update(usersTable).set({
    fullName: fullName || undefined,
    username: username || undefined,
    email: email !== undefined ? email : undefined,
    role: role || undefined,
    isActive: isActive !== undefined ? isActive : undefined,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  await logAction(req, "UPDATE_USER", "user", id, `Updated user ${user.username}`);
  res.json(formatUser(user));
});

// Super admin reset any user's password
router.put("/:id/reset-password", requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { newPassword } = req.body;
  const finalPassword = newPassword || generatePassword();
  await db.update(usersTable).set({ passwordHash: hashPassword(finalPassword), updatedAt: new Date() }).where(eq(usersTable.id, id));
  await logAction(req, "RESET_PASSWORD", "user", id, `Password reset for user ${id}`);
  res.json({ success: true, newPassword: newPassword ? undefined : finalPassword });
});

router.delete("/:id", requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  await db.delete(usersTable).where(eq(usersTable.id, id));
  await logAction(req, "DELETE_USER", "user", id, `Deleted user ${user?.username ?? id}`);
  res.status(204).send();
});

export default router;
