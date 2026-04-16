import { Request, Response, NextFunction } from "express";
import { db, sponsorsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isPasswordCompliant } from "./password";
export {
  getPasswordPolicyMessage,
  hashPassword,
  isPasswordCompliant,
  verifyPassword,
} from "./password";

export type AppRole =
  | "admin"
  | "program_officer"
  | "finance_officer"
  | "sponsor_portal"
  | "viewer";

const LEGACY_ROLE_MAP: Record<string, AppRole> = {
  super_admin: "admin",
  secretary: "program_officer",
};

export function normalizeRole(role: string | null | undefined): AppRole | undefined {
  if (!role) return undefined;
  if (role in LEGACY_ROLE_MAP) return LEGACY_ROLE_MAP[role];
  if (
    role === "admin" ||
    role === "program_officer" ||
    role === "finance_officer" ||
    role === "sponsor_portal" ||
    role === "viewer"
  ) {
    return role;
  }
  return undefined;
}

export function getSessionRole(req: Request): AppRole | undefined {
  return normalizeRole((req.session as any)?.userRole);
}

export function isSponsorPortal(req: Request): boolean {
  return getSessionRole(req) === "sponsor_portal";
}

function requireRoles(allowedRoles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session || !(req.session as any).userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const role = getSessionRole(req);
    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  if (!isPasswordCompliant(password)) {
    return generatePassword();
  }

  return password;
}

export function generateUsername(fullName: string): string {
  const parts = fullName.toLowerCase().split(" ");
  const base = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1] : parts[0];
  const num = Math.floor(Math.random() * 900) + 100;
  return base + num;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session || !(req.session as any).userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRoles(["admin"])(req, res, next);
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session || !(req.session as any).userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const role = (req.session as any).userRole;
  if (role !== "super_admin" && normalizeRole(role) !== "admin") {
    res.status(403).json({ error: "Forbidden: Super Admin access required" });
    return;
  }
  next();
}

export const requireStudentWriteAccess = requireRoles(["admin", "program_officer"]);
export const requireSponsorshipManagementAccess = requireRoles(["admin"]);
export const requirePaymentsWriteAccess = requireRoles(["admin", "finance_officer"]);
export const requireUserManagementAccess = requireRoles(["admin"]);
export const requireCommunicationsWriteAccess = requireRoles(["admin"]);

export async function resolveSessionSponsorId(req: Request): Promise<number | null> {
  if (!isSponsorPortal(req)) return null;

  const userId = (req.session as any)?.userId as number | undefined;
  if (!userId) return null;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return null;

  const sponsors = await db.select().from(sponsorsTable);
  const emailLower = (user.email || "").toLowerCase();
  const usernameLower = user.username.toLowerCase();

  const matched = sponsors.find((s) => {
    const sponsorEmail = (s.email || "").toLowerCase();
    return sponsorEmail !== "" && (sponsorEmail === emailLower || sponsorEmail === usernameLower);
  });

  return matched?.id ?? null;
}
