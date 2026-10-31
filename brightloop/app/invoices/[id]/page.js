"use client";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";

function InvoiceDetailContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: "",
    method: "bank_transfer",
    note: "",
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return router.replace("/login");
    loadInvoice();
  }, [session, status, router, id]);

  async function loadInvoice() {
    try {
      const res = await fetch(`/api/invoices/${id}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
        setPayForm(prev => ({ ...prev, amount: data.total }));
      } else {
        router.replace("/invoices");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action, payload = {}) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      if (res.ok) {
        setShowPayModal(false);
        loadInvoice();
      }
    } finally {
      setActionLoading(false);
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

  if (loading || !invoice) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const isStaffAdmin = ["admin", "staff"].includes(session?.user?.role);
  const totalPaid = invoice.payments?.reduce((s, p) => s + p.amount, 0) || 0;
  const balanceDue = Math.max(0, invoice.total - totalPaid);

  return (
    <>
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href={isStaffAdmin ? "/invoices" : "/portal"} className="text-secondary hover:text-primary text-sm">
              ← Back to {isStaffAdmin ? "Invoices" : "My Portal"}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1>{invoice.number}</h1>
            <span className={`badge ${stateBadges[invoice.state] || "badge-draft"} text-sm capitalize`}>
              {invoice.state}
            </span>
          </div>
          <p className="page-header-sub">
            Date Issued: {new Date(invoice.date).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => window.print()}
          >
            🖨 Print Invoice
          </button>

          {isStaffAdmin && invoice.state === "draft" && (
            <button
              className="btn btn-primary"
              disabled={actionLoading}
              onClick={() => handleAction("confirm")}
            >
              ✓ Confirm / Post
            </button>
          )}

          {isStaffAdmin && (invoice.state === "confirmed" || invoice.state === "posted") && (
            <button
              className="btn btn-primary"
              disabled={actionLoading}
              onClick={() => setShowPayModal(true)}
            >
              💳 Register Payment
            </button>
          )}

          {isStaffAdmin && invoice.state !== "cancelled" && invoice.state !== "paid" && (
            <button
              className="btn btn-danger"
              disabled={actionLoading}
              onClick={() => handleAction("cancel")}
            >
              ✕ Cancel Invoice
            </button>
          )}
        </div>
      </div>

      <div className="card p-8 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-glass pb-6 mb-6">
          <div>
            <div className="text-2xl font-black text-primary flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-base">B</span>
              Brightloop Technologies
            </div>
            <div className="text-xs text-secondary">Automated Subscription & Billing Infrastructure</div>
            <div className="text-xs text-muted">contact@brightloop.io | Bangalore, India</div>
          </div>
          <div className="text-right mt-4 md:mt-0">
            <div className="text-xs text-muted uppercase tracking-wider font-semibold">Invoice Number</div>
            <div className="text-xl font-bold text-primary">{invoice.number}</div>
            <div className="text-xs text-secondary mt-1">
              Issued: {new Date(invoice.date).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Billed To</div>
            <div className="text-lg font-bold text-primary">{invoice.customer?.fullName}</div>
            <div className="text-sm text-secondary">{invoice.customer?.email}</div>
          </div>
          <div className="md:text-right">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Reference Contract</div>
            {invoice.subscription ? (
              <div>
                <div className="text-base font-bold text-primary">{invoice.subscription.number}</div>
                <div className="text-xs text-secondary">
                  Recurring Plan: {invoice.subscription.recurringPrice ? fmt(invoice.subscription.recurringPrice) : "Custom"}
                </div>
              </div>
            ) : (
              <div className="text-sm text-secondary">One-time / Direct Invoice</div>
            )}
          </div>
        </div>

        <div className="table-container mb-8">
          <table className="table">
            <thead>
              <tr>
                <th>Item / Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines?.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center text-secondary py-6">
                    Subscription Services Billing
                  </td>
                </tr>
              ) : (
                invoice.lines?.map((line, idx) => (
                  <tr key={line.id || idx}>
                    <td className="font-semibold text-primary">
                      {line.name || `Subscription Line #${idx + 1}`}
                    </td>
                    <td>{line.qty}</td>
                    <td>{fmt(line.unitPrice)}</td>
                    <td className="text-right font-bold text-primary">{fmt(line.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start pt-4 border-t border-glass">
          <div className="text-sm text-secondary mb-4 md:mb-0 max-w-sm">
            {invoice.notes && <p className="mb-2"><span className="font-semibold text-primary">Notes:</span> {invoice.notes}</p>}
            <p className="text-xs text-muted">Thank you for your business. For any billing questions, contact support@brightloop.io.</p>
          </div>

          <div className="w-full md:w-72 space-y-2 text-sm">
            <div className="flex justify-between text-secondary">
              <span>Subtotal:</span>
              <span className="font-medium text-primary">{fmt(invoice.total - (invoice.taxTotal || 0) + (invoice.discountTotal || 0))}</span>
            </div>
            {invoice.taxTotal > 0 && (
              <div className="flex justify-between text-secondary">
                <span>Tax:</span>
                <span className="font-medium text-primary">{fmt(invoice.taxTotal)}</span>
              </div>
            )}
            {invoice.discountTotal > 0 && (
              <div className="flex justify-between text-success">
                <span>Discount:</span>
                <span>-{fmt(invoice.discountTotal)}</span>
              </div>
            )}
            <div className="border-t border-glass pt-2 flex justify-between items-center">
              <span className="text-base font-bold text-primary">Total:</span>
              <span className="text-2xl font-black text-primary">{fmt(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-xs text-secondary pt-1">
              <span>Amount Paid:</span>
              <span className="text-success font-semibold">{fmt(totalPaid)}</span>
            </div>
            <div className="flex justify-between text-xs text-secondary">
              <span>Balance Due:</span>
              <span className={balanceDue > 0 ? "text-orange-400 font-bold" : "text-success font-bold"}>
                {fmt(balanceDue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {invoice.payments?.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-primary mb-4">Payment Records</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Notes</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map(p => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td className="text-secondary">{new Date(p.date).toLocaleDateString()}</td>
                    <td className="capitalize font-semibold text-primary">{p.method.replace("_", " ")}</td>
                    <td className="text-secondary text-sm">{p.note || "—"}</td>
                    <td className="text-right font-bold text-success">{fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPayModal && (
        <div className="modal-backdrop" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Register Payment</h2>
              <button className="modal-close" onClick={() => setShowPayModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Payment Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="form-input"
                  value={payForm.amount}
                  onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-select"
                  value={payForm.method}
                  onChange={e => setPayForm({ ...payForm, method: e.target.value })}
                >
                  <option value="bank_transfer">Bank Transfer / NEFT</option>
                  <option value="upi">UPI / Instant Pay</option>
                  <option value="credit_card">Credit / Debit Card</option>
                  <option value="cash">Cash / Cheque</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reference / Note</label>
                <input
                  type="text"
                  placeholder="e.g. UTR #1234567890"
                  className="form-input"
                  value={payForm.note}
                  onChange={e => setPayForm({ ...payForm, note: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPayModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={actionLoading}
                onClick={() => handleAction("pay", payForm)}
              >
                {actionLoading ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function InvoiceDetailPage() {
  return (
    <Suspense fallback={<div className="loading-spinner"><div className="spinner"></div></div>}>
      <InvoiceDetailContent />
    </Suspense>
  );
}
