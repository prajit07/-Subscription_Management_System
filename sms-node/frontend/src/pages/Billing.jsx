import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function Billing() {
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState('');

  const loadStatus = () => api.get('/billing/status').then(r => setStatus(r.data));
  useEffect(loadStatus, []);

  const runBilling = async () => {
    setMsg('');
    try {
      const { data } = await api.post('/billing/run');
      setMsg(data.message);
    } catch (e) { setMsg(e.response?.data?.error || 'Failed'); }
  };

  return (
    <>
      <div className="page-header"><h1 className="page-title">Billing Control</h1></div>
      <div className="stat-grid">
        <div className="stat-card accent"><div className="label">Active Subscriptions</div><div className="value">{status?.active_subs ?? '—'}</div></div>
        <div className="stat-card danger"><div className="label">Overdue Invoices</div><div className="value">{status?.overdue_invoices ?? '—'}</div></div>
        <div className="stat-card warning"><div className="label">Outstanding Amount</div><div className="value">{status?.outstanding_amount ?? '—'}</div></div>
      </div>
      <div className="card">
        <h3 style={{marginBottom:8}}>Manual Billing Run</h3>
        <p style={{color:'var(--brand-600)',marginBottom:12,fontSize:'.875rem'}}>
          Triggers the idempotent billing cycle in the background. Already-billed subscriptions for today are skipped.
        </p>
        {msg && <div className="alert alert-success">{msg}</div>}
        <button className="btn btn-primary" onClick={runBilling}>Run Billing Now</button>
      </div>
    </>
  );
}
