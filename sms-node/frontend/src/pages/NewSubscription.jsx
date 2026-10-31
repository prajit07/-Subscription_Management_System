import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function NewSubscription() {
  const nav = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [form, setForm] = useState({ customer_id: '', plan_id: '', start_date: new Date().toISOString().slice(0,10), expiry_date: '', payment_terms: 'Net 30' });
  const [lines, setLines] = useState([{ product_id: '', quantity: 1, unit_price: 0, tax_rule_id: '' }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/products').then(r => setProducts(r.data.data || [])),
      api.get('/products/plans').then(r => setPlans(r.data.data || [])),
      api.get('/taxes').then(r => setTaxes(r.data.data || [])),
      api.get('/users', { params: { role: 'customer' } }).then(r => setCustomers(r.data.data || [])).catch(() => {}),
    ]);
  }, []);

  const addLine = () => setLines(l => [...l, { product_id: '', quantity: 1, unit_price: 0, tax_rule_id: '' }]);
  const removeLine = (i) => setLines(l => l.filter((_, idx) => idx !== i));
  const setLine = (i, k, v) => setLines(l => l.map((row, idx) => idx === i ? { ...row, [k]: v } : row));
  const onProductChange = (i, pid) => {
    const p = products.find(x => x.id === pid);
    setLine(i, 'product_id', pid);
    if (p) setLine(i, 'unit_price', p.base_price);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const payload = {
        customer_id: form.customer_id,
        plan_id: form.plan_id,
        start_date: form.start_date,
        expiry_date: form.expiry_date || undefined,
        payment_terms: form.payment_terms,
        lines: lines.map(l => ({
          product_id: l.product_id,
          quantity: parseFloat(l.quantity),
          unit_price: parseFloat(l.unit_price),
          tax_rule_id: l.tax_rule_id || undefined,
        })),
      };
      const { data } = await api.post('/subscriptions', payload);
      nav(`/subscriptions/${data.id}`);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create subscription');
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="page-header"><h1 className="page-title">New Subscription</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={submit}>
        <div className="card" style={{marginBottom:16}}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Customer</label>
              <select className="form-select" value={form.customer_id} onChange={e => setForm(f=>({...f,customer_id:e.target.value}))} required>
                <option value="">Select customer…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Recurring Plan</label>
              <select className="form-select" value={form.plan_id} onChange={e => setForm(f=>({...f,plan_id:e.target.value}))} required>
                <option value="">Select plan…</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} — {p.frequency} {p.price}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" value={form.start_date} onChange={e => setForm(f=>({...f,start_date:e.target.value}))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date (optional)</label>
              <input className="form-input" type="date" value={form.expiry_date} onChange={e => setForm(f=>({...f,expiry_date:e.target.value}))} />
            </div>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label className="form-label">Payment Terms</label>
              <input className="form-input" value={form.payment_terms} onChange={e => setForm(f=>({...f,payment_terms:e.target.value}))} />
            </div>
          </div>
        </div>
        <div className="card" style={{marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3>Line Items</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}>+ Add Line</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Tax</th><th></th></tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td>
                      <select className="form-select" value={l.product_id} onChange={e => onProductChange(i, e.target.value)}>
                        <option value="">Select product…</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td><input className="form-input" type="number" min="0.01" step="0.01" value={l.quantity} onChange={e => setLine(i,'quantity',e.target.value)} style={{width:70}} /></td>
                    <td><input className="form-input" type="number" step="0.01" value={l.unit_price} onChange={e => setLine(i,'unit_price',e.target.value)} style={{width:90}} /></td>
                    <td>
                      <select className="form-select" value={l.tax_rule_id} onChange={e => setLine(i,'tax_rule_id',e.target.value)}>
                        <option value="">None</option>
                        {taxes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
                      </select>
                    </td>
                    <td><button type="button" className="btn btn-danger btn-sm" onClick={() => removeLine(i)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create Subscription'}</button>
          <button className="btn btn-secondary" type="button" onClick={() => nav('/subscriptions')}>Cancel</button>
        </div>
      </form>
    </>
  );
}
