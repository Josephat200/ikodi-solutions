import { Router } from "express";
import { db, communicationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logAction } from "../lib/audit";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { recipientType } = req.query;
  const rows = await db.select({ c: communicationsTable, user: usersTable })
    .from(communicationsTable)
    .leftJoin(usersTable, eq(communicationsTable.sentById, usersTable.id));
  let filtered = rows;
  if (recipientType) filtered = filtered.filter(r => r.c.recipientType === recipientType);
  res.json(filtered.map(({ c, user }) => ({
    id: c.id, sentById: c.sentById, sentByName: user?.fullName ?? null,
    recipientType: c.recipientType, recipientId: c.recipientId, recipientName: null,
    channel: c.channel, subject: c.subject, message: c.message, status: c.status,
    sentAt: c.sentAt?.toISOString() ?? null,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  })));
});

router.post("/", requireAuth, async (req, res) => {
  const { recipientType, recipientId, channel, subject, message } = req.body;
  if (!recipientType || !channel || !message) {
    res.status(400).json({ error: "recipientType, channel, message required" }); return;
  }
  const userId = (req.session as any)?.userId;
  const [comm] = await db.insert(communicationsTable).values({
    sentById: userId || null, recipientType, recipientId: recipientId || null,
    channel, subject: subject || null, message, status: "sent", sentAt: new Date(),
  }).returning();
  await logAction(req, "SEND_COMMUNICATION", "communication", comm.id, `Sent ${channel} to ${recipientType}`);
  const [user] = userId ? await db.select().from(usersTable).where(eq(usersTable.id, userId)) : [null];
  res.status(201).json({
    id: comm.id, sentById: comm.sentById, sentByName: user?.fullName ?? null,
    recipientType: comm.recipientType, recipientId: comm.recipientId, recipientName: null,
    channel: comm.channel, subject: comm.subject, message: comm.message, status: comm.status,
    sentAt: comm.sentAt?.toISOString() ?? null,
    createdAt: comm.createdAt instanceof Date ? comm.createdAt.toISOString() : comm.createdAt,
  });
});

export default router;
