# Drop-in additions for /home/claude/sms

Copy the contents of this folder into your existing scaffold root
(`/home/claude/sms`), overwriting `backend/server.js`.

## New backend files
- backend/routes/quotations.js   (quotation templates CRUD + apply)
- backend/routes/taxes.js        (tax rules CRUD)
- backend/routes/users.js        (admin user management)
- backend/routes/billing.js      (manual billing trigger + status)
- backend/server.js              (patched: registers the new routes)
- database/migrate.js            (runs 001_initial_schema.sql)
- database/seed.js               (runs 001_seed_data.sql)

## New frontend files
- frontend/src/App.jsx
- frontend/src/index.js
- frontend/src/pages/*.jsx      (Dashboard, Subscriptions, SubscriptionDetail, NewSubscription, Invoices, InvoiceDetail, Products, Plans, Discounts, Users, Portal)

## Run
cd /home/claude/sms
cp .env.example .env   # edit DB creds
cd backend && npm install
cd ../frontend && npm install
cd .. && node backend/database/migrate.js && node backend/database/seed.js
# terminal 1
cd backend && npm run dev
# terminal 2
cd frontend && npm start
EOF