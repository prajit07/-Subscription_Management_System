CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('admin','staff','customer');
CREATE TYPE product_type AS ENUM ('subscription','one_time','addon');
CREATE TYPE billing_frequency AS ENUM ('daily','weekly','monthly','yearly');
CREATE TYPE discount_type AS ENUM ('fixed','percentage');
CREATE TYPE discount_scope AS ENUM ('product','subscription');
CREATE TYPE subscription_state AS ENUM ('draft','sent','confirmed','active','closed');
CREATE TYPE invoice_state AS ENUM ('draft','confirmed','sent','paid','cancelled');
CREATE TYPE payment_method AS ENUM ('credit_card','bank_transfer','upi','wallet','cash');
CREATE TYPE payment_status AS ENUM ('pending','completed','failed','refunded');

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  reset_token VARCHAR(255),
  reset_token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type product_type NOT NULL DEFAULT 'subscription',
  base_price NUMERIC(12,2) NOT NULL,
  cost_price NUMERIC(12,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute VARCHAR(100) NOT NULL,
  value VARCHAR(100) NOT NULL,
  price_addon NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recurring_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  frequency billing_frequency NOT NULL DEFAULT 'monthly',
  price NUMERIC(12,2) NOT NULL,
  min_quantity INTEGER NOT NULL DEFAULT 1,
  available_from DATE,
  available_until DATE,
  auto_close BOOLEAN NOT NULL DEFAULT FALSE,
  closable BOOLEAN NOT NULL DEFAULT TRUE,
  upsell_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  grace_period_days INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  plan_id UUID REFERENCES recurring_plans(id),
  validity_days INTEGER NOT NULL DEFAULT 30,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_template_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES quotation_templates(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS discount_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type discount_type NOT NULL DEFAULT 'percentage',
  scope discount_scope NOT NULL DEFAULT 'subscription',
  product_id UUID REFERENCES products(id),
  value NUMERIC(10,2) NOT NULL,
  min_quantity INTEGER,
  min_purchase NUMERIC(12,2),
  start_date DATE NOT NULL,
  end_date DATE,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  rate NUMERIC(5,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES users(id),
  plan_id UUID NOT NULL REFERENCES recurring_plans(id),
  template_id UUID REFERENCES quotation_templates(id),
  state subscription_state NOT NULL DEFAULT 'draft',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  next_invoice_date DATE,
  payment_terms VARCHAR(100),
  close_reason VARCHAR(255),
  discount_rule_id UUID REFERENCES discount_rules(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(next_invoice_date, customer_id) WHERE state = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id, state);

CREATE TABLE IF NOT EXISTS subscription_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  tax_rule_id UUID REFERENCES tax_rules(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  customer_id UUID NOT NULL REFERENCES users(id),
  state invoice_state NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_state ON invoices(customer_id, state, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id, state);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  description VARCHAR(500),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  customer_id UUID NOT NULL REFERENCES users(id),
  method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  amount NUMERIC(12,2) NOT NULL,
  reference_note VARCHAR(500),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id, paid_at DESC);

CREATE MATERIALIZED VIEW IF NOT EXISTS subscription_mrr_summary AS
SELECT
  DATE_TRUNC('month', s.start_date) AS month,
  COUNT(DISTINCT s.id) AS active_subscriptions,
  SUM(CASE rp.frequency WHEN 'daily' THEN sl.unit_price * sl.quantity * 30 WHEN 'weekly' THEN sl.unit_price * sl.quantity * 4.33 WHEN 'monthly' THEN sl.unit_price * sl.quantity WHEN 'yearly' THEN sl.unit_price * sl.quantity / 12 END) AS mrr,
  SUM(CASE rp.frequency WHEN 'daily' THEN sl.unit_price * sl.quantity * 30 * 12 WHEN 'weekly' THEN sl.unit_price * sl.quantity * 4.33 * 12 WHEN 'monthly' THEN sl.unit_price * sl.quantity * 12 WHEN 'yearly' THEN sl.unit_price * sl.quantity END) AS arr
FROM subscriptions s
JOIN subscription_lines sl ON sl.subscription_id = s.id
JOIN recurring_plans rp ON rp.id = s.plan_id
WHERE s.state = 'active'
GROUP BY DATE_TRUNC('month', s.start_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mrr_summary_month ON subscription_mrr_summary(month);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100),
  entity_id UUID,
  detail JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);