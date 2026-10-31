"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterRole, setFilterRole] = useState("all");
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) return router.replace("/login");
    if (session.user.role !== "admin") return router.replace("/dashboard");
    loadUsers();
  }, [session, status, router]);

  async function loadUsers() {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setForm({ fullName: "", email: "", password: "" });
        loadUsers();
      } else {
        setError(data.error || "Failed to create user");
      }
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const filteredUsers = filterRole === "all"
    ? users
    : users.filter(u => u.role === filterRole);

  const roleBadges = {
    admin: "badge-closed",
    staff: "badge-confirmed",
    customer: "badge-draft",
  };

  return (
    <>
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1>User & Staff Access</h1>
          <p className="page-header-sub">Manage platform roles, administrative staff, and client accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <span>+ Add Staff Member</span>
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-2">
          {["all", "admin", "staff", "customer"].map(r => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterRole === r
                  ? "bg-primary text-white shadow-glow"
                  : "bg-input text-secondary hover:text-primary"
              }`}
            >
              {r === "all" ? "All Users" : r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-secondary py-8">
                    No users found matching filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td className="font-semibold text-primary">{u.fullName}</td>
                    <td className="text-secondary">{u.email}</td>
                    <td>
                      <span className={`badge ${roleBadges[u.role] || "badge-draft"} capitalize`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={u.isActive ? "text-success text-xs font-semibold" : "text-muted text-xs"}>
                        {u.isActive ? "● Active" : "○ Inactive"}
                      </span>
                    </td>
                    <td className="text-secondary text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Staff Member</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && (
                  <div className="mb-4 p-3 rounded bg-red-900/30 border border-red-500/50 text-red-300 text-sm">
                    {error}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    className="form-input"
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Staff Email</label>
                  <input
                    type="email"
                    required
                    placeholder="alex@brightloop.io"
                    className="form-input"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Temporary Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Must be >=9 chars, 1 uppercase, 1 special char"
                    className="form-input"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                  />
                  <p className="text-xs text-muted mt-1">
                    Requirements: at least 9 characters, 1 lowercase, 1 uppercase, and 1 special symbol.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Creating..." : "Create Staff Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
