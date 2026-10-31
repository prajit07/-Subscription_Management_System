from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, Text, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="customer")  # admin, staff, customer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    ptype = Column(String, default="software")  # software, addon
    sales_price = Column(Float, default=0.0)
    cost_price = Column(Float, default=0.0)
    notes = Column(Text, default="")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")


class ProductVariant(Base):
    __tablename__ = "product_variants"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    name = Column(String, nullable=False)
    price_extra = Column(Float, default=0.0)
    product = relationship("Product", back_populates="variants")


class Tax(Base):
    __tablename__ = "taxes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    rate = Column(Float, default=0.0)  # percentage
    tax_type = Column(String, default="sales")


class RecurringPlan(Base):
    __tablename__ = "recurring_plans"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    price = Column(Float, default=0.0)
    billing_period = Column(String, default="monthly")  # daily,weekly,monthly,yearly
    min_qty = Column(Integer, default=1)
    date_start = Column(Date, nullable=True)
    date_end = Column(Date, nullable=True)
    auto_close = Column(Boolean, default=False)
    closable = Column(Boolean, default=True)
    pausable = Column(Boolean, default=False)
    renewable = Column(Boolean, default=True)
    product = relationship("Product")


class QuotationTemplate(Base):
    __tablename__ = "quotation_templates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    plan_id = Column(Integer, ForeignKey("recurring_plans.id"), nullable=True)
    validity_days = Column(Integer, default=30)
    lines_json = Column(Text, default="[]")  # list of {product_id, variant_id, qty, unit_price}
    plan = relationship("RecurringPlan")


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    number = Column(String, unique=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("recurring_plans.id"), nullable=True)
    start_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    payment_terms = Column(String, default="")
    state = Column(String, default="draft")  # draft, quotation, confirmed, active, closed
    close_reason = Column(String, default="")
    recurring_price = Column(Float, default=0.0)
    next_invoice_date = Column(Date, nullable=True)
    last_invoice_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    customer = relationship("User")
    plan = relationship("RecurringPlan")
    lines = relationship("SubscriptionLine", back_populates="subscription", cascade="all, delete-orphan")


class SubscriptionLine(Base):
    __tablename__ = "subscription_lines"
    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=True)
    qty = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    tax_id = Column(Integer, ForeignKey("taxes.id"), nullable=True)
    amount = Column(Float, default=0.0)
    subscription = relationship("Subscription", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")
    tax = relationship("Tax")


class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    number = Column(String, unique=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, default=date.today)
    state = Column(String, default="draft")  # draft, confirmed, paid, cancelled
    total = Column(Float, default=0.0)
    tax_total = Column(Float, default=0.0)
    discount_total = Column(Float, default=0.0)
    notes = Column(Text, default="")
    customer = relationship("User")
    subscription = relationship("Subscription")
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    description = Column(String, default="")
    qty = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    tax_id = Column(Integer, ForeignKey("taxes.id"), nullable=True)
    tax_amount = Column(Float, default=0.0)
    amount = Column(Float, default=0.0)
    invoice = relationship("Invoice", back_populates="lines")
    tax = relationship("Tax")


class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    method = Column(String, default="cash")
    amount = Column(Float, default=0.0)
    date = Column(Date, default=date.today)
    note = Column(Text, default="")
    invoice = relationship("Invoice", back_populates="payments")


class Discount(Base):
    __tablename__ = "discounts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    dtype = Column(String, default="percentage")  # fixed, percentage
    value = Column(Float, default=0.0)
    min_qty = Column(Integer, default=0)
    min_purchase = Column(Float, default=0.0)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    usage_limit = Column(Integer, default=0)  # 0 = unlimited
    used_count = Column(Integer, default=0)
    applies_to = Column(String, default="all")  # all, product, subscription
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    active = Column(Boolean, default=True)
    product = relationship("Product")
    subscription = relationship("Subscription")
