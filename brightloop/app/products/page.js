"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: "", ptype: "software", salesPrice: 0, costPrice: 0, notes: "" });
  const [varForms, setVarForms] = useState({});
  const [loading, setLoading] = useState(true);

  const load = () => fetch("/api/products").then(r => r.json()).then(d => { setProducts(d); setLoading(false); });

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role === "customer") return router.replace("/");
    load();
  }, [session, status, router]);

  const handleAdd = async (e) => {
    e.preventDefault();
    await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ name: "", ptype: "software", salesPrice: 0, costPrice: 0, notes: "" });
    load();
  };

  const handleVariant = async (pid) => {
    const vf = varForms[pid] || {};
    await fetch(`/api/products/${pid}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: vf.name, priceExtra: vf.priceExtra }),
    });
    setVarForms({ ...varForms, [pid]: { name: "", priceExtra: 0 } });
    load();
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <>
      <div className="page-header">
        <h1>Products</h1>
        <p className="page-header-sub">Manage your product catalog and variants</p>
      </div>

      <div className="card">
        <div className="card-title"><span className="card-title-icon">➕</span> Add Product</div>
        <form onSubmit={handleAdd}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.ptype} onChange={e => setForm({ ...form, ptype: e.target.value })}>
                <option value="software">Software</option>
                <option value="addon">Addon</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sales Price</label>
              <input type="number" step="0.01" className="form-input" value={form.salesPrice} onChange={e => setForm({ ...form, salesPrice: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Cost Price</label>
              <input type="number" step="0.01" className="form-input" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary">Add Product</button>
        </form>
      </div>

      <div className="card">
        <div className="card-title"><span className="card-title-icon">📦</span> Product List</div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Type</th><th>Sales</th><th>Cost</th><th>Variants</th><th>Add Variant</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">📦</div><div className="empty-state-text">No products yet</div></div></td></tr>
              )}
              {products.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td><span className="badge confirmed">{p.ptype}</span></td>
                  <td>₹{p.salesPrice}</td>
                  <td>₹{p.costPrice}</td>
                  <td>{p.variants?.map(v => <span key={v.id} className="badge draft" style={{ marginRight: 4 }}>{v.name} (+₹{v.priceExtra})</span>)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input className="form-input" placeholder="Name" style={{ width: 100, marginBottom: 0 }}
                        value={varForms[p.id]?.name || ""}
                        onChange={e => setVarForms({ ...varForms, [p.id]: { ...varForms[p.id], name: e.target.value } })}
                      />
                      <input type="number" step="0.01" className="form-input" placeholder="+Price" style={{ width: 70, marginBottom: 0 }}
                        value={varForms[p.id]?.priceExtra || ""}
                        onChange={e => setVarForms({ ...varForms, [p.id]: { ...varForms[p.id], priceExtra: e.target.value } })}
                      />
                      <button className="btn btn-secondary btn-sm" onClick={() => handleVariant(p.id)}>+</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
