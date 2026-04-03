import { Router } from "express";
import { db, sponsorshipsTable, studentsTable, sponsorsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logAction } from "../lib/audit";

const router = Router();

const fmt = (sp: typeof sponsorshipsTable.$inferSelect, studentName?: string | null, sponsorName?: string | null) => ({
  id: sp.id, studentId: sp.studentId, sponsorId: sp.sponsorId,
  studentName: studentName ?? null, sponsorName: sponsorName ?? null,
  coverageType: sp.coverageType, amount: Number(sp.amount),
  startDate: sp.startDate, endDate: sp.endDate, status: sp.status,
  term: sp.term, notes: sp.notes,
  createdAt: sp.createdAt instanceof Date ? sp.createdAt.toISOString() : sp.createdAt,
});

router.get("/", requireAuth, async (req, res) => {
  const { studentId, sponsorId, status, term } = req.query;
  const rows = await db.select({ sp: sponsorshipsTable, student: studentsTable, sponsor: sponsorsTable })
    .from(sponsorshipsTable)
    .leftJoin(studentsTable, eq(sponsorshipsTable.studentId, studentsTable.id))
    .leftJoin(sponsorsTable, eq(sponsorshipsTable.sponsorId, sponsorsTable.id));
  let filtered = rows;
  if (studentId) filtered = filtered.filter(r => r.sp.studentId === parseInt(studentId as string));
  if (sponsorId) filtered = filtered.filter(r => r.sp.sponsorId === parseInt(sponsorId as string));
  if (status) filtered = filtered.filter(r => r.sp.status === status);
  if (term) filtered = filtered.filter(r => r.sp.term === term);
  res.json(filtered.map(({ sp, student, sponsor }) =>
    fmt(sp, student ? `${student.firstName} ${student.lastName}` : null, sponsor?.name ?? null)
  ));
});

router.post("/", requireAuth, async (req, res) => {
  const { studentId, sponsorId, coverageType, amount, startDate, endDate, term, notes, status } = req.body;
  if (!studentId || !sponsorId || !coverageType || !amount || !startDate) {
    res.status(400).json({ error: "studentId, sponsorId, coverageType, amount, startDate required" }); return;
  }
  const [sp] = await db.insert(sponsorshipsTable).values({
    studentId: parseInt(studentId), sponsorId: parseInt(sponsorId),
    coverageType, amount: String(amount), startDate, endDate: endDate || null,
    status: status || "active", term: term || null, notes: notes || null,
  }).returning();
  const sponsorshipStatus = coverageType === "full" ? "sponsored" : "partial";
  await db.update(studentsTable).set({ sponsorshipStatus, updatedAt: new Date() }).where(eq(studentsTable.id, parseInt(studentId)));
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, sp.studentId));
  const [sponsor] = await db.select().from(sponsorsTable).where(eq(sponsorsTable.id, sp.sponsorId));
  await logAction(req, "CREATE_SPONSORSHIP", "sponsorship", sp.id, `Assigned sponsor ${sponsorId} to student ${studentId}`);
  res.status(201).json(fmt(sp, student ? `${student.firstName} ${student.lastName}` : null, sponsor?.name ?? null));
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [row] = await db.select({ sp: sponsorshipsTable, student: studentsTable, sponsor: sponsorsTable })
    .from(sponsorshipsTable)
    .leftJoin(studentsTable, eq(sponsorshipsTable.studentId, studentsTable.id))
    .leftJoin(sponsorsTable, eq(sponsorshipsTable.sponsorId, sponsorsTable.id))
    .where(eq(sponsorshipsTable.id, id));
  if (!row) { res.status(404).json({ error: "Sponsorship not found" }); return; }
  res.json(fmt(row.sp, row.student ? `${row.student.firstName} ${row.student.lastName}` : null, row.sponsor?.name ?? null));
});

router.put("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const { coverageType, amount, startDate, endDate, status, notes } = req.body;
  const [sp] = await db.update(sponsorshipsTable).set({
    coverageType: coverageType || undefined, amount: amount ? String(amount) : undefined,
    startDate: startDate || undefined, endDate: endDate !== undefined ? (endDate || null) : undefined,
    status: status || undefined, notes: notes !== undefined ? notes : undefined, updatedAt: new Date(),
  }).where(eq(sponsorshipsTable.id, id)).returning();
  if (!sp) { res.status(404).json({ error: "Sponsorship not found" }); return; }
  if (status === "completed" || status === "inactive") {
    const activeSps = await db.select().from(sponsorshipsTable)
      .where(and(eq(sponsorshipsTable.studentId, sp.studentId), eq(sponsorshipsTable.status, "active")));
    if (activeSps.length === 0) {
      await db.update(studentsTable).set({ sponsorshipStatus: "unsponsored", updatedAt: new Date() }).where(eq(studentsTable.id, sp.studentId));
    }
  }
  await logAction(req, "UPDATE_SPONSORSHIP", "sponsorship", id, `Updated sponsorship ${id}`);
  res.json(fmt(sp));
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(sponsorshipsTable).where(eq(sponsorshipsTable.id, id));
  await logAction(req, "DELETE_SPONSORSHIP", "sponsorship", id, `Deleted sponsorship ${id}`);
  res.status(204).send();
});

export default router;
