import express, { type Express } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
const isProduction = process.env.NODE_ENV === "production";
const configuredCorsOrigins =
  process.env.CORS_ORIGINS || process.env.RENDER_EXTERNAL_URL || "";
const corsOrigins = configuredCorsOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const uploadsDir = process.env.UPLOADS_DIR?.trim()
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(process.cwd(), "uploads");

function matchesCorsOrigin(origin: string, pattern: string) {
  if (origin === pattern) return true;

  // Support wildcard patterns like https://*.vercel.app
  if (pattern.includes("*")) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*");
    const regex = new RegExp(`^${escaped}$`, "i");
    return regex.test(origin);
  }

  return false;
}

if (isProduction && corsOrigins.length === 0) {
  throw new Error("CORS_ORIGINS must be explicitly configured in production");
}

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

const secureCookies =
  process.env.FORCE_SECURE_COOKIES === "true" || isProduction;

if (secureCookies) {
  app.set("trust proxy", 1);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (!isProduction) {
        callback(null, true);
        return;
      }
      callback(null, corsOrigins.some((pattern) => matchesCorsOrigin(origin, pattern)));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use("/uploads", express.static(uploadsDir));

const PgSession = connectPgSimple(session);

await pool.query(`
  create table if not exists user_sessions (
    sid varchar not null collate "default" primary key,
    sess json not null,
    expire timestamp(6) not null
  )
`);
await pool.query(
  `create index if not exists user_sessions_expire_idx on user_sessions (expire)`,
);

app.use(session({
  store: new PgSession({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: false,
    pruneSessionInterval: 15 * 60,
  }),
  name: "ikodi.sid",
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: secureCookies,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use("/api", router);

if (isProduction) {
  const thisFile = fileURLToPath(import.meta.url);
  const thisDir = path.dirname(thisFile);
  const webDistDir = path.resolve(thisDir, "../../ikodi/dist/public");

  app.use(express.static(webDistDir, { index: "index.html" }));

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(webDistDir, "index.html"));
  });
}

export default app;
