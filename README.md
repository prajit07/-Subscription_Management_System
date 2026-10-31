# Subscription Management System (Brightloop)

Unified subscription lifecycle, billing, payments, and revenue reporting platform built with FastAPI + SQLAlchemy + Jinja2.

## Run locally
```
pip install -r requirements.txt
python -m uvicorn main:app --reload
```
Open http://127.0.0.1:8000 — admin: admin@brightloop.com / Admin@1234

## Features
- Role-based access (admin/staff/customer portal)
- Products with variants, taxes, recurring plans
- Quotation templates, subscriptions lifecycle (Draft→Quotation→Confirmed→Active→Closed)
- Automated idempotent billing run
- Invoices, payments, discounts
- MRR/ARR reports, <2s dashboard queries
- Password policy & record-level tenant isolation
```