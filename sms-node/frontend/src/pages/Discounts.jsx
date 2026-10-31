import { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/validators';

export default function Discounts() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', type: 'percentage', scope: 'subscription', value: 0, start_date: '', end_date: '', max_uses: '' });
  const [show, setShow] = useState(false);
  const load = () => api.get('/products/discounts').then(r => setDiscounts(r.data.data || [])).finally(() => setLoading(false));
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/products/discounts', { ...form, value: parseFloat(form.value), max_uses: form.max_uses ? parseInt(form.max_uses) : undefined });
      setShow(false); load();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Discount Rules</h1>
        <button className="btn btn-primary" onClick={() => setShow(true)}>+ Add Discount</button>
      </div>
      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add Discount Rule</div>
            <form onSubmit={submit} className="auth-form">
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
                    <option value="percentage">percentage</option><option value="fixed">fixed</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Scope</label>
                  <select className="form-select" value={form.scope} onChange={e => setForm(f=>({...f,scope:e.target.value}))}>
                    <option value="subscription">subscription</option><option value="product">product</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Value</label><input className="form-input" type="number" step="0.01" value={form.value} onChange={e => setForm(f=>({...f,value:e.target.value}))} required /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Start Date</label><input className="form-input" type="date" value={form.start_date} onChange={e => setForm(f=>({...f,start_date:e.target.value}))} required /></div>
                <div className="form-group"><label className="form-label">End Date</label><input className="form-input" type="date" value={form.end_date} onChange={e => setForm(f=>({...f,end_date:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Max Uses (blank = unlimited)</label><input className="form-input" type="number" value={form.max_uses} onChange={e => setForm(f=>({...f,max_uses:e.target.value}))} /></div>
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
              <thead><tr><th>Name</th><th>Type</th><th>Scope</th><th>Value</th><th>Start</th><th>End</th><th>Uses</th></tr></thead>
              <tbody>
                {discounts.map(d => (
                  <tr key={d.id}>
                    <td style={{fontWeight:600}}>{d.name}</td><td>{d.type}</td><td>{d.scope}</td>
                    <td>{d.type === 'percentage' ? `${d.value}%` : formatCurrency(d.value)}</td>
                    <td>{new Date(d.start_date).toLocaleDateString()}</td>
                    <td>{d.end_date ? new Date(d.end_date).toLocaleDateString() : '—'}</td>
                    <td>{d.uses_count}{d.max_uses ? `/${d.max_uses}` : ''}</td>
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