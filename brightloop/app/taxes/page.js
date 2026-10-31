"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TaxesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", rate: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return router.replace("/login");
    if (session.user.role !== "admin") return router.replace("/dashboard");
    loadTaxes();
  }, [session, status, router]);

  async function loadTaxes() {
    try {
      const res = await fetch("/api/taxes");
      if (res.ok) {
        const data = await res.json();
        setTaxes(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/taxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ name: "", rate: "" });
        loadTaxes();
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
          <h1>Taxes</h1>
          <p className="page-header-sub">Configure sales tax rates applied to subscriptions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <span>+ Add Tax Rate</span>
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Rate (%)</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {taxes.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center text-secondary py-8">
                    No tax rates configured yet.
                  </td>
                </tr>
              ) : (
                taxes.map(t => (
                  <tr key={t.id}>
                    <td>#{t.id}</td>
                    <td className="font-semibold text-primary">{t.name}</td>
                    <td>
                      <span className="badge badge-draft">{t.rate}%</span>
                    </td>
                    <td className="capitalize">{t.taxType || "sales"}</td>
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
              <h2 className="modal-title">New Tax Rate</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tax Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GST 18%, VAT 5%"
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Percentage Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    placeholder="e.g. 18.0"
                    className="form-input"
                    value={form.rate}
                    onChange={e => setForm({ ...form, rate: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Tax Rate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
