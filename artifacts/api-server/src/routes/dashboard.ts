import { Router } from "express";
import { db, studentsTable, sponsorsTable, sponsorshipsTable, paymentsTable, auditLogsTable, usersTable, schoolsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { isSponsorPortal, requireAuth, resolveSessionSponsorId } from "../lib/auth";

const router = Router();

router.get("/summary", requireAuth, async (req, res) => {
  if (isSponsorPortal(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const students = await db.select().from(studentsTable);
  const sponsors = await db.select().from(sponsorsTable);
  let payments = await db.select().from(paymentsTable);

  let scopedStudents = students;
  let scopedSponsors = sponsors;
  if (isSponsorPortal(req)) {
    const sponsorId = await resolveSessionSponsorId(req);
    if (sponsorId) {
      const links = await db.select().from(sponsorshipsTable).where(eq(sponsorshipsTable.sponsorId, sponsorId));
      const studentIds = new Set(links.map((l) => l.studentId));
      scopedStudents = students.filter((s) => studentIds.has(s.id));
      scopedSponsors = sponsors.filter((s) => s.id === sponsorId);
      payments = payments.filter((p) => p.sponsorId === sponsorId);
    } else {
      scopedStudents = [];
      scopedSponsors = [];
      payments = [];
    }
  }

  const totalStudents = scopedStudents.length;
  const activeStudents = scopedStudents.filter(s => s.status === "active").length;
  const totalSponsors = scopedSponsors.length;
  const activeSponsors = scopedSponsors.filter(s => s.status === "active").length;
  const totalFundsReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const fullySponsored = scopedStudents.filter(s => s.sponsorshipStatus === "sponsored").length;
  const partiallySponsored = scopedStudents.filter(s => s.sponsorshipStatus === "partial").length;
  const unsponsored = scopedStudents.filter(s => s.sponsorshipStatus === "unsponsored").length;
  const pendingFees = scopedStudents.reduce((sum, s) => {
    const fees = Number(s.totalFees || 0);
    const paid = Number(s.paidAmount || 0);
    return sum + Math.max(0, fees - paid);
  }, 0);
  const terms = [...new Set(scopedStudents.filter(s => s.currentTerm).map(s => s.currentTerm))];
  const currentTerm = terms.length > 0 ? terms[terms.length - 1] : null;

  res.json({
    totalStudents, activeStudents, totalSponsors, activeSponsors,
    totalFundsReceived, totalFundsSpent: totalFundsReceived, fundsAvailable: 0,
    pendingFees, fullySponsored, partiallySponsored, unsponsored, currentTerm,
  });
});

router.get("/recent-activity", requireAuth, async (req, res) => {
  if (isSponsorPortal(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const logs = await db.select({ log: auditLogsTable, user: usersTable })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .orderBy(desc(auditLogsTable.createdAt));
  const recent = logs.slice(0, 15);
  res.json(recent.map(({ log, user }) => ({
    id: log.id, type: log.action, description: log.details || log.action,
    entityType: log.entity, entityId: log.entityId,
    performedBy: user?.fullName ?? null,
    createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
  })));
});

router.get("/financial-overview", requireAuth, async (req, res) => {
  if (isSponsorPortal(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { term } = req.query;
  let payments = await db.select().from(paymentsTable);
  if (isSponsorPortal(req)) {
    const sponsorId = await resolveSessionSponsorId(req);
    payments = sponsorId ? payments.filter((p) => p.sponsorId === sponsorId) : [];
  }
  const filtered = term ? payments.filter(p => p.term === term) : payments;
  const totalReceived = filtered.reduce((sum, p) => sum + Number(p.amount), 0);
  const byMethod: Record<string, number> = {};
  for (const p of filtered) {
    byMethod[p.paymentMethod] = (byMethod[p.paymentMethod] || 0) + Number(p.amount);
  }
  const monthMap: Record<string, number> = {};
  for (const p of filtered) {
    const month = p.paymentDate ? p.paymentDate.slice(0, 7) : "unknown";
    monthMap[month] = (monthMap[month] || 0) + Number(p.amount);
  }
  res.json({
    term: term || null,
    totalReceived, totalExpenses: totalReceived, balance: 0,
    paymentsByMethod: Object.entries(byMethod).map(([method, total]) => ({ method, total })),
    monthlyTrend: Object.entries(monthMap).sort((a, b) => a[0].localeCompare(b[0])).map(([month, received]) => ({ month, received })),
  });
});

router.get("/sponsorship-stats", requireAuth, async (req, res) => {
  if (isSponsorPortal(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const students = await db.select().from(studentsTable);
  let allStudents = await db.select().from(studentsTable);
  let sponsorships = await db.select().from(sponsorshipsTable);
  const schools = await db.select().from(schoolsTable);

  if (isSponsorPortal(req)) {
    const sponsorId = await resolveSessionSponsorId(req);
    sponsorships = sponsorId ? sponsorships.filter((s) => s.sponsorId === sponsorId) : [];
    const studentIds = new Set(sponsorships.map((s) => s.studentId));
    allStudents = allStudents.filter((s) => studentIds.has(s.id));
  }

  const schoolRows = await db.query.studentsTable?.findMany?.() ?? [];

  const fullySponsored = allStudents.filter(s => s.sponsorshipStatus === "sponsored").length;
  const partiallySponsored = allStudents.filter(s => s.sponsorshipStatus === "partial").length;
  const unsponsored = allStudents.filter(s => s.sponsorshipStatus === "unsponsored").length;
  const activeSponsorships = sponsorships.filter(s => s.status === "active").length;
  const completedSponsorships = sponsorships.filter(s => s.status === "completed").length;

  res.json({
    fullySponsored, partiallySponsored, unsponsored,
    activeSponsorships, completedSponsorships, schoolBreakdown: [],
  });
});

export default router;
