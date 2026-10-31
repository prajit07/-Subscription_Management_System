"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    planId: "",
    validityDays: 30,
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
      const [resTemplates, resPlans] = await Promise.all([
        fetch("/api/templates"),
        fetch("/api/plans"),
      ]);
      if (resTemplates.ok) setTemplates(await resTemplates.json());
      if (resPlans.ok) setPlans(await resPlans.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ name: "", planId: "", validityDays: 30 });
        loadData();
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
          <h1>Quotation Templates</h1>
          <p className="page-header-sub">Pre-configured bundles for sales quotes and client onboarding</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <span>+ Create Template</span>
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Template Name</th>
                <th>Associated Recurring Plan</th>
                <th>Validity (Days)</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center text-secondary py-8">
                    No quotation templates configured yet.
                  </td>
                </tr>
              ) : (
                templates.map(t => (
                  <tr key={t.id}>
                    <td>#{t.id}</td>
                    <td className="font-semibold text-primary">{t.name}</td>
                    <td>
                      {t.plan ? (
                        <span className="badge badge-confirmed">{t.plan.name}</span>
                      ) : (
                        <span className="text-secondary text-sm">Custom / None</span>
                      )}
                    </td>
                    <td>{t.validityDays} days</td>
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
              <h2 className="modal-title">New Quotation Template</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Template Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Standard SaaS Monthly Onboarding"
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Default Plan</label>
                    <select
                      className="form-select"
                      value={form.planId}
                      onChange={e => setForm({ ...form, planId: e.target.value })}
                    >
                      <option value="">-- No linked plan --</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quote Validity (Days)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      className="form-input"
                      value={form.validityDays}
                      onChange={e => setForm({ ...form, validityDays: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
