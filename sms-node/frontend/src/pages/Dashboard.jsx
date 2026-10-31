import { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/validators';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (error)   return <div className="alert alert-error">{error}</div>;

  const stats = [
    { label: 'Active Subscriptions', value: data.active_subscriptions, cls: 'accent' },
    { label: 'MRR', value: formatCurrency(data.mrr), cls: 'success' },
    { label: 'ARR', value: formatCurrency(data.arr), cls: '' },
    { label: 'Revenue This Month', value: formatCurrency(data.revenue_this_month), cls: 'success' },
    { label: 'Overdue Invoices', value: data.overdue_count, cls: 'danger' },
    { label: 'Outstanding Amount', value: formatCurrency(data.overdue_amount), cls: 'warning' },
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>
      <div className="stat-grid">
        {stats.map(s => (
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 style={{marginBottom:12}}>Recent Subscriptions</h3>
        {data.recent_subscriptions?.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Number</th><th>Customer</th><th>Plan</th><th>Price</th><th>State</th><th>Start</th></tr></thead>
              <tbody>
                {data.recent_subscriptions.map(s => (
                  <tr key={s.sequence_number}>
                    <td style={{fontWeight:600}}>{s.sequence_number}</td>
                    <td>{s.customer_name}</td>
                    <td>{s.plan_name}</td>
                    <td>{formatCurrency(s.price)}</td>
                    <td><span className={`badge badge-${s.state}`}>{s.state}</span></td>
                    <td>{new Date(s.start_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty-state"><h3>No subscriptions yet</h3></div>}
      </div>
    </>
  );
}
