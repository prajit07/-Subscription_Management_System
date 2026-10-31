import os
import json
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import FastAPI, Request, Depends, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import Base, engine, get_db, SessionLocal
from models import (
    User, Product, ProductVariant, Tax, RecurringPlan, QuotationTemplate,
    Subscription, SubscriptionLine, Invoice, InvoiceLine, Payment, Discount,
)
from auth import (
    hash_password, verify_password, validate_password, create_access_token, decode_token,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Subscription Management System")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")


# ---------- helpers ----------

def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    try:
        uid = int(payload.get("sub"))
    except (TypeError, ValueError):
        return None
    user = db.query(User).filter(User.id == uid).first()
    return user


def require_user(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=303, headers={"Location": "/login"})
    return user


def require_role(request: Request, db: Session = Depends(get_db), roles=None):
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=303, headers={"Location": "/login"})
    if roles and user.role not in roles:
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


def next_number(db, prefix, model, field):
    last = db.query(model).order_by(model.id.desc()).first()
    n = (last.id if last else 0) + 1
    return f"{prefix}-{n:05d}"


def period_delta(period):
    if period == "daily":
        return timedelta(days=1)
    if period == "weekly":
        return timedelta(weeks=1)
    if period == "monthly":
        return timedelta(days=30)
    if period == "yearly":
        return timedelta(days=365)
    return timedelta(days=30)


def active_discounts(db, subscription=None, product=None):
    today = date.today()
    q = db.query(Discount).filter(Discount.active == True)
    res = []
    for d in q.all():
        if d.start_date and today < d.start_date:
            continue
        if d.end_date and today > d.end_date:
            continue
        if d.usage_limit and d.used_count >= d.usage_limit:
            continue
        if d.applies_to == "subscription" and subscription and d.subscription_id and d.subscription_id != subscription.id:
            continue
        if d.applies_to == "product" and product and d.product_id and d.product_id != product.id:
            continue
        res.append(d)
    return res


def compute_invoice_lines(sub, db):
    lines = []
    for sl in sub.lines:
        unit = sl.unit_price
        if sl.variant:
            unit = unit + sl.variant.price_extra
        amt = unit * sl.qty
        tax_amt = 0.0
        if sl.tax:
            tax_amt = amt * (sl.tax.rate / 100.0)
        lines.append({
            "description": (sl.product.name if sl.product else "Item") + (f" ({sl.variant.name})" if sl.variant else ""),
            "qty": sl.qty,
            "unit_price": unit,
            "tax_id": sl.tax_id,
            "tax_amount": tax_amt,
            "amount": amt,
        })
    return lines


def create_invoice_from_subscription(sub, db):
    inv_number = next_number(db, "INV", Invoice, "number")
    inv = Invoice(
        number=inv_number,
        subscription_id=sub.id,
        customer_id=sub.customer_id,
        date=date.today(),
        state="draft",
    )
    db.add(inv)
    db.flush()
    lines = compute_invoice_lines(sub, db)
    total = 0.0
    tax_total = 0.0
    for l in lines:
        il = InvoiceLine(
            invoice_id=inv.id,
            description=l["description"],
            qty=l["qty"],
            unit_price=l["unit_price"],
            tax_id=l["tax_id"],
            tax_amount=l["tax_amount"],
            amount=l["amount"],
        )
        db.add(il)
        total += l["amount"]
        tax_total += l["tax_amount"]
    # apply discounts
    disc_total = 0.0
    for d in active_discounts(db, subscription=sub):
        # check min qty
        total_qty = sum(sl.qty for sl in sub.lines)
        if d.min_qty and total_qty < d.min_qty:
            continue
        if d.min_purchase and total < d.min_purchase:
            continue
        if d.dtype == "percentage":
            amt = total * (d.value / 100.0)
        else:
            amt = d.value
        disc_total += amt
        dl = InvoiceLine(
            invoice_id=inv.id,
            description=f"Discount: {d.name}",
            qty=1,
            unit_price=-amt,
            tax_id=None,
            tax_amount=0.0,
            amount=-amt,
        )
        db.add(dl)
        d.used_count = (d.used_count or 0) + 1
    inv.total = total + tax_total - disc_total
    inv.tax_total = tax_total
    inv.discount_total = disc_total
    # advance next invoice date
    sub.last_invoice_date = date.today()
    sub.next_invoice_date = date.today() + period_delta(sub.plan.billing_period if sub.plan else "monthly")
    db.commit()
    db.refresh(inv)
    return inv


