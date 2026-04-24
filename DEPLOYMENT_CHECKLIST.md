# IKODI Management System - Deployment Checklist

Use this checklist for a clean release to GitHub + Render.

---

## 📋 Preflight (Local)

Run one command from repository root:

```bash
pnpm run check:deploy
```

For Render production readiness (strict mode requiring `CORS_ORIGINS`):

```bash
pnpm run check:deploy:render
```

This command validates required environment values and runs:
- Workspace typecheck
- Backend test suite
- Backend production build
- Frontend production build

Before you run it, confirm these variables are set in `.env` or shell:
- `DATABASE_URL`
- `SESSION_SECRET`
- `CORS_ORIGINS` (recommended for production)

---

## 🧾 GitHub Release Checklist

- [ ] Review pending changes (`git status`)
- [ ] Confirm no secrets or local artifacts are included
- [ ] Run preflight: `pnpm run check:deploy`
- [ ] Commit with clear message
- [ ] Push to main branch

Suggested commands:

```bash
git add .
git status
git commit -m "chore: deployment preflight + rollout checklist"
git push origin main
```

---

## 🗂️ File-Based PostgreSQL Checklist (Self-Hosted)

- [ ] `.env` prepared from [.env.production.filedb.example](./.env.production.filedb.example)
- [ ] `DB_MODE=file` configured
- [ ] `DATABASE_URL` points to localhost (`postgresql://...@localhost:5432/...`)
- [ ] Local DB initialized: `pnpm run prod:filedb:init`
- [ ] Production readiness preflight passes: `pnpm run prod:filedb:check`
- [ ] `NODE_ENV=production` and `CORS_ORIGINS` set to production domain
- [ ] `ENABLE_DEV_AUTH_BYPASS=false`
- [ ] Persistent backups configured for `.local/postgres-data` and `uploads/`
- [ ] Health check passes at `/api/health`

## ☁️ Render Checklist (Backend)

- [ ] Service created from this repository (Blueprint or manual)
- [ ] PostgreSQL database created and linked in the Render blueprint
- [ ] Build command:
  - `corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile && pnpm run render:build`
- [ ] Start command:
  - `node artifacts/api-server/dist/index.mjs`
- [ ] Environment variables configured:
  - `NODE_ENV=production`
  - `DATABASE_URL` from the linked Render PostgreSQL resource
  - `DATABASE_SSL=require`
  - `SESSION_SECRET`
  - `CORS_ORIGINS`
  - `UPLOADS_DIR=/opt/render/project/src/uploads`
- [ ] Health check passes at `/api/health`

## 🌐 Frontend Serving

- [ ] Confirm the frontend loads from the same Render service root URL
- [ ] Confirm `/api/*` routes still resolve correctly after deployment

## 📄 Production Env Sample

- [ ] Review [.env.production.example](./.env.production.example)
- [ ] Confirm `DATABASE_URL` matches the Render PostgreSQL resource
- [ ] Confirm `CORS_ORIGINS` includes the Render domain when using a single-service deploy

---

## 🔁 Post-Deploy Verification

- [ ] Frontend loads without console/runtime errors
- [ ] Login works with production account
- [ ] Dashboard data loads
- [ ] Student results upload/list/download/delete works
- [ ] CORS/session behavior works from the Render domain
- [ ] `/api/health` returns healthy status

---

## 🧯 Rollback Readiness

- [ ] Previous Render deploy is available for rollback
- [ ] Last known good Git commit is tagged

