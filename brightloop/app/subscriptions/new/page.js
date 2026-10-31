"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function NewSubscriptionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");

  const [lines, setLines] = useState([
    { productId: "", variantId: "", qty: 1, unitPrice: 0, taxId: "" },
  ]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return router.replace("/login");
    if (!["admin", "staff"].includes(session.user.role)) return router.replace("/portal");

    Promise.all([
      fetch("/api/users").then(r => r.ok ? r.json() : []),
      fetch("/api/plans").then(r => r.ok ? r.json() : []),
      fetch("/api/products").then(r => r.ok ? r.json() : []),
      fetch("/api/taxes").then(r => r.ok ? r.json() : []),
    ]).then(([u, pl, pr, tx]) => {
      setUsers(u);
      setPlans(pl);
      setProducts(pr);
      setTaxes(tx);
      setLoading(false);
    });
  }, [session, status, router]);

  function handleProductChange(index, prodId) {
    const prod = products.find(p => p.id === parseInt(prodId));
    const newLines = [...lines];
    newLines[index].productId = prodId;
    newLines[index].variantId = "";
    newLines[index].unitPrice = prod ? prod.salesPrice : 0;
    setLines(newLines);
  }

  function handlePlanSelect(pId) {
    setPlanId(pId);
    const plan = plans.find(p => p.id === parseInt(pId));
    if (plan && plan.productId) {
      const prod = products.find(pr => pr.id === plan.productId);
      if (prod) {
        setLines([
          {
            productId: String(prod.id),
            variantId: "",
            qty: plan.minQty || 1,
            unitPrice: plan.price || prod.salesPrice,
            taxId: "",
          },
        ]);
      }
    }
  }

  function updateLine(index, field, value) {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  }

  function addLine() {
    setLines([...lines, { productId: "", variantId: "", qty: 1, unitPrice: 0, taxId: "" }]);
  }

  function removeLine(index) {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  }

  const subtotal = lines.reduce((acc, l) => acc + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!customerId) return alert("Please select a customer");
    setSaving(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          planId,
          startDate,
          expiryDate: expiryDate || null,
          paymentTerms,
          lines,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        router.push(`/subscriptions/${created.id}`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create subscription");
      }
    } finally {
      setSaving(false);
    }
  }

  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n || 0);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <>
      <div className="page-header flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/subscriptions" className="text-secondary hover:text-primary text-sm">
              ← Back to Subscriptions
            </Link>
          </div>
          <h1>Create New Subscription</h1>
          <p className="page-header-sub">Configure recurring contract details, client, and line items</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="card lg:col-span-2">
            <h3 className="text-lg font-bold text-primary mb-4">Subscription Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="form-group">
                <label className="form-label">Customer *</label>
                <select
                  required
                  className="form-select"
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                >
                  <option value="">-- Select Customer --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Recurring Plan</label>
                <select
                  className="form-select"
                  value={planId}
                  onChange={e => handlePlanSelect(e.target.value)}
                >
                  <option value="">-- Custom Subscription --</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.billingPeriod} - {fmt(p.price)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  required
                  className="form-input"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expiry / Renewal Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Terms</label>
                <input
                  type="text"
                  placeholder="e.g. Net 30, Due Upon Receipt"
                  className="form-input"
                  value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-primary mb-4">Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-secondary">
                  <span>Lines count:</span>
                  <span className="text-primary font-medium">{lines.length}</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>Subtotal:</span>
                  <span className="text-primary font-medium">{fmt(subtotal)}</span>
                </div>
                <div className="border-t border-glass pt-3 flex justify-between items-center">
                  <span className="text-base font-bold text-primary">Recurring Total:</span>
                  <span className="text-2xl font-extrabold text-primary">{fmt(subtotal)}</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary w-full py-3 justify-center text-base"
              >
                {saving ? "Creating Subscription..." : "Create Subscription"}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-primary">Contract Line Items</h3>
            <button type="button" onClick={addLine} className="btn btn-secondary text-xs">
              + Add Line Item
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "35%" }}>Product</th>
                  <th style={{ width: "20%" }}>Variant</th>
                  <th style={{ width: "12%" }}>Qty</th>
                  <th style={{ width: "15%" }}>Unit Price (₹)</th>
                  <th style={{ width: "13%" }}>Total</th>
                  <th style={{ width: "5%" }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const selectedProduct = products.find(p => p.id === parseInt(line.productId));
                  const variants = selectedProduct?.variants || [];
                  const lineTotal = (parseFloat(line.qty) || 0) * (parseFloat(line.unitPrice) || 0);

                  return (
                    <tr key={idx}>
                      <td>
                        <select
                          className="form-select text-sm py-1"
                          value={line.productId}
                          onChange={e => handleProductChange(idx, e.target.value)}
                        >
                          <option value="">-- Select Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({fmt(p.salesPrice)})</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-select text-sm py-1"
                          value={line.variantId}
                          disabled={variants.length === 0}
                          onChange={e => updateLine(idx, "variantId", e.target.value)}
                        >
                          <option value="">{variants.length ? "-- Select Variant --" : "Standard"}</option>
                          {variants.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.name} (+₹{v.priceExtra})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          className="form-input text-sm py-1"
                          value={line.qty}
                          onChange={e => updateLine(idx, "qty", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input text-sm py-1"
                          value={line.unitPrice}
                          onChange={e => updateLine(idx, "unitPrice", e.target.value)}
                        />
                      </td>
                      <td className="font-bold text-primary">
                        {fmt(lineTotal)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="text-red-400 hover:text-red-300 text-lg px-2"
                          onClick={() => removeLine(idx)}
                          title="Remove line"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </>
  );
}
