import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  requireUserManagementAccess,
  generatePassword,
  getPasswordPolicyMessage,
  hashPassword,
  isPasswordCompliant,
} from "../lib/auth";
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

async function resolveUniqueUsername(preferredUsername?: string, fullName?: string): Promise<string> {
  const cleanPreferred = preferredUsername?.trim().toLowerCase();
  if (cleanPreferred) {
    const [existingPreferred] = await db.select().from(usersTable).where(eq(usersTable.username, cleanPreferred));
    if (!existingPreferred) return cleanPreferred;
  }

  const baseSeed = (fullName || "user").trim();
  for (let i = 0; i < 20; i++) {
    const candidate = `${baseSeed.toLowerCase().replace(/\s+/g, "").slice(0, 6) || "user"}${Math.floor(Math.random() * 9000) + 1000}`;
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, candidate));
    if (!existing) return candidate;
  }

  throw new Error("Unable to generate unique username");
}

router.get("/", requireUserManagementAccess, async (req, res) => {
  const { role } = req.query;
  const users = await db.select().from(usersTable);
  const filtered = role ? users.filter(u => u.role === role) : users;
  res.json(filtered.map(formatUser));
});

router.post("/", requireUserManagementAccess, async (req, res) => {
  const { username, password, fullName, email, role } = req.body;
  if (!fullName || !role) {
    res.status(400).json({ error: "fullName and role are required" });
    return;
  }

  let finalUsername: string;
  try {
    finalUsername = await resolveUniqueUsername(username, fullName);
  } catch {
    res.status(500).json({ error: "Failed to generate username" });
    return;
  }

  const finalPassword = password || generatePassword();
  if (!isPasswordCompliant(finalPassword)) {
    res.status(400).json({ error: getPasswordPolicyMessage() });
    return;
  }
  const passwordHash = hashPassword(finalPassword);
  const [user] = await db.insert(usersTable).values({
    username: finalUsername,
    passwordHash,
    fullName,
    email: email || null,
    role,
    isActive: true,
  }).returning();
  await logAction(req, "CREATE_USER", "user", user.id, `Created user ${finalUsername} with role ${role}`);
  res.status(201).json({
    ...formatUser(user),
    generatedUsername: username ? undefined : finalUsername,
    generatedPassword: password ? undefined : finalPassword,
  });
});

router.get("/:id", requireUserManagementAccess, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

router.put("/:id", requireUserManagementAccess, async (req, res) => {
  const id = parseInt(req.params.id as string);
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
router.put("/:id/reset-password", requireUserManagementAccess, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const { newPassword } = req.body;
  const finalPassword = newPassword || generatePassword();
  if (!isPasswordCompliant(finalPassword)) {
    res.status(400).json({ error: getPasswordPolicyMessage() });
    return;
  }
  await db.update(usersTable).set({ passwordHash: hashPassword(finalPassword), updatedAt: new Date() }).where(eq(usersTable.id, id));
  await logAction(req, "RESET_PASSWORD", "user", id, `Password reset for user ${id}`);
  res.json({ success: true, newPassword: newPassword ? undefined : finalPassword });
});

router.delete("/:id", requireUserManagementAccess, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  await db.delete(usersTable).where(eq(usersTable.id, id));
  await logAction(req, "DELETE_USER", "user", id, `Deleted user ${user?.username ?? id}`);
  res.status(204).send();
});

export default router;
