import { Router } from "express";
import { db, sponsorsTable, sponsorshipsTable, paymentsTable, studentsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { isSponsorPortal, requireAdmin, requireAuth } from "../lib/auth";
import { logAction } from "../lib/audit";
import { devState, getDevStudent, getDevSponsor } from "../lib/dev-store";

const router = Router();

async function getSponsorStats(sponsorId: number) {
  try {
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.sponsorId, sponsorId));
    const totalContributed = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const activeSponsorships = await db.select().from(sponsorshipsTable)
      .where(eq(sponsorshipsTable.sponsorId, sponsorId));
    const activeCount = activeSponsorships.filter(s => s.status === "active").length;
    return { totalContributed, activeStudents: activeCount };
  } catch {
    const payments = devState.payments.filter((payment) => payment.sponsorId === sponsorId);
    const totalContributed = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const activeCount = devState.sponsorships.filter((sponsorship) => sponsorship.sponsorId === sponsorId && sponsorship.status === "active").length;
    return { totalContributed, activeStudents: activeCount };
  }
}

function fmtDevSponsor(sponsor: (typeof devState.sponsors)[number]) {
  return {
    id: sponsor.id,
    name: sponsor.name,
    type: sponsor.type,
    email: sponsor.email,
    phone: sponsor.phone,
    address: sponsor.address,
    status: sponsor.status,
    createdAt: sponsor.createdAt,
  };
}

