import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { db, studentsTable, schoolsTable, guardiansTable, academicRecordsTable, sponsorshipsTable, paymentsTable, sponsorsTable, documentsTable } from "@workspace/db";
import { eq, ilike, and, or, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, requireStudentWriteAccess, isSponsorPortal, resolveSessionSponsorId } from "../lib/auth";
import { logAction } from "../lib/audit";
import { devState, generateDevAdmissionNumber, getDevSchool } from "../lib/dev-store";

const router = Router();
const ALLOWED_RESULT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/rtf",
]);
const uploadsRoot = process.env.UPLOADS_DIR?.trim()
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(process.cwd(), "uploads");
const STUDENT_RESULTS_UPLOAD_DIR = path.resolve(uploadsRoot, "student-results");

fs.mkdirSync(STUDENT_RESULTS_UPLOAD_DIR, { recursive: true });

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildStoredFileName(originalName: string) {
  const ext = path.extname(originalName || "").toLowerCase();
  const safeExt = /^[.][a-z0-9]{1,10}$/.test(ext) ? ext : "";
  return `${Date.now()}-${crypto.randomUUID()}${safeExt}`;
}

const DEV_SCHOOLS = devState.schools;

type DevStudent = {
  id: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  schoolId: number | null;
  course: string | null;
  currentLevel: string | null;
  currentTerm: string | null;
  totalFees: string | null;
  paidAmount: string | null;
  status: string;
  sponsorshipStatus: string;
  createdAt: string;
};

type DevResultDocument = {
  id: number;
  studentId: number;
  title: string;
  description: string | null;
  url: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

const DEV_STUDENTS: DevStudent[] = devState.students as DevStudent[];
const DEV_RESULT_DOCUMENTS: DevResultDocument[] = (devState as any).resultDocuments ?? [];
(devState as any).resultDocuments = DEV_RESULT_DOCUMENTS;

function genAdmission(): string {
  return generateDevAdmissionNumber();
}

function mapDevSchool(schoolId: number | null | undefined) {
  return getDevSchool(schoolId);
}

function fmtDevStudent(student: DevStudent) {
  const school = mapDevSchool(student.schoolId);
  return {
    id: student.id,
    admissionNumber: student.admissionNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    dateOfBirth: student.dateOfBirth,
    gender: student.gender,
    phone: student.phone,
    email: student.email,
    schoolId: student.schoolId,
    schoolName: school?.name ?? null,
    schoolCategory: school?.category ?? null,
    course: student.course,
    currentLevel: student.currentLevel,
    status: student.status,
    sponsorshipStatus: student.sponsorshipStatus,
    totalFees: student.totalFees ? Number(student.totalFees) : null,
    paidAmount: student.paidAmount ? Number(student.paidAmount) : 0,
    balance: student.totalFees && student.paidAmount ? Number(student.totalFees) - Number(student.paidAmount) : student.totalFees ? Number(student.totalFees) : null,
    currentTerm: student.currentTerm,
    createdAt: student.createdAt,
  };
}

function toDevStudent(input: Record<string, unknown>) {
  const student: DevStudent = {
    id: devState.nextStudentId++,
    admissionNumber: String(input.admissionNumber ?? genAdmission()),
    firstName: String(input.firstName ?? ""),
    lastName: String(input.lastName ?? ""),
    dateOfBirth: input.dateOfBirth ? String(input.dateOfBirth) : null,
    gender: input.gender ? String(input.gender) : null,
    phone: input.phone ? String(input.phone) : null,
    email: input.email ? String(input.email) : null,
    schoolId: input.schoolId != null ? Number(input.schoolId) : null,
    course: input.course ? String(input.course) : null,
    currentLevel: input.currentLevel ? String(input.currentLevel) : null,
    currentTerm: input.currentTerm ? String(input.currentTerm) : null,
    totalFees: input.totalFees != null ? String(input.totalFees) : null,
    paidAmount: input.paidAmount != null ? String(input.paidAmount) : null,
    status: String(input.status ?? "active"),
    sponsorshipStatus: String(input.sponsorshipStatus ?? "unsponsored"),
    createdAt: new Date().toISOString(),
  };
  return student;
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
  try {
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
    if (isSponsorPortal(req)) {
      const sponsorId = await resolveSessionSponsorId(req);
      if (!sponsorId) {
        res.json([]);
        return;
      }
      const linked = await db.select().from(sponsorshipsTable).where(eq(sponsorshipsTable.sponsorId, sponsorId));
      const allowedStudentIds = new Set(linked.map((l) => l.studentId));
      filtered = filtered.filter(({ s }) => allowedStudentIds.has(s.id));
    }
    res.json(filtered.map(({ s, school }) => fmtStudent(s, school)));
    return;
  } catch {
    let filtered = DEV_STUDENTS;
    if (search) {
      const q = (search as string).toLowerCase();
      filtered = filtered.filter((s) =>
        s.firstName.toLowerCase().includes(q) || s.lastName.toLowerCase().includes(q) || s.admissionNumber.toLowerCase().includes(q)
      );
    }
    if (schoolId) filtered = filtered.filter((s) => s.schoolId === parseInt(schoolId as string));
    if (status) filtered = filtered.filter((s) => s.status === status);
    if (sponsorshipStatus) filtered = filtered.filter((s) => s.sponsorshipStatus === sponsorshipStatus);
    if (term) filtered = filtered.filter((s) => s.currentTerm === term);
    res.json(filtered.map(fmtDevStudent));
  }
});

