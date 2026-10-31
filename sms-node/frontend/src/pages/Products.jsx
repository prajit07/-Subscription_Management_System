import { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/validators';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', type: 'subscription', base_price: 0, cost_price: 0, description: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/products').then(r => setProducts(r.data.data || [])).finally(() => setLoading(false));
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/products', { ...form, base_price: parseFloat(form.base_price), cost_price: parseFloat(form.cost_price) });
      setShow(false); setForm({ name: '', type: 'subscription', base_price: 0, cost_price: 0, description: '' });
      load();
    } catch (e) { setError(e.response?.data?.error || 'Failed'); }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <button className="btn btn-primary" onClick={() => setShow(true)}>+ Add Product</button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add Product</div>
            <form onSubmit={submit} className="auth-form">
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
                    <option value="subscription">subscription</option><option value="addon">addon</option><option value="one_time">one_time</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Base Price</label><input className="form-input" type="number" step="0.01" value={form.base_price} onChange={e => setForm(f=>({...f,base_price:e.target.value}))} required /></div>
              </div>
              <div className="form-group"><label className="form-label">Cost Price</label><input className="form-input" type="number" step="0.01" value={form.cost_price} onChange={e => setForm(f=>({...f,cost_price:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} /></div>
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
              <thead><tr><th>Name</th><th>Type</th><th>Base Price</th><th>Cost</th><th>Variants</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td style={{fontWeight:600}}>{p.name}</td>
                    <td><span className="badge badge-draft">{p.type}</span></td>
                    <td>{formatCurrency(p.base_price)}</td>
                    <td>{formatCurrency(p.cost_price)}</td>
                    <td>{p.variants?.filter(Boolean).map(v => `${v.value}(+${v.price_addon})`).join(', ') || '—'}</td>
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