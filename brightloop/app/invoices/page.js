"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function InvoicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [filterState, setFilterState] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return router.replace("/login");
    if (!["admin", "staff"].includes(session.user.role)) return router.replace("/portal");
    loadInvoices(filterState);
  }, [session, status, router, filterState]);

  async function loadInvoices(st) {
    setLoading(true);
    try {
      const url = st === "all" ? "/api/invoices" : `/api/invoices?state=${st}`;
      const res = await fetch(url);
      if (res.ok) setInvoices(await res.json());
    } finally {
      setLoading(false);
    }
  }

  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n || 0);

  const stateBadges = {
    draft: "badge-draft",
    confirmed: "badge-confirmed",
    posted: "badge-confirmed",
    paid: "badge-paid",
    cancelled: "badge-closed",
  };

  const totalInvoiced = invoices.reduce((acc, i) => acc + (i.total || 0), 0);
  const totalPaid = invoices.filter(i => i.state === "paid").reduce((acc, i) => acc + (i.total || 0), 0);
  const totalPending = invoices.filter(i => i.state !== "paid" && i.state !== "cancelled").reduce((acc, i) => acc + (i.total || 0), 0);

  return (
    <>
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1>Customer Invoices</h1>
          <p className="page-header-sub">Track recurring billings, payment settlements, and collections</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="stat-card blue">
          <div className="stat-icon">🧾</div>
          <div className="stat-value">{fmt(totalInvoiced)}</div>
          <div className="stat-label">Total Volume ({invoices.length} invoices)</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{fmt(totalPaid)}</div>
          <div className="stat-label">Total Collected</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">⏳</div>
          <div className="stat-value">{fmt(totalPending)}</div>
          <div className="stat-label">Pending / Unpaid</div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-2">
          {["all", "draft", "confirmed", "paid", "cancelled"].map(st => (
            <button
              key={st}
              onClick={() => setFilterState(st)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterState === st
                  ? "bg-primary text-white shadow-glow"
                  : "bg-input text-secondary hover:text-primary"
              }`}
            >
              {st === "all" ? "All Invoices" : st.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Subscription</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-secondary py-12">
                      No invoices found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  invoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="font-bold text-primary">{inv.number}</td>
                      <td className="text-secondary">{new Date(inv.date).toLocaleDateString()}</td>
                      <td>
                        <div className="font-medium text-primary">{inv.customer?.fullName || "—"}</div>
                        <div className="text-xs text-muted">{inv.customer?.email}</div>
                      </td>
                      <td>
                        {inv.subscription ? (
                          <Link
                            href={`/subscriptions/${inv.subscription.id}`}
                            className="text-xs font-semibold text-accent-blue hover:underline"
                          >
                            {inv.subscription.number}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted">Direct</span>
                        )}
                      </td>
                      <td className="font-bold text-primary">{fmt(inv.total)}</td>
                      <td>
                        <span className={`badge ${stateBadges[inv.state] || "badge-draft"} capitalize`}>
                          {inv.state}
                        </span>
                      </td>
                      <td>
                        <Link href={`/invoices/${inv.id}`} className="btn btn-secondary text-xs py-1 px-3">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
