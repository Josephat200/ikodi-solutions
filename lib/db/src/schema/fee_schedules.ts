import { pgTable, serial, integer, numeric, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { termsTable } from "./terms";
import { schoolsTable } from "./schools";

export const feeTypeEnum = pgEnum("fee_type", ["tuition", "accommodation", "activity_fee", "laboratory", "library", "transport", "other"]);

export const feeScheduleTable = pgTable("fee_schedules", {
  id: serial("id").primaryKey(),
  termId: integer("term_id").notNull().references(() => termsTable.id),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id),
  studentLevel: text("student_level").notNull(), // e.g., "Form 1", "Year 1"
  feeType: feeTypeEnum("fee_type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  isActive: numeric("is_active", { precision: 1, scale: 0 }).notNull().default("1"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertFeeScheduleSchema = createInsertSchema(feeScheduleTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertFeeSchedule = z.infer<typeof insertFeeScheduleSchema>;
export type FeeSchedule = typeof feeScheduleTable.$inferSelect;
