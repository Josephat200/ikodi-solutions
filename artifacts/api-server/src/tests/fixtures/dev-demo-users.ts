export const DEV_DEMO_USERS = [
  {
    aliases: ["admin", "admin@ikodi.local", "system.administrator@ikodi.local"],
    fullName: "System Administrator",
    role: "admin" as const,
    id: 1,
    password: "Admin@123456",
  },
  {
    aliases: ["program.officer@ikodi.local", "program.officer1@ikodi.local"],
    fullName: "Program Officer",
    role: "program_officer" as const,
    id: 2,
    password: "Program@123456",
  },
  {
    aliases: ["finance.officer@ikodi.local", "finance.officer2@ikodi.local"],
    fullName: "Finance Officer",
    role: "finance_officer" as const,
    id: 3,
    password: "Finance@123456",
  },
  {
    aliases: ["viewer@ikodi.local", "read.only3@ikodi.local"],
    fullName: "Read Only Viewer",
    role: "viewer" as const,
    id: 4,
    password: "Viewer@123456",
  },
  {
    aliases: ["sponsorships@krcs.org", "sponsor.portal4@ikodi.local"],
    fullName: "Sponsor Portal User",
    role: "sponsor_portal" as const,
    id: 5,
    password: "Sponsor@123456",
  },
] as const;