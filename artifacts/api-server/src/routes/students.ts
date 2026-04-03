import { Router } from "express";
import { db, studentsTable, schoolsTable, guardiansTable, academicRecordsTable, sponsorshipsTable, paymentsTable, sponsorsTable } from "@workspace/db";
import { eq, ilike, and, or, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logAction } from "../lib/audit";

const router = Router();

let admCounter = 1000;
function genAdmission(): string {
  admCounter++;
  return `IK-${new Date().getFullYear()}-${String(admCounter).padStart(4, "0")}`;
}

const fmtStudent = (s: any, school?: any) => ({
  id: s.id,
  admissionNumber: s.admissionNumber,
  firstName: s.firstName,
  lastName: s.lastName,
  dateOfBirth: s.dateOfBirth ?? null,
  gender: s.gender ?? null,
  phone: s.phone ?? null,
  email: s.email ?? null,
  schoolId: s.schoolId ?? null,
  schoolName: school?.name ?? null,
  schoolCategory: school?.category ?? null,
  course: s.course ?? null,
  currentLevel: s.currentLevel ?? null,
  status: s.status,
  sponsorshipStatus: s.sponsorshipStatus,
  totalFees: s.totalFees ? Number(s.totalFees) : null,
  paidAmount: s.paidAmount ? Number(s.paidAmount) : 0,
  balance: s.totalFees && s.paidAmount ? Number(s.totalFees) - Number(s.paidAmount) : s.totalFees ? Number(s.totalFees) : null,
  currentTerm: s.currentTerm ?? null,
  createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
});

router.get("/", requireAuth, async (req, res) => {
  const { search, schoolId, status, sponsorshipStatus, term } = req.query;
  const students = await db.select({ s: studentsTable, school: schoolsTable }).from(studentsTable)
    .leftJoin(schoolsTable, eq(studentsTable.schoolId, schoolsTable.id));
  let filtered = students;
  if (search) {
    const q = (search as string).toLowerCase();
    filtered = filtered.filter(({ s }) =>
      s.firstName.toLowerCase().includes(q) || s.lastName.toLowerCase().includes(q) || s.admissionNumber.toLowerCase().includes(q)
    );
  }
  if (schoolId) filtered = filtered.filter(({ s }) => s.schoolId === parseInt(schoolId as string));
  if (status) filtered = filtered.filter(({ s }) => s.status === status);
  if (sponsorshipStatus) filtered = filtered.filter(({ s }) => s.sponsorshipStatus === sponsorshipStatus);
  if (term) filtered = filtered.filter(({ s }) => s.currentTerm === term);
  res.json(filtered.map(({ s, school }) => fmtStudent(s, school)));
});

