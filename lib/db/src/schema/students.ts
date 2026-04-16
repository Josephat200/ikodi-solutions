import { pgTable, serial, text, timestamp, date, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);
export const studentStatusEnum = pgEnum("student_status", ["active", "inactive", "graduated"]);
export const sponsorshipStatusEnum = pgEnum("sponsorship_status_enum", ["sponsored", "partial", "unsponsored"]);

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  admissionNumber: text("admission_number").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: date("date_of_birth"),
  gender: genderEnum("gender"),
  phone: text("phone"),
  email: text("email"),
  schoolId: integer("school_id").references(() => schoolsTable.id),
  course: text("course"),
  currentLevel: text("current_level"),
  currentTerm: text("current_term"),
  totalFees: numeric("total_fees", { precision: 12, scale: 2 }),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).default("0"),
  status: studentStatusEnum("status").notNull().default("active"),
  sponsorshipStatus: sponsorshipStatusEnum("sponsorship_status").notNull().default("unsponsored"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const guardiansTable = pgTable("guardians", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  name: text("name").notNull(),
  relationship: text("relationship"),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const academicRecordsTable = pgTable("academic_records", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  term: text("term").notNull(),
  year: integer("year").notNull(),
  subject: text("subject"),
  grade: text("grade"),
  gpa: numeric("gpa", { precision: 4, scale: 2 }),
  remarks: text("remarks"),
  reportCardUrl: text("report_card_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
export type Guardian = typeof guardiansTable.$inferSelect;
export type AcademicRecord = typeof academicRecordsTable.$inferSelect;
