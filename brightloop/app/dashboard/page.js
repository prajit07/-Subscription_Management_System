"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return router.replace("/login");
    if (session.user.role === "customer") return router.replace("/portal");
    fetch("/api/stats").then(r => r.json()).then(setStats);
  }, [session, status, router]);

  if (!stats) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-header-sub">Overview of your subscription business</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon">📋</div>
          <div className="stat-value">{stats.activeSubs}</div>
          <div className="stat-label">Active Subscriptions</div>
        </div>
        <div className="stat-card violet">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats.totalSubs}</div>
          <div className="stat-label">Total Subscriptions</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-icon">📦</div>
          <div className="stat-value">{stats.products}</div>
          <div className="stat-label">Products</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{stats.customers}</div>
          <div className="stat-label">Customers</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{fmt(stats.totalRevenue)}</div>
          <div className="stat-label">Total Invoiced</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{fmt(stats.paid)}</div>
          <div className="stat-label">Paid</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">⏳</div>
          <div className="stat-value">{fmt(stats.outstanding)}</div>
          <div className="stat-label">Outstanding</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">⚠</div>
          <div className="stat-value">{stats.overdueCount}</div>
          <div className="stat-label">Overdue (&gt;30d)</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title"><span className="card-title-icon">🧾</span> Recent Invoices</div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentInvoices.length === 0 && (
                <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">📭</div><div className="empty-state-text">No invoices yet</div></div></td></tr>
              )}
              {stats.recentInvoices.map(i => (
                <tr key={i.id}>
                  <td><Link href={`/invoices/${i.id}`}>{i.number}</Link></td>
                  <td>{i.customerName}</td>
                  <td>{new Date(i.date).toLocaleDateString()}</td>
                  <td>{fmt(i.total)}</td>
                  <td><span className={`badge ${i.state}`}>{i.state}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title"><span className="card-title-icon">⚡</span> Quick Actions</div>
        <div className="btn-group">
          <button
            className="btn btn-success"
            onClick={async () => {
              const res = await fetch("/api/billing", { method: "POST" });
              const data = await res.json();
              alert(`Billing run complete! ${data.created} invoices created.`);
              fetch("/api/stats").then(r => r.json()).then(setStats);
            }}
          >
            🔄 Run Billing
          </button>
          <Link href="/subscriptions/new" className="btn btn-primary">
            ➕ New Subscription
          </Link>
          <Link href="/reports" className="btn btn-secondary">
            📈 View Reports
          </Link>
        </div>
      </div>
    </>
  );
}