def seed_admin(db):
    if not db.query(User).filter(User.role == "admin").first():
        u = User(
            email="admin@brightloop.com",
            password_hash=hash_password("Admin@1234"),
            full_name="Administrator",
            role="admin",
        )
        db.add(u)
        db.commit()


# ---------- routes ----------

@app.get("/", response_class=HTMLResponse)
def home(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/login", status_code=303)
    if user.role == "customer":
        return RedirectResponse("/portal", status_code=303)
    return RedirectResponse("/dashboard", status_code=303)


@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return templates.TemplateResponse(request, "login.html")


@app.post("/login")
def login(request: Request, email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        return templates.TemplateResponse(request, "login.html", {"error": "Invalid credentials"})
    token = create_access_token({"sub": str(user.id), "role": user.role})
    resp = RedirectResponse("/", status_code=303)
    resp.set_cookie("access_token", token, httponly=True)
    return resp


@app.get("/register", response_class=HTMLResponse)
def register_page(request: Request):
    return templates.TemplateResponse(request, "register.html")


@app.post("/register")
def register(request: Request, email: str = Form(...), full_name: str = Form(...),
            password: str = Form(...), db: Session = Depends(get_db)):
    if not validate_password(password):
        return templates.TemplateResponse(request, "register.html", {"error": "Password must be >8 chars with upper, lower, special"})
    if db.query(User).filter(User.email == email).first():
        return templates.TemplateResponse(request, "register.html", {"error": "Email already registered"})
    u = User(email=email, full_name=full_name, password_hash=hash_password(password), role="customer")
    db.add(u)
    db.commit()
    return RedirectResponse("/login", status_code=303)


@app.get("/logout")
def logout():
    resp = RedirectResponse("/login", status_code=303)
    resp.delete_cookie("access_token")
    return resp


@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request, db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    active_subs = db.query(Subscription).filter(Subscription.state == "active").count()
    total_subs = db.query(Subscription).count()
    invoices = db.query(Invoice).all()
    total_revenue = sum(i.total for i in invoices if i.state in ("confirmed", "paid"))
    paid = sum(i.total for i in invoices if i.state == "paid")
    outstanding = sum(i.total for i in invoices if i.state in ("draft", "confirmed"))
    overdue = [i for i in invoices if i.state in ("draft", "confirmed")]
    # overdue = confirmed invoices older than 30 days
    overdue_count = len([i for i in invoices if i.state == "confirmed" and (date.today() - i.date).days > 30])
    products = db.query(Product).count()
    customers = db.query(User).filter(User.role == "customer").count()
    recent_invoices = db.query(Invoice).order_by(Invoice.id.desc()).limit(10).all()
    return templates.TemplateResponse(request, "dashboard.html", {
        "user": user,
        "active_subs": active_subs, "total_subs": total_subs,
        "total_revenue": round(total_revenue, 2), "paid": round(paid, 2),
        "outstanding": round(outstanding, 2), "overdue_count": overdue_count,
        "products": products, "customers": customers,
        "recent_invoices": recent_invoices,
    })


# ---------- users (admin) ----------
@app.get("/users", response_class=HTMLResponse)
def users_page(request: Request, db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin"])
    users = db.query(User).all()
    return templates.TemplateResponse(request, "users.html", {"user": user, "users": users})


@app.post("/users/add_staff")
def add_staff(request: Request, email: str = Form(...), full_name: str = Form(...),
              password: str = Form(...), db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin"])
    if not validate_password(password):
        raise HTTPException(400, "weak password")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "email exists")
    u = User(email=email, full_name=full_name, password_hash=hash_password(password), role="staff")
    db.add(u)
    db.commit()
    return RedirectResponse("/users", status_code=303)


# ---------- products ----------
@app.get("/products", response_class=HTMLResponse)
def products_page(request: Request, db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    products = db.query(Product).all()
    return templates.TemplateResponse(request, "products.html", {"user": user, "products": products})


@app.post("/products/create")
def product_create(request: Request, name: str = Form(...), ptype: str = Form("software"),
                   sales_price: float = Form(0), cost_price: float = Form(0),
                   notes: str = Form(""), db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    p = Product(name=name, ptype=ptype, sales_price=sales_price, cost_price=cost_price, notes=notes)
    db.add(p)
    db.commit()
    return RedirectResponse("/products", status_code=303)


@app.post("/products/{pid}/variant")
def product_variant(request: Request, pid: int, name: str = Form(...), price_extra: float = Form(0),
                    db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    v = ProductVariant(product_id=pid, name=name, price_extra=price_extra)
    db.add(v)
    db.commit()
    return RedirectResponse("/products", status_code=303)


# ---------- taxes ----------
@app.get("/taxes", response_class=HTMLResponse)
def taxes_page(request: Request, db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin"])
    taxes = db.query(Tax).all()
    return templates.TemplateResponse(request, "taxes.html", {"user": user, "taxes": taxes})


@app.post("/taxes/create")
def tax_create(request: Request, name: str = Form(...), rate: float = Form(0), db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin"])
    t = Tax(name=name, rate=rate)
    db.add(t)
    db.commit()
    return RedirectResponse("/taxes", status_code=303)


# ---------- plans ----------
@app.get("/plans", response_class=HTMLResponse)
def plans_page(request: Request, db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    plans = db.query(RecurringPlan).all()
    products = db.query(Product).all()
    return templates.TemplateResponse(request, "plans.html", {"user": user, "plans": plans, "products": products})


@app.post("/plans/create")
def plan_create(request: Request, name: str = Form(...), product_id: int = Form(None),
                price: float = Form(0), billing_period: str = Form("monthly"),
                min_qty: int = Form(1), auto_close: bool = Form(False),
                closable: bool = Form(True), pausable: bool = Form(False),
                renewable: bool = Form(True), db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin"])
    p = RecurringPlan(name=name, product_id=product_id or None, price=price,
                      billing_period=billing_period, min_qty=min_qty, auto_close=auto_close,
                      closable=closable, pausable=pausable, renewable=renewable)
    db.add(p)
    db.commit()
    return RedirectResponse("/plans", status_code=303)


# ---------- discounts ----------
@app.get("/discounts", response_class=HTMLResponse)
def discounts_page(request: Request, db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin"])
    discounts = db.query(Discount).all()
    products = db.query(Product).all()
    subs = db.query(Subscription).all()
    return templates.TemplateResponse(request, "discounts.html", {"user": user,
        "discounts": discounts, "products": products, "subs": subs})


@app.post("/discounts/create")
def discount_create(request: Request, name: str = Form(...), dtype: str = Form("percentage"),
                    value: float = Form(0), min_qty: int = Form(0), min_purchase: float = Form(0),
                    start_date: str = Form(""), end_date: str = Form(""), usage_limit: int = Form(0),
                    applies_to: str = Form("all"), product_id: int = Form(None),
                    subscription_id: int = Form(None), db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin"])
    sd = date.fromisoformat(start_date) if start_date else None
    ed = date.fromisoformat(end_date) if end_date else None
    d = Discount(name=name, dtype=dtype, value=value, min_qty=min_qty, min_purchase=min_purchase,
                 start_date=sd, end_date=ed, usage_limit=usage_limit, applies_to=applies_to,
                 product_id=product_id or None, subscription_id=subscription_id or None)
    db.add(d)
    db.commit()
    return RedirectResponse("/discounts", status_code=303)


# ---------- quotation templates ----------
@app.get("/templates", response_class=HTMLResponse)
def templates_page(request: Request, db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    tpls = db.query(QuotationTemplate).all()
    plans = db.query(RecurringPlan).all()
    products = db.query(Product).all()
    return templates.TemplateResponse(request, "templates.html", {"user": user,
        "templates": tpls, "plans": plans, "products": products})


@app.post("/templates/create")
def template_create(request: Request, name: str = Form(...), plan_id: int = Form(None),
                    validity_days: int = Form(30), lines_json: str = Form("[]"),
                    db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    t = QuotationTemplate(name=name, plan_id=plan_id or None, validity_days=validity_days, lines_json=lines_json)
    db.add(t)
    db.commit()
    return RedirectResponse("/templates", status_code=303)


# ---------- subscriptions ----------
@app.get("/subscriptions", response_class=HTMLResponse)
def subs_page(request: Request, state: str = "", db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    q = db.query(Subscription)
    if state:
        q = q.filter(Subscription.state == state)
    subs = q.order_by(Subscription.id.desc()).all()
    return templates.TemplateResponse(request, "subscriptions.html", {"user": user,
        "subs": subs, "state": state})


@app.get("/subscriptions/new", response_class=HTMLResponse)
def sub_new_page(request: Request, template_id: int = None, db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    customers = db.query(User).filter(User.role == "customer").all()
    plans = db.query(RecurringPlan).all()
    products = db.query(Product).all()
    variants = db.query(ProductVariant).all()
    taxes = db.query(Tax).all()
    tpls = db.query(QuotationTemplate).all()
    selected_tpl = None
    if template_id:
        selected_tpl = db.query(QuotationTemplate).filter(QuotationTemplate.id == template_id).first()
    return templates.TemplateResponse(request, "subscription_new.html", {"user": user,
        "customers": customers, "plans": plans, "products": products, "variants": variants,
        "taxes": taxes, "templates": tpls, "selected_tpl": selected_tpl, "today": date.today().isoformat()})


@app.post("/subscriptions/create")
def sub_create(request: Request, customer_id: int = Form(...), plan_id: int = Form(None),
               start_date: str = Form(""), expiry_date: str = Form(""), payment_terms: str = Form(""),
               lines_json: str = Form("[]"), db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    sd = date.fromisoformat(start_date) if start_date else date.today()
    ed = date.fromisoformat(expiry_date) if expiry_date else None
    plan = db.query(RecurringPlan).filter(RecurringPlan.id == plan_id).first() if plan_id else None
    sub = Subscription(
        number=next_number(db, "SUB", Subscription, "number"),
        customer_id=customer_id,
        plan_id=plan_id or None,
        start_date=sd,
        expiry_date=ed,
        payment_terms=payment_terms,
        state="draft",
        recurring_price=plan.price if plan else 0,
        next_invoice_date=sd,
    )
    db.add(sub)
    db.flush()
    try:
        lines = json.loads(lines_json)
    except Exception:
        lines = []
    for l in lines:
        sl = SubscriptionLine(
            subscription_id=sub.id,
            product_id=l.get("product_id"),
            variant_id=l.get("variant_id") or None,
            qty=l.get("qty", 1),
            unit_price=l.get("unit_price", 0),
            tax_id=l.get("tax_id") or None,
            amount=l.get("qty", 1) * l.get("unit_price", 0),
        )
        db.add(sl)
    db.commit()
    return RedirectResponse(f"/subscriptions/{sub.id}", status_code=303)


@app.get("/subscriptions/{sid}", response_class=HTMLResponse)
def sub_detail(request: Request, sid: int, db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    sub = db.query(Subscription).filter(Subscription.id == sid).first()
    if not sub:
        raise HTTPException(404)
    invoices = db.query(Invoice).filter(Invoice.subscription_id == sid).all()
    return templates.TemplateResponse(request, "subscription_detail.html", {"user": user,
        "sub": sub, "invoices": invoices})


@app.post("/subscriptions/{sid}/state")
def sub_state(request: Request, sid: int, new_state: str = Form(...), close_reason: str = Form(""),
              db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    sub = db.query(Subscription).filter(Subscription.id == sid).first()
    if not sub:
        raise HTTPException(404)
    sub.state = new_state
    if new_state == "closed":
        sub.close_reason = close_reason
        if sub.plan and sub.plan.auto_close:
            pass
    db.commit()
    return RedirectResponse(f"/subscriptions/{sid}", status_code=303)


# ---------- invoices ----------
@app.get("/invoices", response_class=HTMLResponse)
def invoices_page(request: Request, state: str = "", db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    q = db.query(Invoice)
    if state:
        q = q.filter(Invoice.state == state)
    invs = q.order_by(Invoice.id.desc()).all()
    return templates.TemplateResponse(request, "invoices.html", {"user": user, "invoices": invs, "state": state})


@app.get("/invoices/{iid}", response_class=HTMLResponse)
def invoice_detail(request: Request, iid: int, db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    inv = db.query(Invoice).filter(Invoice.id == iid).first()
    if not inv:
        raise HTTPException(404)
    return templates.TemplateResponse(request, "invoice_detail.html", {"user": user, "inv": inv})


@app.post("/invoices/{iid}/confirm")
def invoice_confirm(request: Request, iid: int, db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    inv = db.query(Invoice).filter(Invoice.id == iid).first()
    inv.state = "confirmed"
    db.commit()
    return RedirectResponse(f"/invoices/{iid}", status_code=303)


@app.post("/invoices/{iid}/cancel")
def invoice_cancel(request: Request, iid: int, db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    inv = db.query(Invoice).filter(Invoice.id == iid).first()
    inv.state = "cancelled"
    db.commit()
    return RedirectResponse(f"/invoices/{iid}", status_code=303)


@app.post("/invoices/{iid}/pay")
def invoice_pay(request: Request, iid: int, method: str = Form("cash"), amount: float = Form(0),
                note: str = Form(""), db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    inv = db.query(Invoice).filter(Invoice.id == iid).first()
    amt = amount if amount > 0 else inv.total
    pay = Payment(invoice_id=inv.id, method=method, amount=amt, note=note, date=date.today())
    db.add(pay)
    # check if fully paid
    paid_sum = sum(p.amount for p in inv.payments) + amt
    if paid_sum >= inv.total - 0.001:
        inv.state = "paid"
    db.commit()
    return RedirectResponse(f"/invoices/{iid}", status_code=303)


# ---------- billing run ----------
@app.post("/billing/run")
def billing_run(request: Request, db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    today = date.today()
    subs = db.query(Subscription).filter(Subscription.state == "active").all()
    created = 0
    for sub in subs:
        if sub.next_invoice_date and sub.next_invoice_date <= today:
            # idempotency: skip if invoice already for this date window
            existing = db.query(Invoice).filter(
                Invoice.subscription_id == sub.id,
                Invoice.date == today,
            ).first()
            if existing:
                continue
            create_invoice_from_subscription(sub, db)
            created += 1
    return RedirectResponse(f"/invoices?created={created}", status_code=303)


# ---------- portal (customer) ----------
@app.get("/portal", response_class=HTMLResponse)
def portal(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/login", status_code=303)
    subs = db.query(Subscription).filter(Subscription.customer_id == user.id).all()
    invoices = db.query(Invoice).filter(Invoice.customer_id == user.id).all()
    return templates.TemplateResponse(request, "portal.html", {"user": user,
        "subs": subs, "invoices": invoices})


# ---------- reports ----------
@app.get("/reports", response_class=HTMLResponse)
def reports_page(request: Request, db: Session = Depends(get_db)):
    user = require_role(request, db, ["admin", "staff"])
    active_subs = db.query(Subscription).filter(Subscription.state == "active").all()
    # MRR calc
    mrr = 0.0
    for s in active_subs:
        price = s.recurring_price or (s.plan.price if s.plan else 0)
        if s.plan and s.plan.billing_period == "yearly":
            mrr += price / 12.0
        elif s.plan and s.plan.billing_period == "weekly":
            mrr += price * 4.33
        elif s.plan and s.plan.billing_period == "daily":
            mrr += price * 30
        else:
            mrr += price
    invoices = db.query(Invoice).all()
    total_invoiced = sum(i.total for i in invoices)
    total_paid = sum(i.total for i in invoices if i.state == "paid")
    outstanding = sum(i.total for i in invoices if i.state in ("draft", "confirmed"))
    overdue = [i for i in invoices if i.state == "confirmed" and (date.today() - i.date).days > 30]
    return templates.TemplateResponse(request, "reports.html", {"user": user,
        "active_count": len(active_subs), "mrr": round(mrr, 2), "arr": round(mrr * 12, 2),
        "total_invoiced": round(total_invoiced, 2), "total_paid": round(total_paid, 2),
        "outstanding": round(outstanding, 2), "overdue": overdue})


# ---------- api json (for speed) ----------
@app.get("/api/stats")
def api_stats(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(401)
    active = db.query(Subscription).filter(Subscription.state == "active").count()
    return {"active_subscriptions": active}


# seed admin on startup
@app.on_event("startup")
def startup():
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
