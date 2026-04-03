import { Router } from "express";
import { db, sponsorsTable, sponsorshipsTable, paymentsTable, studentsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logAction } from "../lib/audit";

const router = Router();

async function getSponsorStats(sponsorId: number) {
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.sponsorId, sponsorId));
  const totalContributed = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const activeSponsorships = await db.select().from(sponsorshipsTable)
    .where(eq(sponsorshipsTable.sponsorId, sponsorId));
  const activeCount = activeSponsorships.filter(s => s.status === "active").length;
  return { totalContributed, activeStudents: activeCount };
}

router.get("/", requireAuth, async (req, res) => {
  const { search, type, status } = req.query;
  const sponsors = await db.select().from(sponsorsTable);
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
});

router.post("/", requireAuth, async (req, res) => {
  const { name, type, email, phone, address, status } = req.body;
  if (!name || !type) { res.status(400).json({ error: "name and type required" }); return; }
  const [sponsor] = await db.insert(sponsorsTable).values({
    name, type, email: email || null, phone: phone || null, address: address || null, status: status || "active",
  }).returning();
  await logAction(req, "CREATE_SPONSOR", "sponsor", sponsor.id, `Created sponsor ${name}`);
  res.status(201).json({ ...sponsor, totalContributed: 0, activeStudents: 0, createdAt: sponsor.createdAt.toISOString() });
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
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
});

router.put("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, type, email, phone, address, status } = req.body;
  const [sponsor] = await db.update(sponsorsTable).set({
    name: name || undefined, type: type || undefined,
    email: email !== undefined ? email : undefined, phone: phone !== undefined ? phone : undefined,
    address: address !== undefined ? address : undefined, status: status || undefined, updatedAt: new Date(),
  }).where(eq(sponsorsTable.id, id)).returning();
  if (!sponsor) { res.status(404).json({ error: "Sponsor not found" }); return; }
  const stats = await getSponsorStats(id);
  await logAction(req, "UPDATE_SPONSOR", "sponsor", id, `Updated sponsor ${id}`);
  res.json({ ...sponsor, ...stats, createdAt: sponsor.createdAt.toISOString() });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(sponsorsTable).where(eq(sponsorsTable.id, id));
  await logAction(req, "DELETE_SPONSOR", "sponsor", id, `Deleted sponsor ${id}`);
  res.status(204).send();
});

export default router;
