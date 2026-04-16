import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sponsorTypeEnum = pgEnum("sponsor_type", ["individual", "organization"]);
export const sponsorStatusEnum = pgEnum("sponsor_status", ["active", "inactive"]);

export const sponsorsTable = pgTable("sponsors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: sponsorTypeEnum("type").notNull().default("individual"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  status: sponsorStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertSponsorSchema = createInsertSchema(sponsorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSponsor = z.infer<typeof insertSponsorSchema>;
export type Sponsor = typeof sponsorsTable.$inferSelect;
