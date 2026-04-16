# Render Single-Service Deployment (Frontend + Backend Together)

This repository is now configured to deploy as one Render web service.

## Is one-service deployment possible?

Yes. The Express API now serves the built React frontend in production from the same process.

- API routes: `/api/*`
- Frontend routes: all non-API paths (SPA fallback to `index.html`)

## Files added/updated

- `render.yaml` (Render blueprint)
- `artifacts/api-server/src/app.ts` (static frontend hosting + SPA fallback)
- `package.json` (Render build/start scripts)

## Render setup

### Option A: Blueprint (recommended)

1. Push this repo to GitHub.
2. In Render: New + -> Blueprint.
3. Select this repo.
4. Render reads `render.yaml` and creates one web service.

### Option B: Manual web service

- Build Command:
  `corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile && pnpm run render:build`
- Start Command:
  `pnpm run render:start`

## Required environment variables

Set these in Render service settings:

- `DATABASE_URL` (your hosted Postgres, e.g. Supabase)
- `SESSION_SECRET` (long random secret)
- `CORS_ORIGINS` (your Render app URL, for example `https://ikodi-management-system.onrender.com`)
- `BASE_PATH` = `/`
- `NODE_ENV` = `production`

Optional for messaging:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- One of:
  - `TWILIO_MESSAGING_SERVICE_SID` (preferred)
  - `TWILIO_SENDER_ID`
  - `TWILIO_PHONE_NUMBER`
- `SMS_BRAND_NAME` (default `IKODI`)

## Notes

- Render injects `PORT` automatically. The API uses `PORT` in production.
- Do not set `VITE_API_URL` for this one-service setup. Frontend should use same origin.
- If your DB is new, run schema push/migrations before first login.

## Quick readiness checklist

- [ ] Repo pushed with latest changes
- [ ] Render web service created
- [ ] Environment variables set
- [ ] Database reachable from Render
- [ ] Health route responds: `/api/health`
- [ ] Frontend loads at service root `/`
