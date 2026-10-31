import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/validators';

export default function InvoiceDetail() {
  const { id } = useParams();
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payForm, setPayForm] = useState({ method: 'upi', amount: '', reference_note: '' });
  const [payErr, setPayErr] = useState('');

  const load = () => {
    setLoading(true);
    api.get(`/invoices/${id}`)
      .then(r => setInv(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const confirm = async () => {
    try { await api.patch(`/invoices/${id}/state`, { state: 'confirmed' }); load(); }
    catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };
  const cancel = async () => {
    if (!confirm('Cancel this invoice?')) return;
    try { await api.patch(`/invoices/${id}/state`, { state: 'cancelled' }); load(); }
    catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };
  const recordPayment = async (e) => {
    e.preventDefault();
    setPayErr('');
    try {
      await api.post('/payments', {
        invoice_id: id,
        method: payForm.method,
        amount: parseFloat(payForm.amount || inv.total),
        reference_note: payForm.reference_note,
      });
      load();
    } catch (e) { setPayErr(e.response?.data?.error || 'Payment failed'); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (error)   return <div className="alert alert-error">{error}</div>;
  if (!inv)    return null;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{inv.invoice_number}</h1>
        <Link to="/invoices" className="btn btn-secondary btn-sm">← Back</Link>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="form-row">
          <div><strong>Customer</strong><br/>{inv.customer_name} ({inv.customer_email})</div>
          <div><strong>Subscription</strong><br/>{inv.subscription_number}</div>
          <div><strong>Issue Date</strong><br/>{formatDate(inv.issue_date)}</div>
          <div><strong>Due Date</strong><br/>{formatDate(inv.due_date)}</div>
          <div><strong>State</strong><br/><span className={`badge badge-${inv.state}`}>{inv.state}</span></div>
          <div><strong>Total</strong><br/>{formatCurrency(inv.total)}</div>
        </div>
      </div>

      <div className="card" style={{marginBottom:16,padding:0}}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Tax</th><th>Line Total</th></tr></thead>
            <tbody>
              {inv.lines?.map(l => (
                <tr key={l.id}>
                  <td>{l.description}</td><td>{l.quantity}</td>
                  <td>{formatCurrency(l.unit_price)}</td>
                  <td>{formatCurrency(l.tax_amount)}</td>
                  <td>{formatCurrency(l.line_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={4} style={{textAlign:'right',fontWeight:600}}>Subtotal</td><td>{formatCurrency(inv.subtotal)}</td></tr>
              <tr><td colSpan={4} style={{textAlign:'right',fontWeight:600}}>Tax</td><td>{formatCurrency(inv.tax_amount)}</td></tr>
              <tr><td colSpan={4} style={{textAlign:'right',fontWeight:600}}>Discount</td><td>-{formatCurrency(inv.discount_amount)}</td></tr>
              <tr><td colSpan={4} style={{textAlign:'right',fontWeight:700}}>Total</td><td style={{fontWeight:700}}>{formatCurrency(inv.total)}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      {inv.payments?.length > 0 && (
        <div className="card" style={{marginBottom:16}}>
          <h3 style={{marginBottom:12}}>Payments</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Reference</th><th>Status</th></tr></thead>
              <tbody>
                {inv.payments.map(p => (
                  <tr key={p.id}>
                    <td>{formatDate(p.paid_at)}</td><td>{p.method}</td><td>{formatCurrency(p.amount)}</td>
                    <td>{p.reference_note || '—'}</td>
                    <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {inv.state !== 'paid' && inv.state !== 'cancelled' && (
        <div className="card" style={{marginBottom:16}}>
          <h3 style={{marginBottom:12}}>Record Payment</h3>
          {payErr && <div className="alert alert-error">{payErr}</div>}
          <form onSubmit={recordPayment} className="form-row">
            <div className="form-group">
              <label className="form-label">Method</label>
              <select className="form-select" value={payForm.method} onChange={e => setPayForm(f=>({...f,method:e.target.value}))}>
                {['upi','credit_card','bank_transfer','wallet','cash'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount (leave blank = full)</label>
              <input className="form-input" type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(f=>({...f,amount:e.target.value}))} placeholder={inv.total} />
            </div>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label className="form-label">Reference Note</label>
              <input className="form-input" value={payForm.reference_note} onChange={e => setPayForm(f=>({...f,reference_note:e.target.value}))} />
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <button className="btn btn-primary" type="submit">Record Payment</button>
            </div>
          </form>
        </div>
      )}

      <div style={{display:'flex',gap:8}}>
        {inv.state === 'draft' && <button className="btn btn-primary btn-sm" onClick={confirm}>Confirm Invoice</button>}
        {inv.state !== 'paid' && inv.state !== 'cancelled' && <button className="btn btn-danger btn-sm" onClick={cancel}>Cancel Invoice</button>}
      </div>
    </>
  );
}
