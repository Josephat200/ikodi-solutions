import { User } from "@workspace/api-client-react";

export type NormalizedRole =
  | "admin"
  | "program_officer"
  | "finance_officer"
  | "sponsor_portal"
  | "viewer";

const LEGACY_ROLE_MAP: Record<string, NormalizedRole> = {
  super_admin: "admin",
  secretary: "program_officer",
};

const DEFAULT_ROLE: NormalizedRole = "viewer";

const ALLOWED_PATHS_BY_ROLE: Record<NormalizedRole, string[]> = {
  admin: [
    "/",
    "/students",
    "/students/:id",
    "/sponsors",
    "/sponsors/:id",
    "/sponsorships",
    "/payments",
    "/schools",
    "/communications",
    "/reports",
    "/audit-logs",
    "/users",
    "/settings",
  ],
  program_officer: ["/students", "/students/:id", "/sponsorships", "/payments", "/settings"],
  finance_officer: ["/payments", "/sponsorships", "/reports", "/settings"],
  sponsor_portal: ["/students", "/students/:id", "/payments", "/settings"],
  viewer: [
    "/",
    "/students",
    "/students/:id",
    "/sponsors",
    "/sponsors/:id",
    "/sponsorships",
    "/payments",
    "/schools",
    "/communications",
    "/reports",
    "/settings",
  ],
};

const DEFAULT_PATH_BY_ROLE: Record<NormalizedRole, string> = {
  admin: "/",
  program_officer: "/students",
  finance_officer: "/payments",
  sponsor_portal: "/students",
  viewer: "/",
};

export function normalizeRole(role: string | null | undefined): NormalizedRole {
  if (!role) return DEFAULT_ROLE;
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
  return DEFAULT_ROLE;
}

function patternToRegExp(pattern: string): RegExp {
  if (pattern === "/") return /^\/$/;
  const source = pattern
    .split("/")
    .map((part) => (part.startsWith(":") ? "[^/]+" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");

  return new RegExp(`^${source}$`);
}

export function canAccessPath(role: string | null | undefined, path: string): boolean {
  const normalized = normalizeRole(role);
  const patterns = ALLOWED_PATHS_BY_ROLE[normalized] ?? ALLOWED_PATHS_BY_ROLE[DEFAULT_ROLE];
  return patterns.some((pattern) => patternToRegExp(pattern).test(path));
}

export function getDefaultPathForRole(role: string | null | undefined): string {
  const normalized = normalizeRole(role);
  return DEFAULT_PATH_BY_ROLE[normalized] ?? DEFAULT_PATH_BY_ROLE[DEFAULT_ROLE];
}

export function canManageStudents(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "program_officer";
}

export function canManageSponsorships(role: string | null | undefined): boolean {
  return normalizeRole(role) === "admin";
}

export function canManageSponsors(role: string | null | undefined): boolean {
  return normalizeRole(role) === "admin";
}

export function canManageSchools(role: string | null | undefined): boolean {
  return normalizeRole(role) === "admin";
}

export function canWritePayments(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "finance_officer";
}

export function canSendCommunications(role: string | null | undefined): boolean {
  return normalizeRole(role) === "admin";
}

export function getRoleNavigation(role: string | null | undefined): string[] {
  const normalized = normalizeRole(role);
  return ALLOWED_PATHS_BY_ROLE[normalized] ?? ALLOWED_PATHS_BY_ROLE[DEFAULT_ROLE];
}

export function getNormalizedRoleFromUser(user: User | null): NormalizedRole {
  return normalizeRole(user?.role);
}