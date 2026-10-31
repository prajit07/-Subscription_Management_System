import { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/validators';

export default function Portal() {
  const [subs, setSubs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/subscriptions').then(r => setSubs(r.data.data || [])),
      api.get('/invoices').then(r => setInvoices(r.data.data || [])),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header"><h1 className="page-title">My Portal</h1></div>
      <div className="card" style={{marginBottom:16}}>
        <h3 style={{marginBottom:12}}>My Subscriptions</h3>
        {subs.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Number</th><th>Plan</th><th>Frequency</th><th>Price</th><th>Next Invoice</th><th>State</th></tr></thead>
              <tbody>
                {subs.map(s => (
                  <tr key={s.id}>
                    <td style={{fontWeight:600}}>{s.sequence_number}</td>
                    <td>{s.plan_name}</td><td>{s.frequency}</td>
                    <td>{formatCurrency(s.plan_price)}</td>
                    <td>{formatDate(s.next_invoice_date)}</td>
                    <td><span className={`badge badge-${s.state}`}>{s.state}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty-state"><h3>No subscriptions yet</h3></div>}
      </div>
      <div className="card">
        <h3 style={{marginBottom:12}}>My Invoices</h3>
        {invoices.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Number</th><th>Issue</th><th>Due</th><th>Total</th><th>State</th></tr></thead>
              <tbody>
                {invoices.map(i => (
                  <tr key={i.id}>
                    <td style={{fontWeight:600}}>{i.invoice_number}</td>
                    <td>{formatDate(i.issue_date)}</td><td>{formatDate(i.due_date)}</td>
                    <td>{formatCurrency(i.total)}</td>
                    <td><span className={`badge badge-${i.state}`}>{i.state}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty-state"><h3>No invoices yet</h3></div>}
      </div>
    </>
  );
}
EOF