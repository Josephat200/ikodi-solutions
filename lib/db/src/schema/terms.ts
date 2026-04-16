import { pgTable, serial, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const termsTable = pgTable("terms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertTermSchema = createInsertSchema(termsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertTerm = z.infer<typeof insertTermSchema>;
export type Term = typeof termsTable.$inferSelect;
