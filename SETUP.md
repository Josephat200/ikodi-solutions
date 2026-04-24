# IKODI Management System - Setup Guide

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ 
- pnpm (package manager)
- PostgreSQL runtime in this project folder (`.local/pg-runtime`) for file-based mode

### 2. Database Setup (PostgreSQL)

#### Step 1: Start the local PostgreSQL service
```bash
pnpm run db:up
```

This starts PostgreSQL from the local runtime under `.local/` in this project folder.

#### Step 2: Configure Environment
```bash
# In the project root, create .env file from template
cp .env.example .env

# Edit .env and set DATABASE_URL to your PostgreSQL connection string
# Local development example:
# DB_MODE=file
# DATABASE_URL=postgresql://ikodi:ikodi_dev_password@localhost:5432/ikodi_db
```

#### Step 3: Run Migrations
```bash
cd lib/db
pnpm install
pnpm run push
# This creates all database tables using Drizzle
```

#### Step 4: Seed Initial Data
```bash
cd ../../
pnpm run seed
# Creates sample data: 5 schools, 10 sponsors, 20 students, 50 sponsorships, test admin user
```

### 3. Backend Setup

```bash
cd artifacts/api-server
pnpm install
export NODE_ENV=development
pnpm run dev
# API runs on http://localhost:3001
```

### 4. Frontend Setup

```bash
cd artifacts/ikodi
pnpm install
pnpm run dev
# Frontend runs on http://localhost:5173
```

### 5. Test Credentials

After seeding, use these to log in:
- **Username:** admin@ikodi.local
- **Password:** Admin@123456

---

## 🔧 SMS Setup (Optional)

### Twilio (SMS)
1. Sign up at https://twilio.com
2. Get your Account SID and Auth Token from Dashboard
3. Buy a phone number
4. Add to `.env`:
   ```
   TWILIO_ACCOUNT_SID=your_sid_here
   TWILIO_AUTH_TOKEN=your_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   ```

Communications sent through the app will now be delivered via SMS.

---

## 🧪 Testing

### Run All Tests
```bash
pnpm run test
```

### Run Specific Test Suite
```bash
pnpm run test -- auth.test.ts
```

### Run with Coverage
```bash
pnpm run test:coverage
```

Tests cover critical workflows:
- Authentication (login, session, logout)
- Student management (create, read, update, delete)
- Sponsor management
- Sponsorship allocation
- Payment tracking
- API error handling

---

## 📦 Deployment

### Development
```bash
npm run dev          # Starts everything in dev mode
npm run build        # Builds all packages
```

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Production Deployment (Coming Next)
See [DEPLOYMENT.md](./DEPLOYMENT.md) for container, cloud platform, and CI/CD setup.

---

## 📂 Project Structure

```
Great-Idea/
├── artifacts/
│   ├── api-server/      # Express backend
│   ├── ikodi/           # React frontend
│   └── mockup-sandbox/  # UI component preview
├── lib/
│   ├── db/              # Database schema & migrations (Drizzle)
│   ├── api-spec/        # OpenAPI specification
│   ├── api-client-react/# Auto-generated API client
│   └── api-zod/         # Zod schema validation
└── scripts/
    └── seed.ts          # Database seeding script
```

---

## 🆘 Troubleshooting

### DATABASE_URL not set
```
Error: DATABASE_URL must be set. Did you forget to provision a database?
```
**Solution:** Add `DATABASE_URL` to `.env` file (see Step 2)

### Connection refused on port 5432
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** 
- Ensure local PostgreSQL is running (`pnpm run db:up`)
- Verify DATABASE_URL points to the correct host and port
- Check password doesn't have special characters (URL encode if needed)

### Port already in use
```
Error: listen EADDRINUSE :::3001
```
**Solution:** Kill process on port 3001:
```bash
# macOS/Linux
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Tests failing
```
npm run test
```
Ensure:
1. TEST_DATABASE_URL is set in `.env`
2. Test database is accessible
3. Run `pnpm run push` to migrate test database

---

## 📊 Key Commands

| Command | Purpose |
|---------|---------|
| `pnpm run build` | Build all packages for production |
| `pnpm run typecheck` | Type-check TypeScript |
| `pnpm run test` | Run test suite |
| `pnpm -r --if-present run dev` | Start all services in dev mode (via monorepo) |
| `cd lib/db && pnpm run push` | Apply database migrations |
| `pnpm run seed` | Populate database with test data |

---

## ✅ Verification Checklist

- [ ] DATABASE_URL configured and accessible
- [ ] Database migrations applied (`pnpm run push`)
- [ ] Seed data loaded (`pnpm run seed`)
- [ ] Backend running on http://localhost:3001
- [ ] Frontend running on http://localhost:5173
- [ ] Can log in with admin@ikodi.local / Admin@123456
- [ ] Tests pass (`pnpm run test`)
- [ ] SMS service configured (Twilio) [Optional]

Once all checks pass, the system is ready for use! 🎉
