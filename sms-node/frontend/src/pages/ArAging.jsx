import { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/validators';

export default function ArAging() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/ar').then(r => setRows(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  const total = rows.reduce((s, r) => s + parseFloat(r.total || 0), 0);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Accounts Receivable Aging</h1>
        <span style={{fontWeight:600}}>Total outstanding: {formatCurrency(total)}</span>
      </div>
      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        <div className="card" style={{padding:0}}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Invoice</th><th>Customer</th><th>Subscription</th><th>Due Date</th><th>Days Overdue</th><th>Amount</th><th>State</th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td style={{fontWeight:600}}>{r.invoice_number}</td>
                    <td>{r.customer_name}</td>
                    <td>{r.subscription_number}</td>
                    <td>{formatDate(r.due_date)}</td>
                    <td style={{color: r.days_overdue > 30 ? 'var(--danger)' : 'var(--warning)', fontWeight:600}}>{r.days_overdue}</td>
                    <td>{formatCurrency(r.total)}</td>
                    <td><span className={`badge badge-${r.state}`}>{r.state}</span></td>
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
