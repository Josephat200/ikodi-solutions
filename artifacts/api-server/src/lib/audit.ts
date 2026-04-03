import { Request } from "express";
import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";

export async function logAction(
  req: Request,
  action: string,
  entity?: string,
  entityId?: number,
  details?: string
): Promise<void> {
  try {
    const userId = (req.session as any)?.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    await db.insert(auditLogsTable).values({
      userId: userId || null,
      action,
      entity: entity || null,
      entityId: entityId || null,
      details: details || null,
      ipAddress: ipAddress || null,
    });
  } catch {
  }
}
