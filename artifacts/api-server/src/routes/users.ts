import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireSuperAdmin, generatePassword, generateUsername, hashPassword } from "../lib/auth";
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
  let query = db.select().from(usersTable);
  const users = await query;
  const filtered = role ? users.filter(u => u.role === role) : users;
  res.json(filtered.map(formatUser));
});

router.post("/", requireSuperAdmin, async (req, res) => {
  const { fullName, email, role } = req.body;
  if (!fullName || !role) {
    res.status(400).json({ error: "fullName and role are required" });
    return;
  }
  const username = generateUsername(fullName);
  const generatedPassword = generatePassword();
  const passwordHash = hashPassword(generatedPassword);
  const [user] = await db.insert(usersTable).values({
    username,
    passwordHash,
    fullName,
    email: email || null,
    role,
    isActive: true,
  }).returning();
  await logAction(req, "CREATE_USER", "user", user.id, `Created user ${username} with role ${role}`);
  res.status(201).json({ ...formatUser(user), generatedPassword });
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

router.put("/:id", requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { fullName, email, role, isActive } = req.body;
  const [user] = await db.update(usersTable).set({
    fullName: fullName || undefined,
    email: email !== undefined ? email : undefined,
    role: role || undefined,
    isActive: isActive !== undefined ? isActive : undefined,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  await logAction(req, "UPDATE_USER", "user", id, `Updated user ${id}`);
  res.json(formatUser(user));
});

router.delete("/:id", requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  await logAction(req, "DELETE_USER", "user", id, `Deleted user ${id}`);
  res.status(204).send();
});

export default router;