router.get("/", requireAuth, async (req, res) => {
  if (isSponsorPortal(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { search, type, status } = req.query;
  try {
    let sponsors = await db.select().from(sponsorsTable);
    let filtered = sponsors;
    if (search) {
      const q = (search as string).toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q));
    }
    if (type) filtered = filtered.filter(s => s.type === type);
    if (status) filtered = filtered.filter(s => s.status === status);
    const result = await Promise.all(filtered.map(async s => {
      const stats = await getSponsorStats(s.id);
      return {
        id: s.id, name: s.name, type: s.type, email: s.email, phone: s.phone, address: s.address,
        status: s.status, ...stats, createdAt: s.createdAt.toISOString(),
      };
    }));
    res.json(result);
  } catch {
    let filtered = devState.sponsors;
    if (search) {
      const q = (search as string).toLowerCase();
      filtered = filtered.filter((sponsor) => sponsor.name.toLowerCase().includes(q) || (sponsor.email || "").toLowerCase().includes(q));
    }
    if (type) filtered = filtered.filter((sponsor) => sponsor.type === type);
    if (status) filtered = filtered.filter((sponsor) => sponsor.status === status);
    const result = filtered.map((sponsor) => {
      const stats = devState.payments.filter((payment) => payment.sponsorId === sponsor.id).reduce((sum, payment) => sum + Number(payment.amount), 0);
      const activeStudents = devState.sponsorships.filter((sponsorship) => sponsorship.sponsorId === sponsor.id && sponsorship.status === "active").length;
      return { ...fmtDevSponsor(sponsor), totalContributed: stats, activeStudents };
    });
    res.json(result);
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const { name, type, email, phone, address, status } = req.body;
  if (!name || !type) { res.status(400).json({ error: "name and type required" }); return; }
  try {
    const [sponsor] = await db.insert(sponsorsTable).values({
      name, type, email: email || null, phone: phone || null, address: address || null, status: status || "active",
    }).returning();
    await logAction(req, "CREATE_SPONSOR", "sponsor", sponsor.id, `Created sponsor ${name}`);
    res.status(201).json({ ...sponsor, totalContributed: 0, activeStudents: 0, createdAt: sponsor.createdAt.toISOString() });
  } catch {
    const sponsor = {
      id: devState.nextSponsorId++,
      name,
      type,
      email: email || null,
      phone: phone || null,
      address: address || null,
      status: status || "active",
      createdAt: new Date().toISOString(),
    } as const;
    devState.sponsors.unshift(sponsor as any);
    res.status(201).json({ ...sponsor, totalContributed: 0, activeStudents: 0 });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  if (isSponsorPortal(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const id = parseInt(req.params.id as string);
  try {
    const [sponsor] = await db.select().from(sponsorsTable).where(eq(sponsorsTable.id, id));
    if (!sponsor) { res.status(404).json({ error: "Sponsor not found" }); return; }
    const stats = await getSponsorStats(id);
    const sponsorships = await db.select({ sp: sponsorshipsTable, student: studentsTable }).from(sponsorshipsTable)
      .leftJoin(studentsTable, eq(sponsorshipsTable.studentId, studentsTable.id))
      .where(eq(sponsorshipsTable.sponsorId, id));
    const recentPayments = await db.select().from(paymentsTable).where(eq(paymentsTable.sponsorId, id));
    res.json({
      id: sponsor.id, name: sponsor.name, type: sponsor.type, email: sponsor.email, phone: sponsor.phone,
      address: sponsor.address, status: sponsor.status, ...stats, createdAt: sponsor.createdAt.toISOString(),
      sponsorships: sponsorships.map(({ sp, student }) => ({
        id: sp.id, studentId: sp.studentId, sponsorId: sp.sponsorId,
        studentName: student ? `${student.firstName} ${student.lastName}` : null,
        sponsorName: sponsor.name, coverageType: sp.coverageType, amount: Number(sp.amount),
        startDate: sp.startDate, endDate: sp.endDate, status: sp.status, term: sp.term, notes: sp.notes,
        createdAt: sp.createdAt instanceof Date ? sp.createdAt.toISOString() : sp.createdAt,
      })),
      recentPayments: recentPayments.map(p => ({
        id: p.id, sponsorshipId: p.sponsorshipId, sponsorId: p.sponsorId, studentId: p.studentId,
        amount: Number(p.amount), paymentDate: p.paymentDate, paymentMethod: p.paymentMethod,
        referenceNumber: p.referenceNumber, purpose: p.purpose, term: p.term, notes: p.notes,
        studentName: null, sponsorName: sponsor.name,
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      })),
    });
  } catch {
    const sponsor = getDevSponsor(id);
    if (!sponsor) { res.status(404).json({ error: "Sponsor not found" }); return; }
    const stats = await getSponsorStats(id);
    const sponsorships = devState.sponsorships.filter((sp) => sp.sponsorId === id).map((sp) => ({
      id: sp.id,
      studentId: sp.studentId,
      sponsorId: sp.sponsorId,
      studentName: getDevStudent(sp.studentId) ? `${getDevStudent(sp.studentId)!.firstName} ${getDevStudent(sp.studentId)!.lastName}` : null,
      sponsorName: sponsor.name,
      coverageType: sp.coverageType,
      amount: Number(sp.amount),
      startDate: sp.startDate,
      endDate: sp.endDate,
      status: sp.status,
      term: sp.term,
      notes: sp.notes,
      createdAt: sp.createdAt,
    }));
    const recentPayments = devState.payments.filter((payment) => payment.sponsorId === id).map((payment) => ({
      id: payment.id,
      sponsorshipId: payment.sponsorshipId,
      sponsorId: payment.sponsorId,
      studentId: payment.studentId,
      amount: Number(payment.amount),
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      referenceNumber: payment.referenceNumber,
      purpose: payment.purpose,
      term: payment.term,
      notes: payment.notes,
      studentName: null,
      sponsorName: sponsor.name,
      createdAt: payment.createdAt,
    }));
    res.json({ ...fmtDevSponsor(sponsor), ...stats, sponsorships, recentPayments });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const { name, type, email, phone, address, status } = req.body;
  try {
    const [sponsor] = await db.update(sponsorsTable).set({
      name: name || undefined, type: type || undefined,
      email: email !== undefined ? email : undefined, phone: phone !== undefined ? phone : undefined,
      address: address !== undefined ? address : undefined, status: status || undefined, updatedAt: new Date(),
    }).where(eq(sponsorsTable.id, id)).returning();
    if (!sponsor) { res.status(404).json({ error: "Sponsor not found" }); return; }
    const stats = await getSponsorStats(id);
    await logAction(req, "UPDATE_SPONSOR", "sponsor", id, `Updated sponsor ${id}`);
    res.json({ ...sponsor, ...stats, createdAt: sponsor.createdAt.toISOString() });
  } catch {
    const sponsor = devState.sponsors.find((item) => item.id === id);
    if (!sponsor) { res.status(404).json({ error: "Sponsor not found" }); return; }
    sponsor.name = name || sponsor.name;
    sponsor.type = type || sponsor.type;
    sponsor.email = email !== undefined ? (email || null) : sponsor.email;
    sponsor.phone = phone !== undefined ? (phone || null) : sponsor.phone;
    sponsor.address = address !== undefined ? (address || null) : sponsor.address;
    sponsor.status = status || sponsor.status;
    const stats = await getSponsorStats(id);
    res.json({ ...fmtDevSponsor(sponsor), ...stats });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  try {
    await db.delete(sponsorsTable).where(eq(sponsorsTable.id, id));
    await logAction(req, "DELETE_SPONSOR", "sponsor", id, `Deleted sponsor ${id}`);
    res.status(204).send();
  } catch {
    const index = devState.sponsors.findIndex((sponsor) => sponsor.id === id);
    if (index >= 0) {
      devState.sponsors.splice(index, 1);
      res.status(204).send();
      return;
    }
    res.status(404).json({ error: "Sponsor not found" });
  }
});

export default router;
