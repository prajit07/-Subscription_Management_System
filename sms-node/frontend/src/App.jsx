import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.jsx';
import Layout from './components/dashboard/Layout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// Pages
import Dashboard from './pages/Dashboard';
import Subscriptions from './pages/Subscriptions';
import SubscriptionDetail from './pages/SubscriptionDetail';
import NewSubscription from './pages/NewSubscription';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Products from './pages/Products';
import Plans from './pages/Plans';
import Discounts from './pages/Discounts';
import Users from './pages/Users';
import Portal from './pages/Portal';
import Quotations from './pages/Quotations';
import ArAging from './pages/ArAging';
import Billing from './pages/Billing';
import ForgotPassword from './pages/ForgotPassword';

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === 'customer' ? '/portal' : '/dashboard'} replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={user ? <Navigate to={user.role === 'customer' ? '/portal' : '/dashboard'} /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/portal" /> : <Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Customer portal */}
        <Route path="/portal" element={<Protected roles={['customer']}><Layout><Portal /></Layout></Protected>} />

        {/* Staff / Admin */}
        <Route path="/" element={<Protected roles={['admin','staff']}><Layout><Navigate to="/dashboard" /></Layout></Protected>} />
        <Route path="/dashboard"      element={<Protected roles={['admin','staff']}><Layout><Dashboard /></Layout></Protected>} />
        <Route path="/subscriptions" element={<Protected roles={['admin','staff']}><Layout><Subscriptions /></Layout></Protected>} />
        <Route path="/subscriptions/new" element={<Protected roles={['admin','staff']}><Layout><NewSubscription /></Layout></Protected>} />
        <Route path="/subscriptions/:id" element={<Protected roles={['admin','staff']}><Layout><SubscriptionDetail /></Layout></Protected>} />
        <Route path="/invoices" element={<Protected roles={['admin','staff']}><Layout><Invoices /></Layout></Protected>} />
        <Route path="/invoices/:id" element={<Protected roles={['admin','staff']}><Layout><InvoiceDetail /></Layout></Protected>} />
        <Route path="/products" element={<Protected roles={['admin','staff']}><Layout><Products /></Layout></Protected>} />
        <Route path="/plans" element={<Protected roles={['admin','staff']}><Layout><Plans /></Layout></Protected>} />
        <Route path="/discounts" element={<Protected roles={['admin']}><Layout><Discounts /></Layout></Protected>} />
        <Route path="/quotations" element={<Protected roles={['admin','staff']}><Layout><Quotations /></Layout></Protected>} />
        <Route path="/ar" element={<Protected roles={['admin','staff']}><Layout><ArAging /></Layout></Protected>} />
        <Route path="/billing" element={<Protected roles={['admin','staff']}><Layout><Billing /></Layout></Protected>} />
        <Route path="/admin/users" element={<Protected roles={['admin']}><Layout><Users /></Layout></Protected>} />

        <Route path="*" element={<Navigate to={user ? (user.role === 'customer' ? '/portal' : '/dashboard') : '/login'} />} />
      </Routes>
    </BrowserRouter>
  );
}

