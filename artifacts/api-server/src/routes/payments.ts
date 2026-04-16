import { Router } from "express";
import { db, paymentsTable, studentsTable, sponsorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isSponsorPortal, requireAuth, requirePaymentsWriteAccess, resolveSessionSponsorId } from "../lib/auth";
import { logAction } from "../lib/audit";
import { devState, getDevStudent, getDevSponsor } from "../lib/dev-store";

const router = Router();

const fmt = (p: typeof paymentsTable.$inferSelect, studentName?: string | null, sponsorName?: string | null) => ({
  id: p.id, sponsorshipId: p.sponsorshipId, sponsorId: p.sponsorId, studentId: p.studentId,
  studentName: studentName ?? null, sponsorName: sponsorName ?? null,
  amount: Number(p.amount), paymentDate: p.paymentDate, paymentMethod: p.paymentMethod,
  referenceNumber: p.referenceNumber, purpose: p.purpose, term: p.term, notes: p.notes,
  createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
});

const fmtDev = (p: (typeof devState.payments)[number]) => ({
  id: p.id,
  sponsorshipId: p.sponsorshipId,
  sponsorId: p.sponsorId,
  studentId: p.studentId,
  studentName: p.studentId ? `${getDevStudent(p.studentId)?.firstName ?? ""} ${getDevStudent(p.studentId)?.lastName ?? ""}`.trim() || null : null,
  sponsorName: p.sponsorId ? getDevSponsor(p.sponsorId)?.name ?? null : null,
  amount: Number(p.amount),
  paymentDate: p.paymentDate,
  paymentMethod: p.paymentMethod,
  referenceNumber: p.referenceNumber,
  purpose: p.purpose,
  term: p.term,
  notes: p.notes,
  createdAt: p.createdAt,
});

router.get("/", requireAuth, async (req, res) => {
  const { sponsorId, studentId, sponsorshipId, method, term } = req.query;
  try {
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
    if (isSponsorPortal(req)) {
      const sponsorIdFromSession = await resolveSessionSponsorId(req);
      filtered = sponsorIdFromSession
        ? filtered.filter((r) => r.p.sponsorId === sponsorIdFromSession)
        : [];
    }
    res.json(filtered.map(({ p, student, sponsor }) =>
      fmt(p, student ? `${student.firstName} ${student.lastName}` : null, sponsor?.name ?? null)
    ));
  } catch {
    let filtered = devState.payments;
    if (sponsorId) filtered = filtered.filter((payment) => payment.sponsorId === parseInt(sponsorId as string));
    if (studentId) filtered = filtered.filter((payment) => payment.studentId === parseInt(studentId as string));
    if (sponsorshipId) filtered = filtered.filter((payment) => payment.sponsorshipId === parseInt(sponsorshipId as string));
    if (method) filtered = filtered.filter((payment) => payment.paymentMethod === method);
    if (term) filtered = filtered.filter((payment) => payment.term === term);
    if (isSponsorPortal(req)) {
      const sponsorIdFromSession = await resolveSessionSponsorId(req);
      filtered = sponsorIdFromSession ? filtered.filter((payment) => payment.sponsorId === sponsorIdFromSession) : [];
    }
    res.json(filtered.map(fmtDev));
  }
});

router.post("/", requirePaymentsWriteAccess, async (req, res) => {
  const { sponsorshipId, sponsorId, studentId, amount, paymentDate, paymentMethod, referenceNumber, purpose, term, notes } = req.body;
  if (!amount || !paymentDate || !paymentMethod) {
    res.status(400).json({ error: "amount, paymentDate, paymentMethod required" }); return;
  }
  try {
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
  } catch {
    const payment = {
      id: devState.nextPaymentId++,
      sponsorshipId: sponsorshipId ? parseInt(sponsorshipId) : null,
      sponsorId: sponsorId ? parseInt(sponsorId) : null,
      studentId: studentId ? parseInt(studentId) : null,
      amount: String(amount),
      paymentDate,
      paymentMethod,
      referenceNumber: referenceNumber || null,
      purpose: purpose || null,
      term: term || null,
      notes: notes || null,
      createdAt: new Date().toISOString(),
    } as const;
    devState.payments.unshift(payment as any);
    if (studentId) {
      const student = devState.students.find((item) => item.id === parseInt(studentId));
      if (student) {
        const newPaid = Number(student.paidAmount || 0) + Number(amount);
        student.paidAmount = String(newPaid);
      }
    }
    res.status(201).json(fmtDev(payment as any));
  }
});

