import crypto from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? "12");
const PASSWORD_MIN_LENGTH = 12;

export type PasswordVerificationResult = {
  valid: boolean;
  needsRehash: boolean;
  newHash?: string;
};

function getLegacySalts(): string[] {
  const salts = [process.env.SESSION_SECRET, "ikodi-secret-2026"].filter(
    (value): value is string => Boolean(value && value.trim().length > 0),
  );
  return [...new Set(salts)];
}

function isBcryptHash(hash: string): boolean {
  return /^\$2[abxy]?\$\d{2}\$/.test(hash);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, storedHash: string): PasswordVerificationResult {
  if (isBcryptHash(storedHash)) {
    return {
      valid: bcrypt.compareSync(password, storedHash),
      needsRehash: false,
    };
  }

  const matchesLegacy = getLegacySalts().some((salt) => {
    const legacyHash = crypto
      .createHash("sha256")
      .update(password + salt)
      .digest("hex");
    return legacyHash === storedHash;
  });

  if (!matchesLegacy) {
    return { valid: false, needsRehash: false };
  }

  return {
    valid: true,
    needsRehash: true,
    newHash: hashPassword(password),
  };
}

export function isPasswordCompliant(password: string): boolean {
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

export function getPasswordPolicyMessage(): string {
  return "Password must be at least 12 characters and include uppercase, lowercase, number, and symbol.";
}