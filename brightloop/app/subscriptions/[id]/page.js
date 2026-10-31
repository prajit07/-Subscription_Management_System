"use client";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";

function SubscriptionDetailContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeReason, setCloseReason] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return router.replace("/login");
    if (!["admin", "staff"].includes(session.user.role)) return router.replace("/portal");
    loadSubscription();
  }, [session, status, router, id]);

  async function loadSubscription() {
    try {
      const res = await fetch(`/api/subscriptions/${id}`);
      if (res.ok) {
        setSub(await res.json());
      } else {
        router.replace("/subscriptions");
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateState(newState, reason = "") {
    setUpdating(true);
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: newState, closeReason: reason }),
      });
      if (res.ok) {
        setShowCloseModal(false);
        loadSubscription();
      }
    } finally {
      setUpdating(false);
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

  if (loading || !sub) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <>
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/subscriptions" className="text-secondary hover:text-primary text-sm">
              ← Back to Subscriptions
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1>{sub.number}</h1>
            <span className={`badge ${stateBadges[sub.state] || "badge-draft"} text-sm capitalize`}>
              {sub.state.replace("_", " ")}
            </span>
          </div>
          <p className="page-header-sub">
            Created on {new Date(sub.createdAt).toLocaleDateString()} for {sub.customer?.fullName}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {sub.state === "draft" && (
            <button
              className="btn btn-primary"
              disabled={updating}
              onClick={() => updateState("confirmed")}
            >
              ✓ Confirm Subscription
            </button>
          )}

          {(sub.state === "confirmed" || sub.state === "in_progress") && (
            <button
              className="btn btn-secondary"
              disabled={updating}
              onClick={() => updateState("paused")}
            >
              ⏸ Pause
            </button>
          )}

          {sub.state === "paused" && (
            <button
              className="btn btn-primary"
              disabled={updating}
              onClick={() => updateState("confirmed")}
            >
              ▶ Resume
            </button>
          )}

          {sub.state !== "closed" && (
            <button
              className="btn btn-danger"
              disabled={updating}
              onClick={() => setShowCloseModal(true)}
            >
              ✕ Close Contract
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">
            Customer Information
          </h3>
          <div className="text-lg font-bold text-primary mb-1">{sub.customer?.fullName}</div>
          <div className="text-secondary text-sm mb-1">{sub.customer?.email}</div>
          <div className="text-xs text-muted">Customer ID: #{sub.customer?.id}</div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">
            Plan & Billing Schedule
          </h3>
          <div className="text-lg font-bold text-primary mb-1">{sub.plan?.name || "Custom Plan"}</div>
          <div className="text-secondary text-sm mb-1">
            Cadence: <span className="text-primary font-medium capitalize">{sub.plan?.billingPeriod || "Monthly"}</span>
          </div>
          <div className="text-xs text-muted">
            Next Invoice Date:{" "}
            <span className="text-primary font-medium">
              {sub.nextInvoiceDate ? new Date(sub.nextInvoiceDate).toLocaleDateString() : "—"}
            </span>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">
            Contract Terms
          </h3>
          <div className="text-2xl font-black text-primary mb-1">{fmt(sub.recurringPrice)}</div>
          <div className="text-secondary text-sm">
            Terms: {sub.paymentTerms || "Standard"}
          </div>
          {sub.closeReason && (
            <div className="text-xs text-red-400 mt-2">Reason: {sub.closeReason}</div>
          )}
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="text-lg font-bold text-primary mb-4">Subscription Line Items</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Item #</th>
                <th>Product ID</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {sub.lines?.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-secondary py-6">
                    No line items attached.
                  </td>
                </tr>
              ) : (
                sub.lines?.map((l, i) => (
                  <tr key={l.id || i}>
                    <td>Line {i + 1}</td>
                    <td className="font-semibold text-primary">Product #{l.productId || "—"}</td>
                    <td>{l.qty}</td>
                    <td>{fmt(l.unitPrice)}</td>
                    <td className="font-bold text-primary">{fmt(l.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-bold text-primary mb-4">Invoices & Invoicing History</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sub.invoices?.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-secondary py-6">
                    No invoices generated yet for this subscription.
                  </td>
                </tr>
              ) : (
                sub.invoices?.map(inv => (
                  <tr key={inv.id}>
                    <td className="font-bold text-primary">{inv.number}</td>
                    <td className="text-secondary">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="font-bold text-primary">{fmt(inv.total)}</td>
                    <td>
                      <span className={`badge ${inv.state === "paid" ? "badge-paid" : inv.state === "posted" ? "badge-posted" : "badge-draft"} capitalize`}>
                        {inv.state}
                      </span>
                    </td>
                    <td>
                      <Link href={`/invoices/${inv.id}`} className="btn btn-secondary text-xs py-1 px-3">
                        View Invoice
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCloseModal && (
        <div className="modal-backdrop" onClick={() => setShowCloseModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Close Subscription Contract</h2>
              <button className="modal-close" onClick={() => setShowCloseModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-secondary text-sm mb-4">
                Are you sure you want to terminate this subscription? This will stop future automatic invoice generation.
              </p>
              <div className="form-group">
                <label className="form-label">Reason for closure</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="e.g. Customer requested cancellation, project ended"
                  value={closeReason}
                  onChange={e => setCloseReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCloseModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                disabled={updating}
                onClick={() => updateState("closed", closeReason)}
              >
                {updating ? "Closing..." : "Confirm Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function SubscriptionDetailPage() {
  return (
    <Suspense fallback={<div className="loading-spinner"><div className="spinner"></div></div>}>
      <SubscriptionDetailContent />
    </Suspense>
  );
}
