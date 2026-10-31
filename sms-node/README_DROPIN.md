# SMS Node — Windows Run Guide

## Prerequisites
- Node.js 18+ (https://nodejs.org) — provides node and npm
- PostgreSQL 15+ running locally (port 5432)

## Setup
```powershell
# 1. Create database
$env:PGPASSWORD = "yourpassword"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE subscription_mgmt;"

# 2. Configure env
cd C:\path\to\sms-node
copy .env.example .env
# edit .env: DB_PASSWORD, JWT_SECRET

# 3. Install
cd backend; npm install
cd ..\frontend; npm install

# 4. Migrate + seed
cd ..
node database/migrate.js
node database/seed.js

# 5. Run (two terminals)
cd backend; node server.js          # http://localhost:4000
cd frontend; npm run dev            # http://localhost:3000
```

Demo login: admin@brightloop.com / Admin@1234!
```