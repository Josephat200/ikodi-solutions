import { Router } from "express";
import { db, studentsTable, sponsorsTable, sponsorshipsTable, paymentsTable, auditLogsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/summary", requireAuth, async (req, res) => {
  const students = await db.select().from(studentsTable);
  const sponsors = await db.select().from(sponsorsTable);
  const payments = await db.select().from(paymentsTable);

  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === "active").length;
  const totalSponsors = sponsors.length;
  const activeSponsors = sponsors.filter(s => s.status === "active").length;
  const totalFundsReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const fullySponsored = students.filter(s => s.sponsorshipStatus === "sponsored").length;
  const partiallySponsored = students.filter(s => s.sponsorshipStatus === "partial").length;
  const unsponsored = students.filter(s => s.sponsorshipStatus === "unsponsored").length;
  const pendingFees = students.reduce((sum, s) => {
    const fees = Number(s.totalFees || 0);
    const paid = Number(s.paidAmount || 0);
    return sum + Math.max(0, fees - paid);
  }, 0);
  const terms = [...new Set(students.filter(s => s.currentTerm).map(s => s.currentTerm))];
  const currentTerm = terms.length > 0 ? terms[terms.length - 1] : null;

  res.json({
    totalStudents, activeStudents, totalSponsors, activeSponsors,
    totalFundsReceived, totalFundsSpent: totalFundsReceived, fundsAvailable: 0,
    pendingFees, fullySponsored, partiallySponsored, unsponsored, currentTerm,
  });
});

router.get("/recent-activity", requireAuth, async (req, res) => {
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
  const { term } = req.query;
  const payments = await db.select().from(paymentsTable);
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
  const students = await db.select({ s: studentsTable, school: db.$with("school") }).from(studentsTable);
  const allStudents = await db.select().from(studentsTable);
  const sponsorships = await db.select().from(sponsorshipsTable);
  const schools = await db.select().from(sponsorshipsTable);

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
