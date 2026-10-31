"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PlansPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    productId: "",
    price: "",
    billingPeriod: "monthly",
    minQty: 1,
    closable: true,
    pausable: true,
    renewable: true,
    autoClose: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return router.replace("/login");
    if (!["admin", "staff"].includes(session.user.role)) return router.replace("/portal");
    loadData();
  }, [session, status, router]);

  async function loadData() {
    try {
      const [resPlans, resProducts] = await Promise.all([
        fetch("/api/plans"),
        fetch("/api/products"),
      ]);
      if (resPlans.ok) setPlans(await resPlans.json());
      if (resProducts.ok) setProducts(await resProducts.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({
          name: "",
          productId: "",
          price: "",
          billingPeriod: "monthly",
          minQty: 1,
          closable: true,
          pausable: true,
          renewable: true,
          autoClose: false,
        });
        loadData();
      }
    } finally {
      setSaving(false);
    }
  }

  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n || 0);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const isAdmin = session?.user?.role === "admin";

  return (
    <>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Recurring Plans</h1>
          <p className="page-header-sub">Subscription tiers, cadences, and automated billing rules</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <span>+ Create Plan</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(p => (
          <div key={p.id} className="card relative overflow-hidden flex flex-col justify-between">
            <div className="mb-4">
              <div className="flex justify-between items-start mb-2">
                <span className="badge badge-confirmed capitalize">{p.billingPeriod}</span>
                <span className="text-xs text-muted">ID #{p.id}</span>
              </div>
              <h3 className="text-xl font-bold text-primary mb-1">{p.name}</h3>
              {p.product && (
                <p className="text-xs text-secondary mb-3">
                  Product: <span className="text-primary font-medium">{p.product.name}</span>
                </p>
              )}
              <div className="text-3xl font-extrabold text-primary mb-4">
                {fmt(p.price)}
                <span className="text-xs font-normal text-secondary"> /{p.billingPeriod}</span>
              </div>
              <div className="space-y-2 text-sm text-secondary border-t border-glass pt-3">
                <div className="flex justify-between">
                  <span>Min Quantity:</span>
                  <span className="text-primary font-medium">{p.minQty}</span>
                </div>
                <div className="flex justify-between">
                  <span>Renewable:</span>
                  <span className={p.renewable ? "text-success font-medium" : "text-muted"}>
                    {p.renewable ? "✓ Yes" : "✕ No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pausable:</span>
                  <span className={p.pausable ? "text-success font-medium" : "text-muted"}>
                    {p.pausable ? "✓ Yes" : "✕ No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Customer Closable:</span>
                  <span className={p.closable ? "text-success font-medium" : "text-muted"}>
                    {p.closable ? "✓ Yes" : "✕ No"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {plans.length === 0 && (
          <div className="card text-center text-secondary py-12 col-span-3">
            No recurring plans found. Click "+ Create Plan" to set one up.
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Recurring Plan</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Plan Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pro Monthly, Enterprise Annual"
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Base Product</label>
                    <select
                      className="form-select"
                      value={form.productId}
                      onChange={e => setForm({ ...form, productId: e.target.value })}
                    >
                      <option value="">-- Optional --</option>
                      {products.map(pr => (
                        <option key={pr.id} value={pr.id}>{pr.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Billing Cadence</label>
                    <select
                      className="form-select"
                      value={form.billingPeriod}
                      onChange={e => setForm({ ...form, billingPeriod: e.target.value })}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Price per cycle (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 1999"
                      className="form-input"
                      value={form.price}
                      onChange={e => setForm({ ...form, price: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min Quantity</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={form.minQty}
                      onChange={e => setForm({ ...form, minQty: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.closable}
                      onChange={e => setForm({ ...form, closable: e.target.checked })}
                    />
                    <span>Customer Closable</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.pausable}
                      onChange={e => setForm({ ...form, pausable: e.target.checked })}
                    />
                    <span>Pausable</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.renewable}
                      onChange={e => setForm({ ...form, renewable: e.target.checked })}
                    />
                    <span>Auto-Renewable</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.autoClose}
                      onChange={e => setForm({ ...form, autoClose: e.target.checked })}
                    />
                    <span>Auto-close on expire</span>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
