"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DiscountsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    dtype: "percentage",
    value: "",
    minQty: 0,
    minPurchase: 0,
    usageLimit: 0,
    appliesTo: "all",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return router.replace("/login");
    if (session.user.role !== "admin") return router.replace("/dashboard");
    loadDiscounts();
  }, [session, status, router]);

  async function loadDiscounts() {
    try {
      const res = await fetch("/api/discounts");
      if (res.ok) setDiscounts(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({
          name: "",
          dtype: "percentage",
          value: "",
          minQty: 0,
          minPurchase: 0,
          usageLimit: 0,
          appliesTo: "all",
        });
        loadDiscounts();
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Discounts & Coupons</h1>
          <p className="page-header-sub">Manage promotional discounts, volume tiers, and coupons</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <span>+ Add Discount</span>
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Discount Name</th>
                <th>Type</th>
                <th>Value</th>
                <th>Min Requirement</th>
                <th>Usage Limit</th>
              </tr>
            </thead>
            <tbody>
              {discounts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-secondary py-8">
                    No discounts configured yet.
                  </td>
                </tr>
              ) : (
                discounts.map(d => (
                  <tr key={d.id}>
                    <td>#{d.id}</td>
                    <td className="font-semibold text-primary">{d.name}</td>
                    <td>
                      <span className="badge badge-draft capitalize">{d.dtype}</span>
                    </td>
                    <td className="text-primary font-bold">
                      {d.dtype === "percentage" ? `${d.value}%` : `₹${d.value}`}
                    </td>
                    <td className="text-secondary text-sm">
                      {d.minQty > 0 && `Min Qty: ${d.minQty}`}
                      {d.minPurchase > 0 && `Min Spend: ₹${d.minPurchase}`}
                      {d.minQty === 0 && d.minPurchase === 0 && "None"}
                    </td>
                    <td className="text-secondary text-sm">
                      {d.usageLimit > 0 ? `${d.usageLimit} times` : "Unlimited"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Promotional Discount</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name / Campaign</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EARLYBIRD20, Enterprise Partner"
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Discount Type</label>
                    <select
                      className="form-select"
                      value={form.dtype}
                      onChange={e => setForm({ ...form, dtype: e.target.value })}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Value</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder={form.dtype === "percentage" ? "15" : "500"}
                      className="form-input"
                      value={form.value}
                      onChange={e => setForm({ ...form, value: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Min Purchase (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={form.minPurchase}
                      onChange={e => setForm({ ...form, minPurchase: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Usage Limit (0 = unlimited)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={form.usageLimit}
                      onChange={e => setForm({ ...form, usageLimit: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Create Discount"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
