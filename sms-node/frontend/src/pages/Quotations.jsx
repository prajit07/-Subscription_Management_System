import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function Quotations() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', validity_days: 30, notes: '', lines: [{ product_id: '', quantity: 1, unit_price: 0 }] });
  const [products, setProducts] = useState([]);
  const [show, setShow] = useState(false);

  const load = () => Promise.all([
    api.get('/quotations').then(r => setTemplates(r.data.data || [])),
    api.get('/products').then(r => setProducts(r.data.data || [])),
  ]).finally(() => setLoading(false));
  useEffect(load, []);

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { product_id: '', quantity: 1, unit_price: 0 }] }));
  const setLine = (i, k, v) => setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [k]: v } : l) }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/quotations', { ...form, validity_days: parseInt(form.validity_days), lines: form.lines.map(l => ({ ...l, quantity: parseFloat(l.quantity), unit_price: parseFloat(l.unit_price) })) });
      setShow(false); load();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Quotation Templates</h1>
        <button className="btn btn-primary" onClick={() => setShow(true)}>+ New Template</button>
      </div>
      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">New Quotation Template</div>
            <form onSubmit={submit} className="auth-form">
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required /></div>
              <div className="form-group"><label className="form-label">Validity (days)</label><input className="form-input" type="number" value={form.validity_days} onChange={e => setForm(f=>({...f,validity_days:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} /></div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',margin:'8px 0'}}>
                <strong>Lines</strong><button type="button" className="btn btn-secondary btn-sm" onClick={addLine}>+ Add</button>
              </div>
              {form.lines.map((l, i) => (
                <div key={i} className="form-row" style={{marginBottom:8}}>
                  <select className="form-select" value={l.product_id} onChange={e => setLine(i,'product_id',e.target.value)}>
                    <option value="">Product…</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input className="form-input" type="number" step="0.01" value={l.quantity} onChange={e => setLine(i,'quantity',e.target.value)} placeholder="Qty" />
                  <input className="form-input" type="number" step="0.01" value={l.unit_price} onChange={e => setLine(i,'unit_price',e.target.value)} placeholder="Price" />
                </div>
              ))}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShow(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        <div className="card" style={{padding:0}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Validity</th><th>Lines</th><th>Created By</th></tr></thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id}>
                    <td style={{fontWeight:600}}>{t.name}</td>
                    <td>{t.validity_days} days</td>
                    <td>{t.lines?.filter(Boolean).length || 0} items</td>
                    <td>{t.created_by_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
