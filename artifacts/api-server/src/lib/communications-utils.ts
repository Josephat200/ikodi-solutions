export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const value = String(phone).trim().replace(/[\s()-]/g, "");
  if (!value) return null;
  if (value.startsWith("+")) return value;
  if (/^\d+$/.test(value)) {
    return value.startsWith("0") ? `+254${value.slice(1)}` : `+${value}`;
  }
  return value;
}

export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  return /^\+[1-9]\d{7,14}$/.test(phone);
}
