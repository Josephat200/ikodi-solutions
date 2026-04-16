import { Router } from "express";
import { db, communicationsTable, usersTable, studentsTable, sponsorsTable, guardiansTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isSponsorPortal, requireAuth, requireCommunicationsWriteAccess } from "../lib/auth";
import { logAction } from "../lib/audit";
import { devState, getDevSponsor, getDevStudent } from "../lib/dev-store";
import { getSMSService, smsConfig } from "../lib/sms";
import { isValidPhoneNumber, normalizePhoneNumber } from "../lib/communications-utils";

const router = Router();
const smsService = getSMSService();

type RecipientType = "student" | "sponsor" | "guardian" | "all";
type RecipientContact = {
  recipientName: string | null;
  phone: string | null;
  email: string | null;
};
type RecipientTargetType = Exclude<RecipientType, "all">;
type BroadcastTargets = {
  students: boolean;
  guardians: boolean;
  sponsors: boolean;
};
type ResolvedRecipient = RecipientContact & {
  recipientType: RecipientTargetType;
  recipientId: number;
};

function requiresSms(channel: string) {
  return channel === "sms" || channel === "both";
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

function resolveBroadcastTargets(raw: Record<string, unknown>) {
  return {
    students: toBoolean(raw.targetStudents),
    guardians: toBoolean(raw.targetGuardians),
    sponsors: toBoolean(raw.targetSponsors),
  } satisfies BroadcastTargets;
}

function hasSelectedBroadcastTargets(targets: BroadcastTargets) {
  return targets.students || targets.guardians || targets.sponsors;
}

function dedupeRecipients(recipients: ResolvedRecipient[]) {
  const seen = new Set<string>();
  const deduped: ResolvedRecipient[] = [];
  for (const recipient of recipients) {
    const key = `${recipient.recipientType}:${recipient.recipientId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(recipient);
  }
  return deduped;
}

async function resolveBroadcastRecipientsFromDb(targets: BroadcastTargets): Promise<ResolvedRecipient[]> {
  const recipients: ResolvedRecipient[] = [];

  if (targets.students) {
    const students = await db.select().from(studentsTable);
    for (const student of students) {
      recipients.push({
        recipientType: "student",
        recipientId: student.id,
        recipientName: `${student.firstName} ${student.lastName}`.trim(),
        phone: normalizePhoneNumber(student.phone),
        email: student.email,
      });
    }
  }

  if (targets.guardians) {
    const guardians = await db.select().from(guardiansTable);
    for (const guardian of guardians) {
      recipients.push({
        recipientType: "guardian",
        recipientId: guardian.id,
        recipientName: guardian.name,
        phone: normalizePhoneNumber(guardian.phone),
        email: guardian.email,
      });
    }
  }

  if (targets.sponsors) {
    const sponsors = await db.select().from(sponsorsTable);
    for (const sponsor of sponsors) {
      recipients.push({
        recipientType: "sponsor",
        recipientId: sponsor.id,
        recipientName: sponsor.name,
        phone: normalizePhoneNumber(sponsor.phone),
        email: sponsor.email,
      });
    }
  }

  return dedupeRecipients(recipients);
}

function resolveBroadcastRecipientsFromDev(targets: BroadcastTargets): ResolvedRecipient[] {
  const recipients: ResolvedRecipient[] = [];

  if (targets.students) {
    for (const student of devState.students) {
      recipients.push({
        recipientType: "student",
        recipientId: student.id,
        recipientName: `${student.firstName} ${student.lastName}`.trim(),
        phone: normalizePhoneNumber(student.phone),
        email: student.email,
      });
    }
  }

  if (targets.sponsors) {
    for (const sponsor of devState.sponsors) {
      recipients.push({
        recipientType: "sponsor",
        recipientId: sponsor.id,
        recipientName: sponsor.name,
        phone: normalizePhoneNumber(sponsor.phone),
        email: sponsor.email,
      });
    }
  }

  return dedupeRecipients(recipients);
}

async function resolveBroadcastRecipients(targets: BroadcastTargets) {
  try {
    return await resolveBroadcastRecipientsFromDb(targets);
  } catch {
    return resolveBroadcastRecipientsFromDev(targets);
  }
}

async function resolveRecipientContactFromDb(recipientType: RecipientType, recipientId: number | null): Promise<RecipientContact> {
  if (!recipientId) return { recipientName: null, phone: null, email: null };

  if (recipientType === "student") {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, recipientId));
    if (!student) return { recipientName: null, phone: null, email: null };
    return {
      recipientName: `${student.firstName} ${student.lastName}`.trim(),
      phone: normalizePhoneNumber(student.phone),
      email: student.email,
    };
  }

  if (recipientType === "sponsor") {
    const [sponsor] = await db.select().from(sponsorsTable).where(eq(sponsorsTable.id, recipientId));
    if (!sponsor) return { recipientName: null, phone: null, email: null };
    return {
      recipientName: sponsor.name,
      phone: normalizePhoneNumber(sponsor.phone),
      email: sponsor.email,
    };
  }

  if (recipientType === "guardian") {
    const [guardian] = await db.select().from(guardiansTable).where(eq(guardiansTable.id, recipientId));
    if (!guardian) return { recipientName: null, phone: null, email: null };
    return {
      recipientName: guardian.name,
      phone: normalizePhoneNumber(guardian.phone),
      email: guardian.email,
    };
  }

  return { recipientName: null, phone: null, email: null };
}

function resolveRecipientContactFromDev(recipientType: RecipientType, recipientId: number | null): RecipientContact {
  if (!recipientId) return { recipientName: null, phone: null, email: null };

  if (recipientType === "student") {
    const student = getDevStudent(recipientId);
    if (!student) return { recipientName: null, phone: null, email: null };
    return {
      recipientName: `${student.firstName} ${student.lastName}`.trim(),
      phone: normalizePhoneNumber(student.phone),
      email: student.email,
    };
  }

  if (recipientType === "sponsor") {
    const sponsor = getDevSponsor(recipientId);
    if (!sponsor) return { recipientName: null, phone: null, email: null };
    return {
      recipientName: sponsor.name,
      phone: normalizePhoneNumber(sponsor.phone),
      email: sponsor.email,
    };
  }

  return { recipientName: null, phone: null, email: null };
}

async function resolveRecipientContact(recipientType: RecipientType, recipientId: number | null): Promise<RecipientContact> {
  try {
    return await resolveRecipientContactFromDb(recipientType, recipientId);
  } catch {
    return resolveRecipientContactFromDev(recipientType, recipientId);
  }
}

router.get("/preview", requireAuth, async (req, res) => {
  const rawRecipientType = String(req.query.recipientType ?? "");
  const rawRecipientId = String(req.query.recipientId ?? "");
  const rawChannel = String(req.query.channel ?? "sms");
  const recipientType = rawRecipientType as RecipientType;
  const recipientId = Number.isFinite(Number(rawRecipientId)) ? Number(rawRecipientId) : null;

  if (!recipientType || !["student", "sponsor", "guardian", "all"].includes(recipientType)) {
    res.status(400).json({ error: "recipientType must be one of student, sponsor, guardian, all" });
    return;
  }

  if (!["sms", "email", "both"].includes(rawChannel)) {
    res.status(400).json({ error: "channel must be one of sms, email, both" });
    return;
  }

  const targets = resolveBroadcastTargets(req.query as Record<string, unknown>);
  const smsRequired = requiresSms(rawChannel);

  if (recipientType === "all") {
    if (!hasSelectedBroadcastTargets(targets)) {
      res.status(400).json({ error: "Select at least one target group: students, guardians, or sponsors" });
      return;
    }

    const recipients = await resolveBroadcastRecipients(targets);
    const totalRecipients = recipients.length;
    const recipientsWithValidSmsPhone = smsRequired
      ? recipients.filter((recipient) => isValidPhoneNumber(recipient.phone)).length
      : totalRecipients;
    const missingValidPhoneCount = smsRequired
      ? totalRecipients - recipientsWithValidSmsPhone
      : 0;

    res.json({
      recipientType,
      channel: rawChannel,
      targets,
      totalRecipients,
      recipientsWithValidSmsPhone,
      missingValidPhoneCount,
    });
    return;
  }

  if (!recipientId) {
    res.status(400).json({ error: "recipientId is required for this recipientType" });
    return;
  }

  const contact = await resolveRecipientContact(recipientType, recipientId);
  const hasValidSmsPhone = isValidPhoneNumber(contact.phone);

  res.json({
    recipientType,
    channel: rawChannel,
    recipientId,
    recipientName: contact.recipientName,
    totalRecipients: 1,
    recipientsWithValidSmsPhone: smsRequired ? (hasValidSmsPhone ? 1 : 0) : 1,
    missingValidPhoneCount: smsRequired && !hasValidSmsPhone ? 1 : 0,
  });
});

router.get("/recipient-contact", requireAuth, async (req, res) => {
  const rawRecipientType = String(req.query.recipientType ?? "");
  const rawRecipientId = String(req.query.recipientId ?? "");
  const recipientType = rawRecipientType as RecipientType;
  const recipientId = Number.isFinite(Number(rawRecipientId)) ? Number(rawRecipientId) : null;

  if (!recipientType || !["student", "sponsor", "guardian", "all"].includes(recipientType)) {
    res.status(400).json({ error: "recipientType must be one of student, sponsor, guardian, all" });
    return;
  }

  if (recipientType !== "all" && !recipientId) {
    res.status(400).json({ error: "recipientId is required for this recipientType" });
    return;
  }

  const contact = await resolveRecipientContact(recipientType, recipientId);
  res.json({
    recipientName: contact.recipientName,
    phone: contact.phone,
    email: contact.email,
    hasValidSmsPhone: isValidPhoneNumber(contact.phone),
  });
});

router.get("/", requireAuth, async (req, res) => {
  if (isSponsorPortal(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { recipientType } = req.query;
  try {
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
  } catch {
    let filtered = devState.communications;
    if (recipientType) filtered = filtered.filter((communication) => communication.recipientType === recipientType);
    res.json(filtered.map((communication) => ({
      id: communication.id,
      sentById: communication.sentById,
      sentByName: null,
      recipientType: communication.recipientType,
      recipientId: communication.recipientId,
      recipientName: null,
      channel: communication.channel,
      subject: communication.subject,
      message: communication.message,
      status: communication.status,
      sentAt: communication.sentAt,
      createdAt: communication.createdAt,
    })));
  }
});

router.post("/", requireCommunicationsWriteAccess, async (req, res) => {
  const { recipientType, recipientId, channel, subject, message } = req.body;
  if (!recipientType || !channel || !message) {
    res.status(400).json({ error: "recipientType, channel, message required" }); return;
  }
  if (!["student", "sponsor", "guardian", "all"].includes(String(recipientType))) {
    res.status(400).json({ error: "recipientType must be one of student, sponsor, guardian, all" }); return;
  }
  if (!["sms", "email", "both"].includes(String(channel))) {
    res.status(400).json({ error: "channel must be one of sms, email, both" }); return;
  }

  const normalizedRecipientId = recipientId == null || recipientId === "" ? null : Number(recipientId);
  const broadcastTargets = resolveBroadcastTargets(req.body as Record<string, unknown>);
  if (recipientType !== "all" && (!Number.isFinite(normalizedRecipientId) || normalizedRecipientId == null)) {
    res.status(400).json({ error: "recipientId is required for this recipientType" }); return;
  }
  if (recipientType === "all" && !hasSelectedBroadcastTargets(broadcastTargets)) {
    res.status(400).json({ error: "Select at least one target group: students, guardians, or sponsors" }); return;
  }

  const trimmedMessage = String(message).trim();
  if (!trimmedMessage) {
    res.status(400).json({ error: "message is required" }); return;
  }

  const userId = (req.session as any)?.userId;

  if (requiresSms(String(channel)) && (smsConfig.provider !== "twilio" || !smsConfig.enabled)) {
    res.status(503).json({
      error:
        "Real SMS delivery is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and either TWILIO_MESSAGING_SERVICE_SID, TWILIO_SENDER_ID, or TWILIO_PHONE_NUMBER.",
    });
    return;
  }

  if (recipientType === "all") {
    const recipients = await resolveBroadcastRecipients(broadcastTargets);
    if (recipients.length === 0) {
      res.status(400).json({ error: "No recipients found for the selected target groups" });
      return;
    }

    let sentCount = 0;
    let failedCount = 0;
    const totalCount = recipients.length;
    const shouldSendSms = requiresSms(String(channel));

    for (const recipient of recipients) {
      let status: "sent" | "failed" = "sent";
      let sentAtValue: Date | null = null;

      if (shouldSendSms) {
        if (!recipient.phone || !isValidPhoneNumber(recipient.phone)) {
          status = "failed";
        } else {
          try {
            const smsSent = await smsService.send({ to: recipient.phone, body: trimmedMessage });
            status = smsSent ? "sent" : "failed";
            sentAtValue = smsSent ? new Date() : null;
          } catch {
            status = "failed";
          }
        }
      } else {
        sentAtValue = new Date();
      }

      if (status === "sent") sentCount += 1;
      if (status === "failed") failedCount += 1;

      try {
        await db.insert(communicationsTable).values({
          sentById: userId || null,
          recipientType: recipient.recipientType,
          recipientId: recipient.recipientId,
          channel,
          subject: subject || null,
          message: trimmedMessage,
          status,
          sentAt: sentAtValue,
        });
      } catch {
        devState.communications.unshift({
          id: devState.nextCommunicationId++,
          sentById: userId || null,
          recipientType: recipient.recipientType,
          recipientId: recipient.recipientId,
          channel,
          subject: subject || null,
          message: trimmedMessage,
          status,
          sentAt: sentAtValue ? sentAtValue.toISOString() : new Date().toISOString(),
          createdAt: new Date().toISOString(),
        } as any);
      }
    }

    await logAction(
      req,
      "SEND_COMMUNICATION",
      "communication",
      0,
      `Broadcast ${channel} to selected groups (sent ${sentCount}/${totalCount})`,
    );

    const responseStatus = failedCount > 0 ? 207 : 201;
    res.status(responseStatus).json({
      success: failedCount === 0,
      broadcast: true,
      targets: broadcastTargets,
      totalRecipients: totalCount,
      sentCount,
      failedCount,
      message:
        failedCount > 0
          ? `Broadcast completed with partial failures (${sentCount}/${totalCount} sent)`
          : `Broadcast sent to ${sentCount} recipients`,
    });
    return;
  }

  const contact = await resolveRecipientContact(recipientType as RecipientType, normalizedRecipientId);
  if (requiresSms(String(channel))) {
    if (!contact.phone || !isValidPhoneNumber(contact.phone)) {
      res.status(400).json({ error: "Recipient does not have a valid phone number for SMS" }); return;
    }
  }

  const shouldSendSms = requiresSms(String(channel));
  let smsSent = true;
  let sendErrorMessage: string | null = null;

  if (shouldSendSms && contact.phone) {
    try {
      smsSent = await smsService.send({ to: contact.phone, body: trimmedMessage });
      if (!smsSent) {
        sendErrorMessage = "SMS provider rejected the message";
      }
    } catch (error: any) {
      smsSent = false;
      sendErrorMessage = error?.message || "Failed to send SMS";
    }
  }

  const status = smsSent ? "sent" : "failed";
  const sentAtValue = smsSent ? new Date() : null;

  try {
    const [comm] = await db.insert(communicationsTable).values({
      sentById: userId || null,
      recipientType,
      recipientId: normalizedRecipientId,
      channel,
      subject: subject || null,
      message: trimmedMessage,
      status,
      sentAt: sentAtValue,
    }).returning();
    await logAction(req, "SEND_COMMUNICATION", "communication", comm.id, `Sent ${channel} to ${recipientType} (${status})`);
    const [user] = userId ? await db.select().from(usersTable).where(eq(usersTable.id, userId)) : [null];
    const payload = {
      id: comm.id, sentById: comm.sentById, sentByName: user?.fullName ?? null,
      recipientType: comm.recipientType, recipientId: comm.recipientId, recipientName: contact.recipientName,
      channel: comm.channel, subject: comm.subject, message: comm.message, status: comm.status,
      sentAt: comm.sentAt?.toISOString() ?? null,
      createdAt: comm.createdAt instanceof Date ? comm.createdAt.toISOString() : comm.createdAt,
    };
    if (!smsSent) {
      res.status(502).json({ ...payload, error: sendErrorMessage || "Failed to send SMS" });
      return;
    }
    res.status(201).json(payload);
  } catch {
    const comm = {
      id: devState.nextCommunicationId++,
      sentById: userId || null,
      recipientType,
      recipientId: normalizedRecipientId,
      channel,
      subject: subject || null,
      message: trimmedMessage,
      status,
      sentAt: sentAtValue ? sentAtValue.toISOString() : new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    devState.communications.unshift(comm as any);
    const payload = {
      id: comm.id,
      sentById: comm.sentById,
      sentByName: null,
      recipientType: comm.recipientType,
      recipientId: comm.recipientId,
      recipientName: contact.recipientName,
      channel: comm.channel,
      subject: comm.subject,
      message: comm.message,
      status: comm.status,
      sentAt: comm.sentAt,
      createdAt: comm.createdAt,
    };
    if (!smsSent) {
      res.status(502).json({ ...payload, error: sendErrorMessage || "Failed to send SMS" });
      return;
    }
    res.status(201).json(payload);
  }
});

export default router;
