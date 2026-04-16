# IKODI Management System - Setup Guide

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ 
- pnpm (package manager)
- Supabase account (free tier available at https://supabase.com)

### 2. Database Setup (Supabase PostgreSQL)

#### Step 1: Create Supabase Project
1. Go to https://supabase.com and sign up
2. Create a new project (Free tier is fine)
3. Note your project URL and database password
4. Go to **Project Settings → Database** to find your connection string

#### Step 2: Configure Environment
```bash
# In the project root, create .env file from template
cp .env.example .env

# Edit .env and add your Supabase connection string
# DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
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

## 🔧 Email & SMS Setup (Optional)

### SendGrid (Email)
1. Sign up at https://sendgrid.com (free tier: 100 emails/day)
2. Go to **Settings → API Keys** and create an API key
3. Add to `.env`:
   ```
   SENDGRID_API_KEY=your_key_here
   SENDGRID_FROM_EMAIL=your-email@yourcompany.com
   ```

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

Communications sent through the app will now be delivered via email/SMS.

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
- Ensure DATABASE_URL uses Supabase URL, not localhost
- Verify Supabase project is running
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
- [ ] Email service configured (SendGrid) [Optional]
- [ ] SMS service configured (Twilio) [Optional]

Once all checks pass, the system is ready for use! 🎉
