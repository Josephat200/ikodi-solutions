import { Router } from "express";
import { db, schoolsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logAction } from "../lib/audit";

const router = Router();

const fmt = (s: typeof schoolsTable.$inferSelect) => ({
  id: s.id, name: s.name, category: s.category, location: s.location,
  contactPhone: s.contactPhone, contactEmail: s.contactEmail,
  createdAt: s.createdAt.toISOString(),
});

router.get("/", requireAuth, async (req, res) => {
  const { category } = req.query;
  const schools = await db.select().from(schoolsTable);
  const filtered = category ? schools.filter(s => s.category === category) : schools;
  res.json(filtered.map(fmt));
});

router.post("/", requireAuth, async (req, res) => {
  const { name, category, location, contactPhone, contactEmail } = req.body;
  if (!name || !category || !location) {
    res.status(400).json({ error: "name, category, location required" });
    return;
  }
  const [school] = await db.insert(schoolsTable).values({ name, category, location, contactPhone: contactPhone || null, contactEmail: contactEmail || null }).returning();
  await logAction(req, "CREATE_SCHOOL", "school", school.id, `Created school ${name}`);
  res.status(201).json(fmt(school));
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, id));
  if (!school) { res.status(404).json({ error: "School not found" }); return; }
  res.json(fmt(school));
});

router.put("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, category, location, contactPhone, contactEmail } = req.body;
  const [school] = await db.update(schoolsTable).set({
    name: name || undefined, category: category || undefined, location: location || undefined,
    contactPhone: contactPhone !== undefined ? contactPhone : undefined,
    contactEmail: contactEmail !== undefined ? contactEmail : undefined,
    updatedAt: new Date(),
  }).where(eq(schoolsTable.id, id)).returning();
  if (!school) { res.status(404).json({ error: "School not found" }); return; }
  await logAction(req, "UPDATE_SCHOOL", "school", id, `Updated school ${id}`);
  res.json(fmt(school));
});

export default router;
