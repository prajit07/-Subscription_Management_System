import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/validators';

export default function Invoices() {
  const [data, setData] = useState({ data: [], total: 0 });
  const [state, setState] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/invoices', { params: { state: state || undefined } })
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [state]);

  return (
    <>
      <div className="page-header"><h1 className="page-title">Invoices</h1></div>
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {['','draft','confirmed','sent','paid','cancelled'].map(s => (
          <button key={s} className={`btn btn-sm ${state === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setState(s)}>{s || 'All'}</button>
        ))}
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        data.data?.length ? (
          <div className="card" style={{padding:0}}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Number</th><th>Customer</th><th>Subscription</th><th>Issue</th><th>Due</th><th>Total</th><th>State</th><th></th></tr></thead>
                <tbody>
                  {data.data.map(i => (
                    <tr key={i.id}>
                      <td style={{fontWeight:600}}>{i.invoice_number}</td>
                      <td>{i.customer_name}</td>
                      <td>{i.subscription_number}</td>
                      <td>{formatDate(i.issue_date)}</td>
                      <td>{formatDate(i.due_date)}</td>
                      <td>{formatCurrency(i.total)}</td>
                      <td><span className={`badge badge-${i.state}`}>{i.state}</span></td>
                      <td><Link to={`/invoices/${i.id}`} className="btn btn-secondary btn-sm">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <div className="empty-state"><h3>No invoices found</h3></div>
      )}
    </>
  );
}
