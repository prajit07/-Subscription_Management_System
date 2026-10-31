import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { validateEmail, validatePassword } from '../../utils/validators';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', full_name: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [apiErr, setApiErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (validateEmail(form.email)) errs.email = validateEmail(form.email);
    if (!form.full_name) errs.full_name = 'Full name required';
    const pe = validatePassword(form.password); if (pe) errs.password = pe;
    if (form.confirm !== form.password) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setApiErr('');
    try { await register(form.email, form.full_name, form.password); nav('/portal'); }
    catch (err) { setApiErr(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><h1>Create Account</h1><p>Start your subscription today</p></div>
        {apiErr && <div className="alert alert-error">{apiErr}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={form.full_name} onChange={e => setForm(f=>({...f,full_name:e.target.value}))} /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></div>
          <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} /></div>
          <div className="form-group"><label className="form-label">Confirm Password</label><input className="form-input" type="password" value={form.confirm} onChange={e => setForm(f=>({...f,confirm:e.target.value}))} /></div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
        </form>
        <div className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></div>
      </div>
    </div>
  );
}

