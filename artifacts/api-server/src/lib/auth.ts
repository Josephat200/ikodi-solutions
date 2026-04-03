import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + process.env.SESSION_SECRET || "ikodi-secret-2026").digest("hex");
}

export function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
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
  if (!req.session || !(req.session as any).userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const role = (req.session as any).userRole;
  if (role !== "admin" && role !== "super_admin") {
    res.status(403).json({ error: "Forbidden: Admin access required" });
    return;
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session || !(req.session as any).userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const role = (req.session as any).userRole;
  if (role !== "super_admin") {
    res.status(403).json({ error: "Forbidden: Super Admin access required" });
    return;
  }
  next();
}
