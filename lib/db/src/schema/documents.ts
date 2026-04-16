import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const documentTypeEnum = pgEnum("document_type", ["agreement", "receipt", "report_card", "identification", "invoice", "contract", "letter", "other"]);
export const entityTypeEnum = pgEnum("entity_type", ["student", "sponsor", "sponsorship", "payment", "school", "user"]);

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  type: documentTypeEnum("type").notNull(),
  entityType: entityTypeEnum("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  mimeType: text("mime_type"), // e.g., "application/pdf"
  fileSize: integer("file_size"), // in bytes
  uploadedBy: integer("uploaded_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
