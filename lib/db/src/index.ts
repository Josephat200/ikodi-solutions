import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;
const isLocalDatabaseUrl = /localhost|127\.0\.0\.1/.test(connectionString);
const disableSsl = process.env.DATABASE_SSL === "disable";
const forceSsl =
  process.env.DATABASE_SSL === "require" || process.env.PGSSLMODE === "require";

const ssl = disableSsl
  ? undefined
  : forceSsl || !isLocalDatabaseUrl
    ? { rejectUnauthorized: false }
    : undefined;

export const pool = new Pool({ connectionString, ssl });
export const db = drizzle(pool, { schema });

export * from "./schema";
