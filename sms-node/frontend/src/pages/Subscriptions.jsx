import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/validators';

export default function Subscriptions() {
  const [data, setData]   = useState({ data: [], total: 0 });
  const [state, setState] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/subscriptions', { params: { state: state || undefined } })
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [state]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Subscriptions</h1>
        <Link to="/subscriptions/new" className="btn btn-primary">+ New Subscription</Link>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {['', 'draft','sent','confirmed','active','closed'].map(s => (
          <button key={s} className={`btn btn-sm ${state === s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setState(s)}>{s || 'All'}</button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        data.data?.length ? (
          <div className="card" style={{padding:0}}>
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Number</th><th>Customer</th><th>Plan</th><th>Frequency</th>
                  <th>Price</th><th>Next Invoice</th><th>State</th><th></th>
                </tr></thead>
                <tbody>
                  {data.data.map(s => (
                    <tr key={s.id}>
                      <td style={{fontWeight:600}}>{s.sequence_number}</td>
                      <td>{s.customer_name}</td>
                      <td>{s.plan_name}</td>
                      <td>{s.frequency}</td>
                      <td>{formatCurrency(s.plan_price)}</td>
                      <td>{formatDate(s.next_invoice_date)}</td>
                      <td><span className={`badge badge-${s.state}`}>{s.state}</span></td>
                      <td><Link to={`/subscriptions/${s.id}`} className="btn btn-secondary btn-sm">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <div className="empty-state"><h3>No subscriptions found</h3></div>
      )}
    </>
  );
}
