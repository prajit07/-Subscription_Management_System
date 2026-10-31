"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SubscriptionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subs, setSubs] = useState([]);
  const [filterState, setFilterState] = useState("all");
  const [loading, setLoading] = useState(true);
  const [billingRunning, setBillingRunning] = useState(false);
  const [billingMsg, setBillingMsg] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return router.replace("/login");
    if (!["admin", "staff"].includes(session.user.role)) return router.replace("/portal");
    loadSubscriptions(filterState);
  }, [session, status, router, filterState]);

  async function loadSubscriptions(state) {
    setLoading(true);
    try {
      const url = state === "all" ? "/api/subscriptions" : `/api/subscriptions?state=${state}`;
      const res = await fetch(url);
      if (res.ok) setSubs(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleRunBilling() {
    setBillingRunning(true);
    setBillingMsg("");
    try {
      const res = await fetch("/api/billing", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setBillingMsg(`Billing run complete: generated ${data.invoicesGenerated || 0} invoice(s).`);
        loadSubscriptions(filterState);
      } else {
        setBillingMsg(data.error || "Failed to trigger billing run");
      }
    } catch {
      setBillingMsg("Error contacting billing service.");
    } finally {
      setBillingRunning(false);
    }
  }

  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n || 0);

  const stateBadges = {
    draft: "badge-draft",
    confirmed: "badge-confirmed",
    in_progress: "badge-confirmed",
    paused: "badge-paused",
    closed: "badge-closed",
  };

  return (
    <>
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1>Subscriptions</h1>
          <p className="page-header-sub">Manage recurring contracts, statuses, and recurring billings</p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn btn-secondary"
            onClick={handleRunBilling}
            disabled={billingRunning}
          >
            <span>{billingRunning ? "Processing..." : "⚡ Run Auto-Billing"}</span>
          </button>
          <Link href="/subscriptions/new" className="btn btn-primary">
            <span>+ New Subscription</span>
          </Link>
        </div>
      </div>

      {billingMsg && (
        <div className="mb-4 p-4 rounded-lg bg-card border border-glass flex items-center justify-between">
          <span className="text-sm text-primary font-medium">{billingMsg}</span>
          <button className="text-secondary text-sm hover:text-primary" onClick={() => setBillingMsg("")}>✕</button>
        </div>
      )}

      <div className="card mb-6">
        <div className="flex flex-wrap gap-2">
          {["all", "draft", "in_progress", "paused", "closed"].map(st => (
            <button
              key={st}
              onClick={() => setFilterState(st)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterState === st
                  ? "bg-primary text-white shadow-glow"
                  : "bg-input text-secondary hover:text-primary"
              }`}
            >
              {st === "all" ? "All Subscriptions" : st.replace("_", " ").toUpperCase()}
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
                  <th>Customer</th>
                  <th>Plan</th>
                  <th>Cadence</th>
                  <th>Price</th>
                  <th>Next Invoice</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {subs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-secondary py-12">
                      No subscriptions found in this category.
                    </td>
                  </tr>
                ) : (
                  subs.map(s => (
                    <tr key={s.id}>
                      <td className="font-bold text-primary">{s.number}</td>
                      <td>
                        <div className="font-medium text-primary">{s.customer?.fullName || "—"}</div>
                        <div className="text-xs text-muted">{s.customer?.email}</div>
                      </td>
                      <td>{s.plan?.name || "Custom"}</td>
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
                      <td>
                        <Link href={`/subscriptions/${s.id}`} className="btn btn-secondary text-xs py-1 px-3">
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
