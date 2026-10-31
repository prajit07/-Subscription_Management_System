import { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/validators';

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', frequency: 'monthly', price: 0, min_quantity: 1, auto_close: false, closable: true, upsell_enabled: false, grace_period_days: 15 });
  const [show, setShow] = useState(false);
  const load = () => api.get('/products/plans').then(r => setPlans(r.data.data || [])).finally(() => setLoading(false));
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/products/plans', { ...form, price: parseFloat(form.price), min_quantity: parseInt(form.min_quantity), grace_period_days: parseInt(form.grace_period_days) });
      setShow(false); load();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Recurring Plans</h1>
        <button className="btn btn-primary" onClick={() => setShow(true)}>+ Add Plan</button>
      </div>
      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add Recurring Plan</div>
            <form onSubmit={submit} className="auth-form">
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Frequency</label>
                  <select className="form-select" value={form.frequency} onChange={e => setForm(f=>({...f,frequency:e.target.value}))}>
                    {['daily','weekly','monthly','yearly'].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Price</label><input className="form-input" type="number" step="0.01" value={form.price} onChange={e => setForm(f=>({...f,price:e.target.value}))} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Min Quantity</label><input className="form-input" type="number" value={form.min_quantity} onChange={e => setForm(f=>({...f,min_quantity:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Grace Period (days)</label><input className="form-input" type="number" value={form.grace_period_days} onChange={e => setForm(f=>({...f,grace_period_days:e.target.value}))} /></div>
              </div>
              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                <label><input type="checkbox" checked={form.auto_close} onChange={e => setForm(f=>({...f,auto_close:e.target.checked}))} /> Auto-close</label>
                <label><input type="checkbox" checked={form.closable} onChange={e => setForm(f=>({...f,closable:e.target.checked}))} /> Closable</label>
                <label><input type="checkbox" checked={form.upsell_enabled} onChange={e => setForm(f=>({...f,upsell_enabled:e.target.checked}))} /> Upsell enabled</label>
              </div>
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
              <thead><tr><th>Name</th><th>Frequency</th><th>Price</th><th>Min Qty</th><th>Auto-close</th><th>Closable</th><th>Upsell</th></tr></thead>
              <tbody>
                {plans.map(p => (
                  <tr key={p.id}>
                    <td style={{fontWeight:600}}>{p.name}</td><td>{p.frequency}</td><td>{formatCurrency(p.price)}</td>
                    <td>{p.min_quantity}</td><td>{p.auto_close ? 'Yes' : 'No'}</td>
                    <td>{p.closable ? 'Yes' : 'No'}</td><td>{p.upsell_enabled ? 'Yes' : 'No'}</td>
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
EOF