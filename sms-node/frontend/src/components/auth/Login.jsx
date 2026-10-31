import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { validateEmail } from '../../utils/validators';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiErr, setApiErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.email) errs.email = 'Email required';
    else if (validateEmail(form.email)) errs.email = validateEmail(form.email);
    if (!form.password) errs.password = 'Password required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setApiErr('');
    try {
      const user = await login(form.email, form.password);
      nav(user.role === 'customer' ? '/portal' : '/dashboard');
    } catch (err) {
      setApiErr(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><h1>Brightloop SMS</h1><p>Subscription Management</p></div>
        {apiErr && <div className="alert alert-error">{apiErr}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div className="auth-footer">
          <Link to="/forgot-password">Forgot password?</Link> · <Link to="/register">Create account</Link>
        </div>
        <div className="auth-footer" style={{marginTop:8,fontSize:'.75rem',color:'var(--brand-400)'}}>Demo: admin@brightloop.com / Admin@1234!</div>
      </div>
    </div>
  );
}