router.post("/", requireStudentWriteAccess, async (req, res) => {
  const { firstName, lastName, dateOfBirth, gender, phone, email, schoolId, course, currentLevel, currentTerm, totalFees, status,
    guardianName, guardianRelationship, guardianPhone, guardianEmail } = req.body;
  if (!firstName || !lastName) { res.status(400).json({ error: "firstName and lastName required" }); return; }
  const admissionNumber = genAdmission();
  try {
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
    return;
  } catch {
    const student = toDevStudent({
      admissionNumber,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      email,
      schoolId: schoolId ? parseInt(schoolId) : null,
      course,
      currentLevel,
      currentTerm,
      totalFees,
      status,
      sponsorshipStatus: "unsponsored",
    });
    DEV_STUDENTS.unshift(student);
    res.status(201).json(fmtDevStudent(student));
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id as string);
  try {
    if (isSponsorPortal(req)) {
      const sponsorId = await resolveSessionSponsorId(req);
      if (!sponsorId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const [scope] = await db
        .select()
        .from(sponsorshipsTable)
        .where(and(eq(sponsorshipsTable.studentId, id), eq(sponsorshipsTable.sponsorId, sponsorId)));
      if (!scope) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }
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
    const resultDocuments = await db
      .select()
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.entityType, "student"),
          eq(documentsTable.entityId, id),
          eq(documentsTable.type, "report_card"),
        ),
      );
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
      resultDocuments: resultDocuments.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        url: d.url,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
      })),
    });
    return;
  } catch {
    const student = DEV_STUDENTS.find((item) => item.id === id);
    if (!student) { res.status(404).json({ error: "Student not found" }); return; }
    res.json({
      ...fmtDevStudent(student),
      guardians: [],
      sponsorships: [],
      recentPayments: [],
      academicRecords: [],
      resultDocuments: [],
    });
  }
});

router.get("/:id/results", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid student id" });
    return;
  }

  if (isSponsorPortal(req)) {
    const sponsorId = await resolveSessionSponsorId(req);
    if (!sponsorId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const [scope] = await db
      .select()
      .from(sponsorshipsTable)
      .where(and(eq(sponsorshipsTable.studentId, id), eq(sponsorshipsTable.sponsorId, sponsorId)));
    if (!scope) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  try {
    const docs = await db
      .select()
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.entityType, "student"),
          eq(documentsTable.entityId, id),
          eq(documentsTable.type, "report_card"),
        ),
      );

    res.json(
      docs.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        url: d.url,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
      })),
    );
  } catch {
    res.json(
      DEV_RESULT_DOCUMENTS.filter((d) => d.studentId === id).map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        url: d.url,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        createdAt: d.createdAt,
      })),
    );
  }
});

