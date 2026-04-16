import { pgTable, serial, integer, numeric, text, timestamp, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { sponsorsTable } from "./sponsors";

export const coverageTypeEnum = pgEnum("coverage_type", ["full", "partial"]);
export const sponsorshipStatusEnum2 = pgEnum("sponsorship_status", ["active", "inactive", "completed"]);

export const sponsorshipsTable = pgTable("sponsorships", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  sponsorId: integer("sponsor_id").notNull().references(() => sponsorsTable.id),
  coverageType: coverageTypeEnum("coverage_type").notNull().default("full"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: sponsorshipStatusEnum2("status").notNull().default("active"),
  term: text("term"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertSponsorshipSchema = createInsertSchema(sponsorshipsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSponsorship = z.infer<typeof insertSponsorshipSchema>;
export type Sponsorship = typeof sponsorshipsTable.$inferSelect;
