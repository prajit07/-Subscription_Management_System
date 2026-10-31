"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function CustomerPortalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return router.replace("/login");

    fetch("/api/portal")
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session, status, router]);

  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n || 0);

  const stateBadges = {
    draft: "badge-draft",
    confirmed: "badge-confirmed",
    in_progress: "badge-confirmed",
    paused: "badge-paused",
    closed: "badge-closed",
    paid: "badge-paid",
    posted: "badge-confirmed",
    cancelled: "badge-closed",
  };

  if (loading || !data) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const activeSubs = data.subs.filter(s => ["active", "confirmed", "in_progress"].includes(s.state));
  const unpaidInvoices = data.invoices.filter(i => i.state !== "paid" && i.state !== "cancelled");

  return (
    <>
      <div className="page-header">
        <h1>Welcome, {session.user.name}</h1>
        <p className="page-header-sub">Manage your active subscriptions, billing history, and invoices</p>
      </div>

      <div className="stats-grid mb-6">
        <div className="stat-card blue">
          <div className="stat-icon">📦</div>
          <div className="stat-value">{activeSubs.length}</div>
          <div className="stat-label">Active Subscriptions</div>
        </div>

        <div className="stat-card violet">
          <div className="stat-icon">🧾</div>
          <div className="stat-value">{data.invoices.length}</div>
          <div className="stat-label">Total Invoices</div>
        </div>

        <div className="stat-card orange">
          <div className="stat-icon">⏳</div>
          <div className="stat-value">{unpaidInvoices.length}</div>
          <div className="stat-label">Pending Payment</div>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="text-lg font-bold text-primary mb-4">My Subscriptions</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Plan Name</th>
                <th>Cadence</th>
                <th>Recurring Fee</th>
                <th>Next Renewal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.subs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-secondary py-8">
                    You do not have any subscription contracts yet.
                  </td>
                </tr>
              ) : (
                data.subs.map(s => (
                  <tr key={s.id}>
                    <td className="font-bold text-primary">{s.number}</td>
                    <td className="font-semibold text-primary">{s.plan?.name || "Custom Subscription"}</td>
                    <td className="capitalize text-secondary">{s.plan?.billingPeriod || "Monthly"}</td>
                    <td className="font-bold text-primary">{fmt(s.recurringPrice)}</td>
                    <td className="text-secondary">
                      {s.nextInvoiceDate ? new Date(s.nextInvoiceDate).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <span className={`badge ${stateBadges[s.state] || "badge-draft"} capitalize`}>
                        {s.state.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-bold text-primary mb-4">Billing & Invoices</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-secondary py-8">
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                data.invoices.map(inv => (
                  <tr key={inv.id}>
                    <td className="font-bold text-primary">{inv.number}</td>
                    <td className="text-secondary">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="font-bold text-primary">{fmt(inv.total)}</td>
                    <td>
                      <span className={`badge ${stateBadges[inv.state] || "badge-draft"} capitalize`}>
                        {inv.state}
                      </span>
                    </td>
                    <td>
                      <Link href={`/invoices/${inv.id}`} className="btn btn-secondary text-xs py-1 px-3">
                        View & Pay
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