router.post("/:id/results", requireStudentWriteAccess, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid student id" });
    return;
  }

  const title = String(req.body?.title ?? "").trim();
  const description = String(req.body?.description ?? "").trim() || null;
  const originalName = String(req.body?.fileName ?? "").trim();
  const mimeType = String(req.body?.mimeType ?? "").trim();
  const base64Content = String(req.body?.fileContentBase64 ?? "").trim();

  if (!base64Content || !originalName || !mimeType) {
    res.status(400).json({ error: "File is required" });
    return;
  }
  if (!ALLOWED_RESULT_MIME_TYPES.has(mimeType)) {
    res.status(400).json({ error: "Only PDF, image, and common document files are allowed" });
    return;
  }

  const fileBuffer = Buffer.from(base64Content, "base64");
  if (!fileBuffer.length) {
    res.status(400).json({ error: "Invalid file content" });
    return;
  }
  if (fileBuffer.length > 10 * 1024 * 1024) {
    res.status(400).json({ error: "File size must be 10MB or less" });
    return;
  }

  let studentExists = false;
  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id));
    studentExists = Boolean(student) || DEV_STUDENTS.some((s) => s.id === id);
  } catch {
    studentExists = DEV_STUDENTS.some((s) => s.id === id);
  }

  if (!studentExists) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const storedFileName = buildStoredFileName(originalName || "result");
  const destination = path.join(STUDENT_RESULTS_UPLOAD_DIR, storedFileName);
  await fs.promises.writeFile(destination, fileBuffer);

  const documentTitle = title || sanitizeFileName(originalName || "Student result");
  const publicUrl = `/uploads/student-results/${storedFileName}`;
  const uploadedBy = Number((req.session as any)?.userId) || null;

  try {
    const [created] = await db
      .insert(documentsTable)
      .values({
        type: "report_card",
        entityType: "student",
        entityId: id,
        title: documentTitle,
        description,
        url: publicUrl,
        mimeType,
        fileSize: fileBuffer.length,
        uploadedBy,
      })
      .returning();

    await logAction(req, "UPLOAD_RESULT_DOCUMENT", "document", created.id, `Uploaded result document for student ${id}`);

    res.status(201).json({
      id: created.id,
      title: created.title,
      description: created.description,
      url: created.url,
      mimeType: created.mimeType,
      fileSize: created.fileSize,
      createdAt: created.createdAt instanceof Date ? created.createdAt.toISOString() : created.createdAt,
    });
    return;
  } catch {
    const created: DevResultDocument = {
      id: Date.now(),
      studentId: id,
      title: documentTitle,
      description,
      url: publicUrl,
      mimeType,
      fileSize: fileBuffer.length,
      createdAt: new Date().toISOString(),
    };
    DEV_RESULT_DOCUMENTS.unshift(created);
    res.status(201).json({
      id: created.id,
      title: created.title,
      description: created.description,
      url: created.url,
      mimeType: created.mimeType,
      fileSize: created.fileSize,
      createdAt: created.createdAt,
    });
  }
});

router.delete("/:id/results/:documentId", requireStudentWriteAccess, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const documentId = parseInt(req.params.documentId as string);
  if (Number.isNaN(id) || Number.isNaN(documentId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const [doc] = await db
      .select()
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.id, documentId),
          eq(documentsTable.entityType, "student"),
          eq(documentsTable.entityId, id),
          eq(documentsTable.type, "report_card"),
        ),
      );

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    await db.delete(documentsTable).where(eq(documentsTable.id, documentId));

    if (doc.url?.startsWith("/uploads/student-results/")) {
      const localPath = path.resolve(process.cwd(), doc.url.slice(1));
      await fs.promises.unlink(localPath).catch(() => {});
    }

    await logAction(req, "DELETE_RESULT_DOCUMENT", "document", documentId, `Deleted result document for student ${id}`);
    res.status(204).send();
    return;
  } catch {
    const index = DEV_RESULT_DOCUMENTS.findIndex((d) => d.id === documentId && d.studentId === id);
    if (index < 0) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    const [doc] = DEV_RESULT_DOCUMENTS.splice(index, 1);
    if (doc?.url?.startsWith("/uploads/student-results/")) {
      const localPath = path.resolve(process.cwd(), doc.url.slice(1));
      await fs.promises.unlink(localPath).catch(() => {});
    }
    res.status(204).send();
  }
});

