export const validatePassword = (val) => {
  if (!val) return 'Password is required';
  if (val.length < 8) return 'At least 8 characters required';
  if (!/[A-Z]/.test(val)) return 'Must include an uppercase letter';
  if (!/[a-z]/.test(val)) return 'Must include a lowercase letter';
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(val)) return 'Must include a special character';
  return null;
};
export const validateEmail = (val) => {
  if (!val) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Invalid email address';
  return null;
};
export const formatCurrency = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);
export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
