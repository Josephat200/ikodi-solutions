import { Router } from "express";
import { db, studentsTable, sponsorsTable, paymentsTable, schoolsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/students", requireAuth, async (req, res) => {
  const { term, schoolCategory } = req.query;
  const rows = await db.select({ s: studentsTable, school: schoolsTable })
    .from(studentsTable)
    .leftJoin(schoolsTable, eq(studentsTable.schoolId, schoolsTable.id));
  let filtered = rows;
  if (term) filtered = filtered.filter(r => r.s.currentTerm === term);
  if (schoolCategory) filtered = filtered.filter(r => r.school?.category === schoolCategory);
  const byCategory: Record<string, number> = {};
  for (const { school } of filtered) {
    const cat = school?.category || "unknown";
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }
  res.json({
    term: term || null,
    totalStudents: filtered.length,
    bySchoolCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
    students: filtered.map(({ s, school }) => ({
      id: s.id, admissionNumber: s.admissionNumber, firstName: s.firstName, lastName: s.lastName,
      dateOfBirth: s.dateOfBirth, gender: s.gender, phone: s.phone, email: s.email,
      schoolId: s.schoolId, schoolName: school?.name ?? null, schoolCategory: school?.category ?? null,
      course: s.course, currentLevel: s.currentLevel, status: s.status,
      sponsorshipStatus: s.sponsorshipStatus,
      totalFees: s.totalFees ? Number(s.totalFees) : null,
      paidAmount: s.paidAmount ? Number(s.paidAmount) : 0,
      balance: s.totalFees ? Number(s.totalFees) - Number(s.paidAmount || 0) : null,
      currentTerm: s.currentTerm,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
    })),
  });
});

router.get("/payments", requireAuth, async (req, res) => {
  const { term, sponsorId } = req.query;
  const rows = await db.select({ p: paymentsTable, student: studentsTable, sponsor: sponsorsTable })
    .from(paymentsTable)
    .leftJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id))
    .leftJoin(sponsorsTable, eq(paymentsTable.sponsorId, sponsorsTable.id));
  let filtered = rows;
  if (term) filtered = filtered.filter(r => r.p.term === term);
  if (sponsorId) filtered = filtered.filter(r => r.p.sponsorId === parseInt(sponsorId as string));
  const totalAmount = filtered.reduce((sum, r) => sum + Number(r.p.amount), 0);
  res.json({
    term: term || null,
    totalAmount, totalPayments: filtered.length,
    payments: filtered.map(({ p, student, sponsor }) => ({
      id: p.id, sponsorshipId: p.sponsorshipId, sponsorId: p.sponsorId, studentId: p.studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : null,
      sponsorName: sponsor?.name ?? null,
      amount: Number(p.amount), paymentDate: p.paymentDate, paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber, purpose: p.purpose, term: p.term, notes: p.notes,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    })),
  });
});

router.get("/sponsor-contributions", requireAuth, async (req, res) => {
  const { term } = req.query;
  const sponsors = await db.select().from(sponsorsTable);
  const result = await Promise.all(sponsors.map(async sponsor => {
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.sponsorId, sponsor.id));
    const filtered = term ? payments.filter(p => p.term === term) : payments;
    const totalContributed = filtered.reduce((sum, p) => sum + Number(p.amount), 0);
    const studentIds = [...new Set(filtered.filter(p => p.studentId).map(p => p.studentId!))];
    return {
      sponsorId: sponsor.id, sponsorName: sponsor.name,
      totalContributed, paymentCount: filtered.length, studentsSponsored: studentIds.length,
    };
  }));
  res.json(result.filter(r => r.totalContributed > 0 || r.paymentCount > 0));
});

export default router;
