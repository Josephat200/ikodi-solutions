import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

type EnvMap = Record<string, string>;
const repoRoot = resolve(process.cwd(), "..");

function parseEnvFile(filePath: string): EnvMap {
  if (!existsSync(filePath)) {
    return {};
  }

  const content = readFileSync(filePath, "utf8");
  const env: EnvMap = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function getMergedEnv(): EnvMap {
  const envFromFile = parseEnvFile(resolve(repoRoot, ".env"));

  return {
    ...envFromFile,
    ...Object.fromEntries(
      Object.entries(process.env).map(([key, value]) => [key, value ?? ""]),
    ),
  };
}

function fail(message: string): never {
  console.error(`\n[check:deploy] FAIL: ${message}`);
  process.exit(1);
}

function warn(message: string): void {
  console.warn(`[check:deploy] WARN: ${message}`);
}

function isStrictMode(): boolean {
  const argStrict = process.argv.includes("--strict");
  const envStrict = process.env.CHECK_DEPLOY_STRICT === "true";
  return argStrict || envStrict;
}

function validateEnv(env: EnvMap): void {
  const required = ["DATABASE_URL", "SESSION_SECRET"];

  for (const key of required) {
    if (!env[key] || !env[key].trim()) {
      fail(`Missing required environment variable: ${key}`);
    }
  }

  const dbUrl = env.DATABASE_URL;
  if (
    dbUrl.includes("your_") ||
    dbUrl.includes("example") ||
    dbUrl.includes("changeme")
  ) {
    fail("DATABASE_URL still looks like a placeholder value.");
  }

  if ((env.SESSION_SECRET ?? "").length < 16) {
    fail("SESSION_SECRET must be at least 16 characters.");
  }

  const strict = isStrictMode();
  const isProduction = (env.NODE_ENV ?? "").toLowerCase() === "production";

  if (!env.CORS_ORIGINS) {
    if (strict || isProduction) {
      fail("CORS_ORIGINS must be set for production/strict deployment preflight.");
    }
    warn("CORS_ORIGINS is not set. Required for production deployments.");
  }

  console.log("[check:deploy] Environment checks passed.");
}

function runStep(command: string, label: string): void {
  console.log(`\n[check:deploy] ${label}`);

  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    cwd: repoRoot,
  });

  if (result.status !== 0) {
    fail(`${label} failed.`);
  }
}

function main(): void {
  console.log("[check:deploy] Starting deployment preflight...");

  const env = getMergedEnv();
  validateEnv(env);

  runStep("pnpm run typecheck", "Typecheck workspace");
  runStep("pnpm run test", "Run backend tests");
  runStep("pnpm -C artifacts/api-server run build", "Build backend");
  runStep("pnpm -C artifacts/ikodi run build", "Build frontend");

  console.log("\n[check:deploy] PASS: Deployment preflight completed successfully.");
}

main();