router.put("/:id", requirePaymentsWriteAccess, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const { sponsorshipId, sponsorId, studentId, amount, paymentDate, paymentMethod, referenceNumber, purpose, term, notes } = req.body;

  try {
    const [existingPayment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id));
    if (!existingPayment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const nextStudentId = studentId !== undefined
      ? (studentId ? parseInt(studentId) : null)
      : existingPayment.studentId;
    const nextAmount = amount !== undefined ? Number(amount) : Number(existingPayment.amount);

    const [payment] = await db.update(paymentsTable).set({
      sponsorshipId: sponsorshipId !== undefined ? (sponsorshipId ? parseInt(sponsorshipId) : null) : undefined,
      sponsorId: sponsorId !== undefined ? (sponsorId ? parseInt(sponsorId) : null) : undefined,
      studentId: nextStudentId,
      amount: amount !== undefined ? String(amount) : undefined,
      paymentDate: paymentDate || undefined,
      paymentMethod: paymentMethod || undefined,
      referenceNumber: referenceNumber !== undefined ? (referenceNumber || null) : undefined,
      purpose: purpose !== undefined ? (purpose || null) : undefined,
      term: term !== undefined ? (term || null) : undefined,
      notes: notes !== undefined ? (notes || null) : undefined,
      updatedAt: new Date(),
    }).where(eq(paymentsTable.id, id)).returning();

    const previousAmount = Number(existingPayment.amount);

    if (existingPayment.studentId && existingPayment.studentId !== nextStudentId) {
      const [oldStudent] = await db.select().from(studentsTable).where(eq(studentsTable.id, existingPayment.studentId));
      if (oldStudent) {
        const oldPaid = Number(oldStudent.paidAmount || 0) - previousAmount;
        await db.update(studentsTable).set({ paidAmount: String(Math.max(0, oldPaid)), updatedAt: new Date() }).where(eq(studentsTable.id, existingPayment.studentId));
      }
    }

    if (nextStudentId) {
      const [newStudent] = await db.select().from(studentsTable).where(eq(studentsTable.id, nextStudentId));
      if (newStudent) {
        let adjustedPaid = Number(newStudent.paidAmount || 0);
        if (existingPayment.studentId === nextStudentId) {
          adjustedPaid = adjustedPaid - previousAmount + nextAmount;
        } else {
          adjustedPaid = adjustedPaid + nextAmount;
        }
        await db.update(studentsTable).set({ paidAmount: String(Math.max(0, adjustedPaid)), updatedAt: new Date() }).where(eq(studentsTable.id, nextStudentId));
      }
    }

    let studentName: string | null = null;
    let sponsorName: string | null = null;
    if (payment.studentId) {
      const [s] = await db.select().from(studentsTable).where(eq(studentsTable.id, payment.studentId));
      if (s) studentName = `${s.firstName} ${s.lastName}`;
    }
    if (payment.sponsorId) {
      const [sp] = await db.select().from(sponsorsTable).where(eq(sponsorsTable.id, payment.sponsorId));
      if (sp) sponsorName = sp.name;
    }

    await logAction(req, "UPDATE_PAYMENT", "payment", id, `Updated payment ${id}`);
    res.json(fmt(payment, studentName, sponsorName));
  } catch {
    const payment = devState.payments.find((item) => item.id === id);
    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const previousAmount = Number(payment.amount);
    const previousStudentId = payment.studentId;

    payment.sponsorshipId = sponsorshipId !== undefined ? (sponsorshipId ? parseInt(sponsorshipId) : null) : payment.sponsorshipId;
    payment.sponsorId = sponsorId !== undefined ? (sponsorId ? parseInt(sponsorId) : null) : payment.sponsorId;
    payment.studentId = studentId !== undefined ? (studentId ? parseInt(studentId) : null) : payment.studentId;
    payment.amount = amount !== undefined ? String(amount) : payment.amount;
    payment.paymentDate = paymentDate || payment.paymentDate;
    payment.paymentMethod = paymentMethod || payment.paymentMethod;
    payment.referenceNumber = referenceNumber !== undefined ? (referenceNumber || null) : payment.referenceNumber;
    payment.purpose = purpose !== undefined ? (purpose || null) : payment.purpose;
    payment.term = term !== undefined ? (term || null) : payment.term;
    payment.notes = notes !== undefined ? (notes || null) : payment.notes;

    const nextAmount = Number(payment.amount);
    const nextStudentId = payment.studentId;

    if (previousStudentId && previousStudentId !== nextStudentId) {
      const oldStudent = devState.students.find((item) => item.id === previousStudentId);
      if (oldStudent) {
        oldStudent.paidAmount = String(Math.max(0, Number(oldStudent.paidAmount || 0) - previousAmount));
      }
    }

    if (nextStudentId) {
      const newStudent = devState.students.find((item) => item.id === nextStudentId);
      if (newStudent) {
        let adjusted = Number(newStudent.paidAmount || 0);
        if (previousStudentId === nextStudentId) {
          adjusted = adjusted - previousAmount + nextAmount;
        } else {
          adjusted = adjusted + nextAmount;
        }
        newStudent.paidAmount = String(Math.max(0, adjusted));
      }
    }

    res.json(fmtDev(payment));
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const [row] = await db.select({ p: paymentsTable, student: studentsTable, sponsor: sponsorsTable })
    .from(paymentsTable)
    .leftJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id))
    .leftJoin(sponsorsTable, eq(paymentsTable.sponsorId, sponsorsTable.id))
    .where(eq(paymentsTable.id, id));
  if (!row) { res.status(404).json({ error: "Payment not found" }); return; }
  if (isSponsorPortal(req)) {
    const sponsorIdFromSession = await resolveSessionSponsorId(req);
    if (!sponsorIdFromSession || row.p.sponsorId !== sponsorIdFromSession) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  res.json(fmt(row.p, row.student ? `${row.student.firstName} ${row.student.lastName}` : null, row.sponsor?.name ?? null));
});

router.delete("/:id", requirePaymentsWriteAccess, async (req, res) => {
  const id = parseInt(req.params.id as string);
  try {
    await db.delete(paymentsTable).where(eq(paymentsTable.id, id));
    await logAction(req, "DELETE_PAYMENT", "payment", id, `Deleted payment ${id}`);
    res.status(204).send();
  } catch {
    const index = devState.payments.findIndex((payment) => payment.id === id);
    if (index >= 0) {
      devState.payments.splice(index, 1);
      res.status(204).send();
      return;
    }
    res.status(404).json({ error: "Payment not found" });
  }
});

export default router;
