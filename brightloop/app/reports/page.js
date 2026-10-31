"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return router.replace("/login");
    if (!["admin", "staff"].includes(session.user.role)) return router.replace("/portal");

    fetch("/api/reports")
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session, status, router]);

  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

  if (loading || !data) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const collectionRate = data.totalInvoiced > 0
    ? Math.round((data.totalPaid / data.totalInvoiced) * 100)
    : 100;

  return (
    <>
      <div className="page-header">
        <h1>Revenue & Growth Analytics</h1>
        <p className="page-header-sub">Subscription financial metrics, recurring run-rate, and cash collection</p>
      </div>

      <div className="stats-grid mb-6">
        <div className="stat-card blue">
          <div className="stat-icon">📈</div>
          <div className="stat-value">{fmt(data.mrr)}</div>
          <div className="stat-label">Monthly Recurring Revenue (MRR)</div>
        </div>

        <div className="stat-card violet">
          <div className="stat-icon">🚀</div>
          <div className="stat-value">{fmt(data.arr)}</div>
          <div className="stat-label">Annual Run Rate (ARR)</div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{data.activeCount}</div>
          <div className="stat-label">Active Contracts</div>
        </div>

        <div className="stat-card orange">
          <div className="stat-icon">⏳</div>
          <div className="stat-value">{fmt(data.outstanding)}</div>
          <div className="stat-label">Outstanding Invoices</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="text-lg font-bold text-primary mb-4">Collection Health</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-secondary">Collection Rate</span>
                <span className="font-bold text-primary">{collectionRate}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-input overflow-hidden">
                <div
                  className="h-full bg-gradient-success rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, collectionRate)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-glass">
              <div>
                <div className="text-xs text-muted uppercase tracking-wider">Total Invoiced</div>
                <div className="text-xl font-bold text-primary mt-1">{fmt(data.totalInvoiced)}</div>
              </div>
              <div>
                <div className="text-xs text-muted uppercase tracking-wider">Total Paid</div>
                <div className="text-xl font-bold text-success mt-1">{fmt(data.totalPaid)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-primary mb-4">Subscription Retention</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-glass">
              <span className="text-secondary">Active Contracts:</span>
              <span className="text-primary font-bold">{data.activeCount}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-glass">
              <span className="text-secondary">Average MRR per Account:</span>
              <span className="text-primary font-bold">
                {data.activeCount > 0 ? fmt(data.mrr / data.activeCount) : "₹0"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-secondary">Annual Projected Contract Value:</span>
              <span className="text-primary font-bold">{fmt(data.arr)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-bold text-primary mb-4">
          Overdue Invoices ({data.overdue?.length || 0})
        </h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Issued Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!data.overdue || data.overdue.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-success py-8">
                    🎉 Excellent! No invoices currently overdue past 30 days.
                  </td>
                </tr>
              ) : (
                data.overdue.map(inv => (
                  <tr key={inv.id}>
                    <td className="font-bold text-primary">{inv.number}</td>
                    <td className="text-secondary">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="font-bold text-red-400">{fmt(inv.total)}</td>
                    <td>
                      <span className="badge badge-paused">Overdue</span>
                    </td>
                    <td>
                      <Link href={`/invoices/${inv.id}`} className="btn btn-secondary text-xs py-1 px-3">
                        Follow Up
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
