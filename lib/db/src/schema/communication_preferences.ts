import { pgTable, serial, integer, boolean, timestamp, pgEnum, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const commPrefRecipientTypeEnum = pgEnum("comm_pref_recipient_type", ["user", "student", "sponsor", "guardian"]);
export const preferredChannelEnum = pgEnum("preferred_channel", ["email", "sms", "both", "phone"]);

export const communicationPreferencesTable = pgTable("communication_preferences", {
  id: serial("id").primaryKey(),
  recipientType: commPrefRecipientTypeEnum("recipient_type").notNull(),
  recipientId: integer("recipient_id").notNull(),
  preferredChannel: preferredChannelEnum("preferred_channel").notNull().default("email"),
  allowEmail: boolean("allow_email").notNull().default(true),
  allowSms: boolean("allow_sms").notNull().default(true),
  allowPhone: boolean("allow_phone").notNull().default(true),
  doNotContact: boolean("do_not_contact").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertCommunicationPreferenceSchema = createInsertSchema(communicationPreferencesTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertCommunicationPreference = z.infer<typeof insertCommunicationPreferenceSchema>;
export type CommunicationPreference = typeof communicationPreferencesTable.$inferSelect;
