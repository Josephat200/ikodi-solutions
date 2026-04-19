# IKODI Management System - Deployment Guide

## 📋 Deployment Overview

This guide covers deploying the IKODI system to production environments. The system consists of:
- **Backend**: Express.js API server (Node.js)
- **Frontend**: React application (Vite)
- **Database**: PostgreSQL (project-owned / platform-managed)
- **Infrastructure**: Docker containers (optional)

---

## 🚀 Deployment Strategies

### Option 1: Docker Container Deployment (Recommended)

#### Prerequisites
- Docker and Docker Compose installed
- PostgreSQL database provisioned for the deployment target
- Environment variables prepared

#### Step 1: Create Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Runtime stage
FROM node:18-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/artifacts/api-server/dist ./dist
COPY --from=builder /app/artifacts/api-server/package.json ./

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
```

#### Step 2: Create docker-compose.yml

```yaml
version: "3.8"

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - SESSION_SECRET=${SESSION_SECRET}
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
      - TWILIO_PHONE_NUMBER=${TWILIO_PHONE_NUMBER}
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./artifacts/ikodi:/app
    command: pnpm install && pnpm run build && pnpm run preview
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://api:3001
    restart: always
```

#### Step 3: Build and Run

```bash
# Build images
docker-compose build

# Run with environment file
docker-compose --env-file .env.production up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

---

### Option 2: Railway Deployment

Railway.app is a modern platform as a service (good for Replit users):

#### Step 1: Connect Repository
1. Go to https://railway.app
2. Create new project
3. Connect your GitHub repository

#### Step 2: Add Services

**Backend Service:**
- Branch: `main`
- Root Directory: `.`
- Build Command: `pnpm install && pnpm run build`
- Start Command: `node artifacts/api-server/dist/index.mjs`
- Port: `3001`

**Frontend Service:**
- Branch: `main`
- Root Directory: `artifacts/ikodi`
- Build Command: `pnpm install && pnpm run build`
- Start Command: `pnpm run preview`
- Port: `5173`

#### Step 3: Environment Variables
Add to Railway dashboard:
```
DATABASE_URL=your_postgres_connection_string
SESSION_SECRET=change_this_to_random_value
NODE_ENV=production
TWILIO_ACCOUNT_SID=your_sid
```

---

### Option 3: Render Single-Service Deployment

This repository is configured to deploy as one Render web service.

- Use `render.yaml` blueprint in this repository.
- Render provisions the PostgreSQL database in the same app blueprint.
- Set `CORS_ORIGINS` in Render to include your Render service origin, e.g.:
```
https://ikodi-management-system.onrender.com
```
- Ensure `UPLOADS_DIR=/opt/render/project/src/uploads` is set.

---

### Option 4: Traditional VPS (AWS EC2, DigitalOcean, Linode)

#### Step 1: Server Setup
```bash
# SSH into server
ssh root@your_server_ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2 for process management
npm install -g pm2

# Install PostgreSQL client
apt install -y postgresql-client
```

#### Step 2: Deploy Application
```bash
# Clone repository
git clone <your-repo> /opt/ikodi
cd /opt/ikodi

# Install dependencies
pnpm install

# Build
pnpm run build

# Create .env file
cp .env.example .env
# Edit .env with production values

# Run migrations
cd lib/db && pnpm run push && cd ../..

# Seed data (if needed)
pnpm run seed

# Start with PM2
pm2 start artifacts/api-server/dist/index.mjs --name ikodi-api
pm2 startup
pm2 save
```

#### Step 3: Nginx Reverse Proxy
```bash
# Install Nginx
apt install -y nginx

# Create Nginx config
cat > /etc/nginx/sites-available/ikodi << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /opt/ikodi/artifacts/ikodi/dist;
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/ikodi /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### Step 4: SSL with Let's Encrypt
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

## 🔒 Production Security Checklist

- [ ] Change `SESSION_SECRET` to strong random value
- [ ] Enable HTTPS/SSL certificates
- [ ] Set up firewall (only allow ports 80, 443, 22)
- [ ] Enable database backups
- [ ] Set up monitoring and alerts
- [ ] Enable audit logging
- [ ] Rotate credentials regularly
- [ ] Set up rate limiting
- [ ] Enable CORS only for your domain
- [ ] Use environment variables for all secrets
- [ ] Set up automated security scanning
- [ ] Configure database connection pooling
- [ ] Set up log aggregation
- [ ] Enable database encryption at rest

---

## 📊 Monitoring & Maintenance

### Health Check Endpoint
```bash
curl https://your-domain.com/api/health
```

### View Logs
```bash
# PM2 logs
pm2 logs ikodi-api

# Docker logs
docker-compose logs -f api

# Nginx logs
tail -f /var/log/nginx/error.log
```

### Database Backups
1. Open the database console for your deployment platform
2. Enable automated backups or snapshots
3. Configure retention to match your recovery policy
4. Test restore procedures periodically

### Update Application
```bash
cd /opt/ikodi
git pull origin main
pnpm install
pnpm run build
pm2 restart ikodi-api
cd lib/db && pnpm run push  # Run migrations if any
```

---

## 📈 Scaling Considerations

### Horizontal Scaling
- Use load balancer (AWS ELB, Nginx)
- Run multiple API instances
- Use database connection pooling

### Vertical Scaling
- Increase server RAM/CPU
- Optimize server settings
- Enable caching (Redis)

### Database Optimization
- Add indexes for frequently queried fields
- Use read replicas
- Archive old audit logs
- Implement query caching

---

## 🆘 Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs ikodi-api

# Verify environment variables
env | grep DATABASE_URL

# Test database connection
psql $DATABASE_URL -c "SELECT 1"
```

### Database connection fails
```bash
# Verify connection string format
# postgresql://user:password@host:port/database

# Test from server
psql postgresql://user:password@host:port/database -c "SELECT version()"
```

### High memory usage
```bash
# Monitor processes
top -p $(pgrep -f "node dist/index.mjs")

# Restart application
pm2 restart ikodi-api

# Check for memory leaks
node --inspect dist/index.mjs
```

### API timeout errors
- Increase server resources
- Enable connection pooling
- Add caching layer
- Optimize database queries

---

## 📞 Support & Resources

- Documentation: See [SETUP.md](./SETUP.md)
- Issues: Check logs first, then GitHub issues
- Database: https://www.postgresql.org/docs/
- Deployment guides: https://render.com/docs

---

## Post-Deployment Checklist

- [ ] Database backups configured
- [ ] Monitoring and alerts set up
- [ ] SSL certificate valid
- [ ] API health check passing
- [ ] Frontend accessible
- [ ] SMS services configured
- [ ] User authentication working
- [ ] Audit logs being recorded
- [ ] Performance acceptable
- [ ] Documentation updated