router.post("/", requireAuth, async (req, res) => {
  const { firstName, lastName, dateOfBirth, gender, phone, email, schoolId, course, currentLevel, currentTerm, totalFees, status,
    guardianName, guardianRelationship, guardianPhone, guardianEmail } = req.body;
  if (!firstName || !lastName) { res.status(400).json({ error: "firstName and lastName required" }); return; }
  const admissionNumber = genAdmission();
  const [student] = await db.insert(studentsTable).values({
    admissionNumber, firstName, lastName,
    dateOfBirth: dateOfBirth || null, gender: gender || null, phone: phone || null, email: email || null,
    schoolId: schoolId ? parseInt(schoolId) : null, course: course || null,
    currentLevel: currentLevel || null, currentTerm: currentTerm || null,
    totalFees: totalFees ? String(totalFees) : null, status: status || "active",
    sponsorshipStatus: "unsponsored",
  }).returning();
  if (guardianName) {
    await db.insert(guardiansTable).values({
      studentId: student.id, name: guardianName,
      relationship: guardianRelationship || null, phone: guardianPhone || null, email: guardianEmail || null,
    });
  }
  await logAction(req, "CREATE_STUDENT", "student", student.id, `Created student ${firstName} ${lastName}`);
  res.status(201).json(fmtStudent(student));
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [row] = await db.select({ s: studentsTable, school: schoolsTable }).from(studentsTable)
    .leftJoin(schoolsTable, eq(studentsTable.schoolId, schoolsTable.id))
    .where(eq(studentsTable.id, id));
  if (!row) { res.status(404).json({ error: "Student not found" }); return; }
  const guardians = await db.select().from(guardiansTable).where(eq(guardiansTable.studentId, id));
  const sponsorships = await db.select({ sp: sponsorshipsTable, sponsor: sponsorsTable }).from(sponsorshipsTable)
    .leftJoin(sponsorsTable, eq(sponsorshipsTable.sponsorId, sponsorsTable.id))
    .where(eq(sponsorshipsTable.studentId, id));
  const recentPayments = await db.select().from(paymentsTable).where(eq(paymentsTable.studentId, id));
  const academicRecords = await db.select().from(academicRecordsTable).where(eq(academicRecordsTable.studentId, id));
  const base = fmtStudent(row.s, row.school);
  res.json({
    ...base,
    guardians: guardians.map(g => ({ id: g.id, studentId: g.studentId, name: g.name, relationship: g.relationship, phone: g.phone, email: g.email })),
    sponsorships: sponsorships.map(({ sp, sponsor }) => ({
      id: sp.id, studentId: sp.studentId, sponsorId: sp.sponsorId,
      sponsorName: sponsor?.name ?? null, coverageType: sp.coverageType,
      amount: Number(sp.amount), startDate: sp.startDate, endDate: sp.endDate,
      status: sp.status, term: sp.term, notes: sp.notes,
      studentName: `${row.s.firstName} ${row.s.lastName}`,
      createdAt: sp.createdAt instanceof Date ? sp.createdAt.toISOString() : sp.createdAt,
    })),
    recentPayments: recentPayments.map(p => ({
      id: p.id, sponsorshipId: p.sponsorshipId, sponsorId: p.sponsorId, studentId: p.studentId,
      amount: Number(p.amount), paymentDate: p.paymentDate, paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber, purpose: p.purpose, term: p.term, notes: p.notes,
      studentName: `${row.s.firstName} ${row.s.lastName}`, sponsorName: null,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    })),
    academicRecords: academicRecords.map(a => ({
      id: a.id, studentId: a.studentId, term: a.term, year: a.year,
      subject: a.subject, grade: a.grade, gpa: a.gpa ? Number(a.gpa) : null,
      remarks: a.remarks, reportCardUrl: a.reportCardUrl,
      createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    })),
  });
});

router.put("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const { firstName, lastName, dateOfBirth, gender, phone, email, schoolId, course, currentLevel, currentTerm, totalFees, status } = req.body;
  const [student] = await db.update(studentsTable).set({
    firstName: firstName || undefined, lastName: lastName || undefined,
    dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : undefined, gender: gender || undefined,
    phone: phone !== undefined ? phone : undefined, email: email !== undefined ? email : undefined,
    schoolId: schoolId !== undefined ? (schoolId ? parseInt(schoolId) : null) : undefined,
    course: course !== undefined ? course : undefined, currentLevel: currentLevel !== undefined ? currentLevel : undefined,
    currentTerm: currentTerm !== undefined ? currentTerm : undefined,
    totalFees: totalFees !== undefined ? (totalFees ? String(totalFees) : null) : undefined,
    status: status || undefined, updatedAt: new Date(),
  }).where(eq(studentsTable.id, id)).returning();
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  await logAction(req, "UPDATE_STUDENT", "student", id, `Updated student ${id}`);
  res.json(fmtStudent(student));
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(guardiansTable).where(eq(guardiansTable.studentId, id));
  await db.delete(studentsTable).where(eq(studentsTable.id, id));
  await logAction(req, "DELETE_STUDENT", "student", id, `Deleted student ${id}`);
  res.status(204).send();
});

router.get("/:id/academic-records", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const records = await db.select().from(academicRecordsTable).where(eq(academicRecordsTable.studentId, id));
  res.json(records.map(a => ({
    id: a.id, studentId: a.studentId, term: a.term, year: a.year,
    subject: a.subject, grade: a.grade, gpa: a.gpa ? Number(a.gpa) : null,
    remarks: a.remarks, reportCardUrl: a.reportCardUrl,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  })));
});

router.post("/:id/academic-records", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const { term, year, subject, grade, gpa, remarks } = req.body;
  if (!term || !year) { res.status(400).json({ error: "term and year required" }); return; }
  const [record] = await db.insert(academicRecordsTable).values({
    studentId: id, term, year: parseInt(year), subject: subject || null, grade: grade || null,
    gpa: gpa ? String(gpa) : null, remarks: remarks || null,
  }).returning();
  await logAction(req, "ADD_ACADEMIC_RECORD", "academic_record", record.id, `Added academic record for student ${id}`);
  res.status(201).json({
    id: record.id, studentId: record.studentId, term: record.term, year: record.year,
    subject: record.subject, grade: record.grade, gpa: record.gpa ? Number(record.gpa) : null,
    remarks: record.remarks, reportCardUrl: record.reportCardUrl,
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
  });
});

export default router;
