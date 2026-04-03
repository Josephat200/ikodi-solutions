import { Router } from "express";
import { db, paymentsTable, studentsTable, sponsorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logAction } from "../lib/audit";

const router = Router();

const fmt = (p: typeof paymentsTable.$inferSelect, studentName?: string | null, sponsorName?: string | null) => ({
  id: p.id, sponsorshipId: p.sponsorshipId, sponsorId: p.sponsorId, studentId: p.studentId,
  studentName: studentName ?? null, sponsorName: sponsorName ?? null,
  amount: Number(p.amount), paymentDate: p.paymentDate, paymentMethod: p.paymentMethod,
  referenceNumber: p.referenceNumber, purpose: p.purpose, term: p.term, notes: p.notes,
  createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
});

router.get("/", requireAuth, async (req, res) => {
  const { sponsorId, studentId, sponsorshipId, method, term } = req.query;
  const rows = await db.select({ p: paymentsTable, student: studentsTable, sponsor: sponsorsTable })
    .from(paymentsTable)
    .leftJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id))
    .leftJoin(sponsorsTable, eq(paymentsTable.sponsorId, sponsorsTable.id));
  let filtered = rows;
  if (sponsorId) filtered = filtered.filter(r => r.p.sponsorId === parseInt(sponsorId as string));
  if (studentId) filtered = filtered.filter(r => r.p.studentId === parseInt(studentId as string));
  if (sponsorshipId) filtered = filtered.filter(r => r.p.sponsorshipId === parseInt(sponsorshipId as string));
  if (method) filtered = filtered.filter(r => r.p.paymentMethod === method);
  if (term) filtered = filtered.filter(r => r.p.term === term);
  res.json(filtered.map(({ p, student, sponsor }) =>
    fmt(p, student ? `${student.firstName} ${student.lastName}` : null, sponsor?.name ?? null)
  ));
});

router.post("/", requireAuth, async (req, res) => {
  const { sponsorshipId, sponsorId, studentId, amount, paymentDate, paymentMethod, referenceNumber, purpose, term, notes } = req.body;
  if (!amount || !paymentDate || !paymentMethod) {
    res.status(400).json({ error: "amount, paymentDate, paymentMethod required" }); return;
  }
  const [payment] = await db.insert(paymentsTable).values({
    sponsorshipId: sponsorshipId ? parseInt(sponsorshipId) : null,
    sponsorId: sponsorId ? parseInt(sponsorId) : null,
    studentId: studentId ? parseInt(studentId) : null,
    amount: String(amount), paymentDate, paymentMethod,
    referenceNumber: referenceNumber || null, purpose: purpose || null,
    term: term || null, notes: notes || null,
  }).returning();
  if (studentId) {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, parseInt(studentId)));
    if (student) {
      const newPaid = Number(student.paidAmount || 0) + Number(amount);
      await db.update(studentsTable).set({ paidAmount: String(newPaid), updatedAt: new Date() }).where(eq(studentsTable.id, parseInt(studentId)));
    }
  }
  let studentName: string | null = null;
  let sponsorName: string | null = null;
  if (studentId) {
    const [s] = await db.select().from(studentsTable).where(eq(studentsTable.id, parseInt(studentId)));
    if (s) studentName = `${s.firstName} ${s.lastName}`;
  }
  if (sponsorId) {
    const [sp] = await db.select().from(sponsorsTable).where(eq(sponsorsTable.id, parseInt(sponsorId)));
    if (sp) sponsorName = sp.name;
  }
  await logAction(req, "CREATE_PAYMENT", "payment", payment.id, `Recorded payment of ${amount} for student ${studentId}`);
  res.status(201).json(fmt(payment, studentName, sponsorName));
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [row] = await db.select({ p: paymentsTable, student: studentsTable, sponsor: sponsorsTable })
    .from(paymentsTable)
    .leftJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id))
    .leftJoin(sponsorsTable, eq(paymentsTable.sponsorId, sponsorsTable.id))
    .where(eq(paymentsTable.id, id));
  if (!row) { res.status(404).json({ error: "Payment not found" }); return; }
  res.json(fmt(row.p, row.student ? `${row.student.firstName} ${row.student.lastName}` : null, row.sponsor?.name ?? null));
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(paymentsTable).where(eq(paymentsTable.id, id));
  await logAction(req, "DELETE_PAYMENT", "payment", id, `Deleted payment ${id}`);
  res.status(204).send();
});

export default router;
