import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', full_name: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/users').then(r => setUsers(r.data.data || [])).finally(() => setLoading(false));
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/auth/staff', { ...form });
      setShow(false); setForm({ email: '', full_name: '', password: '' }); load();
    } catch (e) { setError(e.response?.data?.error || 'Failed'); }
  };

  const toggle = async (u) => {
    try { await api.patch(`/users/${u.id}`, { is_active: !u.is_active }); load(); }
    catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <button className="btn btn-primary" onClick={() => setShow(true)}>+ Add Staff</button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add Staff Member</div>
            <form onSubmit={submit} className="auth-form">
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={form.full_name} onChange={e => setForm(f=>({...f,full_name:e.target.value}))} required /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} required /></div>
              <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} required /></div>
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
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{fontWeight:600}}>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td><span className="badge badge-draft">{u.role}</span></td>
                    <td><span className={`badge ${u.is_active ? 'badge-active' : 'badge-cancelled'}`}>{u.is_active ? 'active' : 'inactive'}</span></td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>{u.role !== 'admin' && <button className="btn btn-secondary btn-sm" onClick={() => toggle(u)}>{u.is_active ? 'Deactivate' : 'Activate'}</button>}</td>
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