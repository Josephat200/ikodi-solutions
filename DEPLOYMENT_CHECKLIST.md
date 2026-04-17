# IKODI Management System - Deployment Checklist

Use this checklist for a clean release to GitHub + Render + Vercel.

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

## ☁️ Render Checklist (Backend)

- [ ] Service created from this repository (Blueprint or manual)
- [ ] Build command:
  - `corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile && pnpm run render:build`
- [ ] Start command:
  - `node artifacts/api-server/dist/index.mjs`
- [ ] Environment variables configured:
  - `NODE_ENV=production`
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `CORS_ORIGINS`
  - `UPLOADS_DIR=/opt/render/project/src/uploads`
- [ ] Health check passes at `/api/health`

---

## ▲ Vercel Checklist (Frontend)

- [ ] Import repository
- [ ] Framework preset: Vite
- [ ] Root directory: repository root
- [ ] Build command:
  - `pnpm -C artifacts/ikodi run build`
- [ ] Output directory:
  - `artifacts/ikodi/dist`
- [ ] Environment variable set:
  - `VITE_API_URL=https://your-render-domain.onrender.com`
- [ ] Production deployment succeeds

---

## 🔁 Post-Deploy Verification

- [ ] Frontend loads without console/runtime errors
- [ ] Login works with production account
- [ ] Dashboard data loads
- [ ] Student results upload/list/download/delete works
- [ ] CORS/session behavior works from Vercel domain
- [ ] `/api/health` returns healthy status

---

## 🧯 Rollback Readiness

- [ ] Previous Render deploy is available for rollback
- [ ] Previous Vercel deploy is available for instant promote
- [ ] Last known good Git commit is tagged

