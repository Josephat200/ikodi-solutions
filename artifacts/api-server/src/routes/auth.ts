import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/auth";
import { logAction } from "../lib/audit";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const hashed = hashPassword(password);
  if (user.passwordHash !== hashed) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));
  (req.session as any).userId = user.id;
  (req.session as any).userRole = user.role;
  await logAction(req, "LOGIN", "user", user.id, `User ${username} logged in`);
  res.json({
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    token: "session",
  });
});

router.post("/logout", async (req, res) => {
  const userId = (req.session as any)?.userId;
  if (userId) await logAction(req, "LOGOUT", "user", userId, "User logged out");
  req.session.destroy(() => {});
  res.json({ success: true });
});

router.get("/me", async (req, res) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLogin: user.lastLogin?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  });
});

router.put("/me/profile", async (req, res) => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { fullName, email } = req.body;
  if (!fullName) { res.status(400).json({ error: "fullName required" }); return; }
  const [updated] = await db.update(usersTable).set({ fullName, email: email ?? null }).where(eq(usersTable.id, userId)).returning();
  await logAction(req, "UPDATE", "user", userId, "Profile updated");
  res.json({ id: updated.id, username: updated.username, fullName: updated.fullName, email: updated.email, role: updated.role, isActive: updated.isActive, lastLogin: updated.lastLogin?.toISOString() ?? null, createdAt: updated.createdAt.toISOString() });
});

router.put("/me/password", async (req, res) => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) { res.status(400).json({ error: "Both passwords required" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.passwordHash !== hashPassword(currentPassword)) {
    res.status(400).json({ error: "Current password is incorrect" }); return;
  }
  await db.update(usersTable).set({ passwordHash: hashPassword(newPassword) }).where(eq(usersTable.id, userId));
  await logAction(req, "UPDATE", "user", userId, "Password changed");
  res.json({ success: true });
});

export default router;
