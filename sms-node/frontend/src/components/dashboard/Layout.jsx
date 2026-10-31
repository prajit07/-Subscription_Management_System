import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const handleLogout = () => { logout(); nav('/login'); };
  const isCustomer = user?.role === 'customer';
  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const link = (to, label) => (
    <NavLink to={to} className={({isActive}) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setOpen(false)}>
      {label}
    </NavLink>
  );

  return (
    <div className="layout">
      {open && <div onClick={() => setOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:99}} />}
      <nav className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-logo"><h1>Brightloop</h1><span>Subscription Mgmt</span></div>
        <div className="sidebar-nav">
          {isCustomer ? (
            <>
              <div className="nav-section-label">My Account</div>
              {link('/portal', '🏠 Dashboard')}
              {link('/portal', '↻ Subscriptions')}
              {link('/portal', '📄 Invoices')}
            </>
          ) : (
            <>
              <div className="nav-section-label">Overview</div>
              {link('/dashboard', '▦ Dashboard')}
              <div className="nav-section-label">Billing</div>
              {link('/subscriptions', '↻ Subscriptions')}
              {link('/subscriptions/new', '+ New Subscription')}
              {link('/invoices', '📄 Invoices')}
              {link('/quotations', '📋 Quotations')}
              {link('/billing', '💳 Billing')}
              {link('/ar', '📊 AR Aging')}
              <div className="nav-section-label">Catalog</div>
              {link('/products', '📦 Products')}
              {link('/plans', '🗓 Plans')}
              {link('/discounts', '🏷 Discounts')}
              {user?.role === 'admin' && <>
                <div className="nav-section-label">Admin</div>
                {link('/admin/users', '⚙ Users')}
              </>}
            </>
          )}
        </div>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.full_name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Sign out</button>
        </div>
      </nav>
      <div className="main">
        <header className="topbar">
          <button className="btn btn-secondary btn-sm" onClick={() => setOpen(o => !o)}>☰</button>
          <span className="topbar-title">{isCustomer ? 'Customer Portal' : 'Operations'}</span>
        </header>
        <main className="page"><Outlet /></main>
      </div>
    </div>
  );
}

