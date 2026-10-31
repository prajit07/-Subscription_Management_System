import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/validators';

export default function SubscriptionDetail() {
  const { id } = useParams();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newState, setNewState] = useState('');

  const load = () => {
    setLoading(true);
    api.get(`/subscriptions/${id}`)
      .then(r => { setSub(r.data); setNewState(r.data.state); })
      .catch(e => setError(e.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const updateState = async () => {
    try { await api.patch(`/subscriptions/${id}/state`, { state: newState }); load(); }
    catch (e) { alert(e.response?.data?.error || 'Update failed'); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (error)   return <div className="alert alert-error">{error}</div>;
  if (!sub)    return null;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{sub.sequence_number}</h1>
        <Link to="/subscriptions" className="btn btn-secondary btn-sm">← Back</Link>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <div className="form-row">
          <div><strong>Customer</strong><br/>{sub.customer_name} ({sub.customer_email})</div>
          <div><strong>Plan</strong><br/>{sub.plan_name} — {sub.frequency}</div>
          <div><strong>Start</strong><br/>{formatDate(sub.start_date)}</div>
          <div><strong>Expiry</strong><br/>{formatDate(sub.expiry_date)}</div>
          <div><strong>Next Invoice</strong><br/>{formatDate(sub.next_invoice_date)}</div>
          <div><strong>State</strong><br/><span className={`badge badge-${sub.state}`}>{sub.state}</span></div>
        </div>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <h3 style={{marginBottom:12}}>Line Items</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Variant</th><th>Qty</th><th>Unit Price</th><th>Tax Rule</th></tr></thead>
            <tbody>
              {sub.lines?.map(l => (
                <tr key={l.id}>
                  <td>{l.product_name}</td>
                  <td>{l.variant_value ? `${l.attribute}: ${l.variant_value}` : '—'}</td>
                  <td>{l.quantity}</td>
                  <td>{formatCurrency(l.unit_price)}</td>
                  <td>{l.tax_rule_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <h3 style={{marginBottom:12}}>Change State</h3>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <select className="form-select" style={{width:160}} value={newState} onChange={e => setNewState(e.target.value)}>
            {['draft','sent','confirmed','active','closed'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={updateState}>Update</button>
        </div>
      </div>
    </>
  );
}
