import { Router } from "express";
import { db, auditLogsTable, usersTable } from "@workspace/db";
import { eq, gte, lte, and } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router = Router();

router.get("/", requireAdmin, async (req, res) => {
  const { userId, action, startDate, endDate, page = "1", limit = "50" } = req.query;
  const rows = await db.select({ log: auditLogsTable, user: usersTable })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .orderBy(auditLogsTable.createdAt);
  let filtered = rows;
  if (userId) filtered = filtered.filter(r => r.log.userId === parseInt(userId as string));
  if (action) filtered = filtered.filter(r => r.log.action.includes((action as string).toUpperCase()));
  if (startDate) filtered = filtered.filter(r => r.log.createdAt >= new Date(startDate as string));
  if (endDate) filtered = filtered.filter(r => r.log.createdAt <= new Date(endDate as string));
  const total = filtered.length;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  res.json({
    logs: paginated.map(({ log, user }) => ({
      id: log.id, userId: log.userId, username: user?.username ?? null,
      action: log.action, entity: log.entity, entityId: log.entityId,
      details: log.details, ipAddress: log.ipAddress,
      createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
    })),
    total, page: pageNum, limit: limitNum,
  });
});

export default router;
