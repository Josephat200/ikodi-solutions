import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import {
  getPasswordPolicyMessage,
  hashPassword,
  isPasswordCompliant,
  verifyPassword,
} from "../lib/auth";
import { logAction } from "../lib/audit";

const router = Router();

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

type DevDemoUser = {
  id: number;
  aliases: readonly string[];
  fullName: string;
  role: "admin" | "program_officer" | "finance_officer" | "viewer" | "sponsor_portal";
  password: string;
};

async function tryDevAuthBypass(identifier: string, password: string) {
  const enableTestBypass =
    process.env.NODE_ENV === "test" &&
    process.env.ENABLE_DEV_AUTH_BYPASS === "true";

  if (!enableTestBypass) return null;

  const fixture = await import("../tests/fixtures/dev-demo-users");
  const account = (fixture.DEV_DEMO_USERS as readonly DevDemoUser[]).find((item) =>
    item.aliases.some((alias) => alias.toLowerCase() === identifier.toLowerCase()),
  );

  if (!account || account.password !== password) {
    return null;
  }

  const username = account.aliases[0];
  return {
    id: account.id,
    username,
    fullName: account.fullName,
    email: username,
    role: account.role,
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

async function findUserForLogin(identifier: string) {
  try {
    const normalizedIdentifier = identifier.toLowerCase();
    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        sql`lower(${usersTable.username}) = ${normalizedIdentifier} or lower(coalesce(${usersTable.email}, '')) = ${normalizedIdentifier}`,
      );
    return user ?? null;
  } catch {
    const fallback = await db.execute(sql`
      select *
      from users
      where lower(username) = lower(${identifier})
         or lower(coalesce(email, '')) = lower(${identifier})
      limit 1
    `);
    const row = (fallback as any)?.rows?.[0] as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      id: Number(row.id),
      username: String(row.username ?? ""),
      passwordHash: String(row.password_hash ?? row.passwordHash ?? row.password ?? ""),
      fullName: String(row.full_name ?? row.fullName ?? row.username ?? "User"),
      email: (row.email as string | null | undefined) ?? null,
      role: String(row.role ?? "viewer"),
      isActive: Boolean(row.is_active ?? row.isActive ?? true),
      lastLogin: row.last_login ? new Date(String(row.last_login)) : null,
      createdAt: row.created_at ? new Date(String(row.created_at)) : new Date(),
    };
  }
}

router.post("/login", loginRateLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const normalizedUsername = String(username).trim();
  const normalizedPassword = String(password);

  const devUser = await tryDevAuthBypass(normalizedUsername, normalizedPassword);
  if (devUser) {
    (req.session as any).userId = devUser.id;
    (req.session as any).userRole = devUser.role;
    (req.session as any).userProfile = devUser;
    res.json({ user: devUser, token: "session" });
    return;
  }

  const user = await findUserForLogin(normalizedUsername);
  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const verification = verifyPassword(normalizedPassword, user.passwordHash);
  if (!verification.valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  try {
    const updateValues: { lastLogin: Date; passwordHash?: string } = { lastLogin: new Date() };
    if (verification.needsRehash && verification.newHash) {
      updateValues.passwordHash = verification.newHash;
    }
    await db.update(usersTable).set(updateValues).where(eq(usersTable.id, user.id));
  } catch {
    // Ignore last-login write failures for older schemas.
  }
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
  const sessionProfile = (req.session as any)?.userProfile;

  if (sessionProfile) {
    res.json(sessionProfile);
    return;
  }

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

  if (!isPasswordCompliant(newPassword)) {
    res.status(400).json({ error: getPasswordPolicyMessage() });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || !verifyPassword(currentPassword, user.passwordHash).valid) {
    res.status(400).json({ error: "Current password is incorrect" }); return;
  }
  await db.update(usersTable).set({ passwordHash: hashPassword(newPassword) }).where(eq(usersTable.id, userId));
  await logAction(req, "UPDATE", "user", userId, "Password changed");
  res.json({ success: true });
});

export default router;
