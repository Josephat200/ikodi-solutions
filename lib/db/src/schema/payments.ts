import { pgTable, serial, integer, numeric, text, timestamp, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { sponsorsTable } from "./sponsors";
import { sponsorshipsTable } from "./sponsorships";

export const paymentMethodEnum = pgEnum("payment_method", ["mpesa", "bank_transfer", "cash", "cheque", "online"]);

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  sponsorshipId: integer("sponsorship_id").references(() => sponsorshipsTable.id),
  sponsorId: integer("sponsor_id").references(() => sponsorsTable.id),
  studentId: integer("student_id").references(() => studentsTable.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  referenceNumber: text("reference_number"),
  purpose: text("purpose"),
  term: text("term"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
