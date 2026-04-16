import { Router } from "express";
import { db, schoolsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isSponsorPortal, requireAdmin, requireAuth } from "../lib/auth";
import { logAction } from "../lib/audit";
import { devState, getDevSchool } from "../lib/dev-store";

const router = Router();
const DEV_SCHOOLS = devState.schools;

const fmt = (s: typeof schoolsTable.$inferSelect) => ({
  id: s.id, name: s.name, category: s.category, location: s.location,
  contactPhone: s.contactPhone, contactEmail: s.contactEmail,
  createdAt: s.createdAt.toISOString(),
});

const fmtDevSchool = (s: (typeof DEV_SCHOOLS)[number]) => s;

router.get("/", requireAuth, async (req, res) => {
  if (isSponsorPortal(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { category } = req.query;
  try {
    const schools = await db.select().from(schoolsTable);
    const filtered = category ? schools.filter(s => s.category === category) : schools;
    res.json(filtered.map(fmt));
  } catch {
    const filtered = category ? DEV_SCHOOLS.filter(s => s.category === category) : DEV_SCHOOLS;
    res.json(filtered.map(fmtDevSchool));
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const { name, category, location, contactPhone, contactEmail } = req.body;
  if (!name || !category || !location) {
    res.status(400).json({ error: "name, category, location required" });
    return;
  }
  try {
    const [school] = await db.insert(schoolsTable).values({ name, category, location, contactPhone: contactPhone || null, contactEmail: contactEmail || null }).returning();
    await logAction(req, "CREATE_SCHOOL", "school", school.id, `Created school ${name}`);
    res.status(201).json(fmt(school));
  } catch {
    res.status(201).json({
      id: Date.now(),
      name,
      category,
      location,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      createdAt: new Date().toISOString(),
    });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  if (isSponsorPortal(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const id = parseInt(req.params.id as string);
  try {
    const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, id));
    if (!school) { res.status(404).json({ error: "School not found" }); return; }
    res.json(fmt(school));
  } catch {
    const school = getDevSchool(id);
    if (!school) { res.status(404).json({ error: "School not found" }); return; }
    res.json(fmtDevSchool(school));
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const { name, category, location, contactPhone, contactEmail } = req.body;
  try {
    const [school] = await db.update(schoolsTable).set({
      name: name || undefined, category: category || undefined, location: location || undefined,
      contactPhone: contactPhone !== undefined ? contactPhone : undefined,
      contactEmail: contactEmail !== undefined ? contactEmail : undefined,
      updatedAt: new Date(),
    }).where(eq(schoolsTable.id, id)).returning();
    if (!school) { res.status(404).json({ error: "School not found" }); return; }
    await logAction(req, "UPDATE_SCHOOL", "school", id, `Updated school ${id}`);
    res.json(fmt(school));
  } catch {
    const school = getDevSchool(id);
    if (!school) { res.status(404).json({ error: "School not found" }); return; }
    res.json({
      id: school.id,
      name: name || school.name,
      category: category || school.category,
      location: location || school.location,
      contactPhone: contactPhone !== undefined ? contactPhone : school.contactPhone,
      contactEmail: contactEmail !== undefined ? contactEmail : school.contactEmail,
      createdAt: new Date().toISOString(),
    });
  }
});

export default router;
