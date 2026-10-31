INSERT INTO users (id, email, password_hash, full_name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@brightloop.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VkGJBBpuS', 'Admin User', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'staff@brightloop.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VkGJBBpuS', 'Sarah Staff', 'staff'),
  ('00000000-0000-0000-0000-000000000003', 'customer@acmecorp.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VkGJBBpuS', 'Acme Corp', 'customer')
ON CONFLICT (email) DO NOTHING;

INSERT INTO tax_rules (name, rate) VALUES ('GST 18%', 18.00), ('CGST 9%', 9.00), ('SGST 9%', 9.00) ON CONFLICT DO NOTHING;

INSERT INTO products (id, name, description, type, base_price, cost_price, created_by) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Business Suite', 'Core business software platform', 'subscription', 999.00, 200.00, '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'Analytics Add-on', 'Advanced analytics module', 'addon', 299.00, 50.00, '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', 'Setup & Onboarding', 'One-time onboarding service', 'one_time', 499.00, 100.00, '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (product_id, attribute, value, price_addon) VALUES
  ('20000000-0000-0000-0000-000000000001', 'brand', 'Odoo', 560.00),
  ('20000000-0000-0000-0000-000000000001', 'brand', 'Standard', 0.00),
  ('20000000-0000-0000-0000-000000000001', 'tier', 'Enterprise', 400.00),
  ('20000000-0000-0000-0000-000000000001', 'tier', 'Pro', 150.00),
  ('20000000-0000-0000-0000-000000000001', 'tier', 'Basic', 0.00)
ON CONFLICT DO NOTHING;

INSERT INTO recurring_plans (id, name, frequency, price, auto_close, closable, upsell_enabled, grace_period_days, created_by) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Monthly Basic', 'monthly', 999.00, FALSE, TRUE, TRUE, 15, '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', 'Monthly Pro', 'monthly', 1499.00, FALSE, TRUE, TRUE, 15, '00000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000003', 'Annual Enterprise', 'yearly', 14999.00, TRUE, FALSE, FALSE, 30, '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;