router.put("/:id", requireStudentWriteAccess, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const { firstName, lastName, dateOfBirth, gender, phone, email, schoolId, course, currentLevel, currentTerm, totalFees, status } = req.body;
  try {
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
    return;
  } catch {
    const student = DEV_STUDENTS.find((item) => item.id === id);
    if (!student) { res.status(404).json({ error: "Student not found" }); return; }
    student.firstName = firstName || student.firstName;
    student.lastName = lastName || student.lastName;
    student.dateOfBirth = dateOfBirth !== undefined ? (dateOfBirth || null) : student.dateOfBirth;
    student.gender = gender || student.gender;
    student.phone = phone !== undefined ? (phone || null) : student.phone;
    student.email = email !== undefined ? (email || null) : student.email;
    student.schoolId = schoolId !== undefined ? (schoolId ? parseInt(schoolId) : null) : student.schoolId;
    student.course = course !== undefined ? (course || null) : student.course;
    student.currentLevel = currentLevel !== undefined ? (currentLevel || null) : student.currentLevel;
    student.currentTerm = currentTerm !== undefined ? (currentTerm || null) : student.currentTerm;
    student.totalFees = totalFees !== undefined ? (totalFees ? String(totalFees) : null) : student.totalFees;
    student.status = status || student.status;
    res.json(fmtDevStudent(student));
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  try {
    await db.delete(guardiansTable).where(eq(guardiansTable.studentId, id));
    await db.delete(studentsTable).where(eq(studentsTable.id, id));
    await logAction(req, "DELETE_STUDENT", "student", id, `Deleted student ${id}`);
    res.status(204).send();
    return;
  } catch {
    const index = DEV_STUDENTS.findIndex((item) => item.id === id);
    if (index >= 0) {
      DEV_STUDENTS.splice(index, 1);
      res.status(204).send();
      return;
    }
    res.status(404).json({ error: "Student not found" });
  }
});

router.get("/:id/academic-records", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isSponsorPortal(req)) {
    const sponsorId = await resolveSessionSponsorId(req);
    if (!sponsorId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const [scope] = await db
      .select()
      .from(sponsorshipsTable)
      .where(and(eq(sponsorshipsTable.studentId, id), eq(sponsorshipsTable.sponsorId, sponsorId)));
    if (!scope) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  try {
    const records = await db.select().from(academicRecordsTable).where(eq(academicRecordsTable.studentId, id));
    res.json(records.map(a => ({
      id: a.id, studentId: a.studentId, term: a.term, year: a.year,
      subject: a.subject, grade: a.grade, gpa: a.gpa ? Number(a.gpa) : null,
      remarks: a.remarks, reportCardUrl: a.reportCardUrl,
      createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    })));
  } catch {
    res.json([]);
  }
});

router.post("/:id/academic-records", requireStudentWriteAccess, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const { term, year, subject, grade, gpa, remarks } = req.body;
  if (!term || !year) { res.status(400).json({ error: "term and year required" }); return; }
  try {
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
    return;
  } catch {
    res.status(201).json({
      id: Date.now(),
      studentId: id,
      term,
      year: parseInt(year),
      subject: subject || null,
      grade: grade || null,
      gpa: gpa ? Number(gpa) : null,
      remarks: remarks || null,
      reportCardUrl: null,
      createdAt: new Date().toISOString(),
    });
  }
});

export default router;
