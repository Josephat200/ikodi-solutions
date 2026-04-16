import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schoolCategoryEnum = pgEnum("school_category", ["primary_school", "high_school", "college", "university"]);

export const schoolsTable = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: schoolCategoryEnum("category").notNull(),
  location: text("location").notNull(),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertSchoolSchema = createInsertSchema(schoolsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schoolsTable.$inferSelect;
