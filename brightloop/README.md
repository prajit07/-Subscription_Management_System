# ⚡ Brightloop — Enterprise Subscription Management Platform

Brightloop is a full-featured subscription lifecycle, automated recurring billing, and quotation management application inspired by Odoo Subscriptions, re-engineered for modern cloud hosting with **Next.js 14/16 App Router**, **Prisma ORM**, and **Vercel**.

---

## 🌟 Key Features

1. **Role-Based Access Control**:
   - **Administrator**: Full system access, staff management, pricing, taxes, discounts, quotation templates, financial metrics.
   - **Staff**: Manage products, recurring plans, generate & review subscriptions, issue invoices, run automated billing.
   - **Customer Portal**: Self-service subscription overview, renewal timelines, printable PDF invoices, payment tracking.
2. **Subscription Lifecycle Management**:
   - Draft → Confirmed / In Progress → Paused → Closed state machine.
   - Multi-line contract configuration with product variants, custom quantities, and tax rates.
3. **Automated Recurring Billing Engine**:
   - One-click or scheduled recurring invoice generation for due contracts.
   - Automated renewal date increments (daily, weekly, monthly, yearly).
4. **Financial Invoicing & Payment Processing**:
   - Printable invoices with company branding, tax breakdown, and itemization.
   - Payment registration (Cards, Bank Transfer / NEFT, UPI, Cash).
5. **Analytics & Reports**:
   - MRR (Monthly Recurring Revenue) & ARR calculations.
   - Cash collection rate progress and 30-day overdue tracking.
6. **Premium Glassmorphic UI**:
   - Deep space dark palette, glowing accents, responsive sidebar navigation, mobile drawer.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+ installed
- PostgreSQL database (Free tier on [Neon](https://neon.tech), [Supabase](https://supabase.com), or local Postgres)

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Fill in your database URL and NextAuth secret:
```env
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/brightloop?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/brightloop?sslmode=require"
NEXTAUTH_SECRET="your-generated-secret-string"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Setup Database Schema & Seed Data
```bash
# Push Prisma schema to your PostgreSQL database
npm run db:push

# Populate demo users, products, plans, subscriptions, and invoices
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@brightloop.io` | `Admin@12345` |
| **Staff** | `staff@brightloop.io` | `Staff@12345` |
| **Customer** | `acme@corp.com` | `Customer@123` |
| **Customer** | `stark@industries.com` | `Customer@123` |

---

## ☁️ Deploying to Vercel

### Step 1: Create a Free PostgreSQL Database on Neon
1. Go to [Neon.tech](https://neon.tech) and create a free project named `brightloop`.
2. In the Neon dashboard, copy both the **Pooled Connection String** and **Direct Connection String**.

### Step 2: Push Your Code to GitHub
```bash
git init
git add .
git commit -m "feat: complete brightloop subscription platform"
git branch -M main
git remote add origin https://github.com/your-username/brightloop.git
git push -u origin main
```

### Step 3: Import Project to Vercel
1. Go to [Vercel](https://vercel.com) and click **"Add New..." → "Project"**.
2. Select your `brightloop` repository.
3. In **Environment Variables**, add:
   - `DATABASE_URL`: Your Neon Pooled connection string
   - `DIRECT_URL`: Your Neon Direct connection string
   - `NEXTAUTH_SECRET`: A 32+ character random secret (e.g. `openssl rand -base64 32`)
   - `NEXTAUTH_URL`: Your production Vercel URL (e.g. `https://brightloop.vercel.app`)
4. Click **Deploy**. Vercel will automatically run `npm run postinstall` (`prisma generate`) and build the project cleanly!
5. After deployment, push and seed your production database once:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
