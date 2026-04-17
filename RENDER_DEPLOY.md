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
  `node artifacts/api-server/dist/index.mjs`

## Required environment variables

Set these in Render service settings:

- `DATABASE_URL` (your hosted Postgres, e.g. Supabase)
- `SESSION_SECRET` (long random secret)
- `CORS_ORIGINS` (comma-separated allowed origins)
  - Example: `https://ikodi-management-system.onrender.com,https://your-frontend.vercel.app,https://*.vercel.app`
- `BASE_PATH` = `/`
- `NODE_ENV` = `production`
- `UPLOADS_DIR` = `/opt/render/project/src/uploads`

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
- If hosting frontend on Vercel, set `VITE_API_URL` in Vercel to your Render API origin (for example `https://ikodi-management-system.onrender.com`).
- If your DB is new, run schema push/migrations before first login.

## Quick readiness checklist

- [ ] Repo pushed with latest changes
- [ ] Render web service created
- [ ] Environment variables set
- [ ] Database reachable from Render
- [ ] Health route responds: `/api/health`
- [ ] Frontend loads at service root `/`

## Preflight before Render deploy

Run from repository root:

```bash
pnpm run check:deploy:render
```

If strict mode fails due missing CORS locally, set a temporary value and re-run:

```bash
# Windows (cmd)
set CORS_ORIGINS=http://localhost:5173
pnpm run check:deploy:render
```

```bash
# macOS/Linux
export CORS_ORIGINS=http://localhost:5173
pnpm run check:deploy:render
```

## Exact rollout commands (GitHub -> Render)

```bash
# 1) Commit and push
git add .
git status
git commit -m "chore: render deployment readiness"
git push origin main

# 2) Trigger Render deploy (via API)
# Requires: RENDER_API_KEY and RENDER_SERVICE_ID
curl -X POST "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

```powershell
# Windows PowerShell deploy trigger
$env:RENDER_API_KEY="your_render_api_key"
$env:RENDER_SERVICE_ID="your_render_service_id"
Invoke-RestMethod -Method Post -Uri "https://api.render.com/v1/services/$env:RENDER_SERVICE_ID/deploys" -Headers @{ Authorization = "Bearer $env:RENDER_API_KEY"; "Content-Type" = "application/json" } -Body "{}"
```
