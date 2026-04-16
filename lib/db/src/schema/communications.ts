import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const recipientTypeEnum = pgEnum("recipient_type", ["student", "sponsor", "guardian", "all"]);
export const channelEnum = pgEnum("channel", ["email", "sms", "both"]);
export const commStatusEnum = pgEnum("comm_status", ["sent", "failed", "pending"]);

export const communicationsTable = pgTable("communications", {
  id: serial("id").primaryKey(),
  sentById: integer("sent_by_id").references(() => usersTable.id),
  recipientType: recipientTypeEnum("recipient_type").notNull(),
  recipientId: integer("recipient_id"),
  channel: channelEnum("channel").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  status: commStatusEnum("status").notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertCommunicationSchema = createInsertSchema(communicationsTable).omit({ id: true, createdAt: true });
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Communication = typeof communicationsTable.$inferSelect;
