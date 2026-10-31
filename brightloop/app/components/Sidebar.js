"use client";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

const adminStaffLinks = [
  { href: "/dashboard", icon: "📊", label: "Dashboard" },
  { href: "/products", icon: "📦", label: "Products" },
  { href: "/plans", icon: "🔄", label: "Plans" },
  { href: "/subscriptions", icon: "📋", label: "Subscriptions" },
  { href: "/invoices", icon: "🧾", label: "Invoices" },
  { href: "/discounts", icon: "🏷️", label: "Discounts" },
  { href: "/taxes", icon: "💰", label: "Taxes" },
  { href: "/templates", icon: "📝", label: "Templates" },
  { href: "/reports", icon: "📈", label: "Reports" },
];

const adminOnlyLinks = [
  { href: "/users", icon: "👥", label: "Users" },
];

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (!session) return null;

  const { role, name } = session.user;
  const isAdmin = role === "admin";
  const isStaff = role === "staff";
  const isCustomer = role === "customer";

  const links = isCustomer
    ? [{ href: "/portal", icon: "🏠", label: "My Portal" }]
    : [...adminStaffLinks, ...(isAdmin ? adminOnlyLinks : [])];

  const initials = (name || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <button className="mobile-toggle" onClick={() => setOpen(!open)}>
        {open ? "✕" : "☰"}
      </button>
      <div className={`mobile-overlay ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">B</div>
          <span className="sidebar-brand-text">Brightloop</span>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">
            {isCustomer ? "Portal" : "Management"}
          </div>
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link ${pathname === link.href || pathname.startsWith(link.href + "/") ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className="sidebar-link-icon">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{name}</div>
            <div className="sidebar-user-role">{role}</div>
          </div>
          <button className="sidebar-logout" onClick={() => signOut({ callbackUrl: "/login" })}>
            ↗ Out
          </button>
        </div>
      </aside>
    </>
  );
}
