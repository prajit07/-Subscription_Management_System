"use client";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(params.get("error") ? "Invalid credentials" : "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">B</div>
          <span className="auth-logo-text">Brightloop</span>
        </div>
        <h2 className="auth-title">Welcome back</h2>
        {error && <div className="alert alert-error">⚠ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@brightloop.com"
              required
              id="login-email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              id="login-password"
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading} id="login-submit">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="auth-footer">
          Don&apos;t have an account? <Link href="/register">Create one</Link>
        </div>
        <div className="auth-demo flex flex-col gap-2 pt-2">
          <div className="text-xs text-muted text-center mb-1">Quick Demo Autofill:</div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary text-xs py-1 flex-1 justify-center"
              onClick={() => { setEmail("admin@brightloop.io"); setPassword("Admin@12345"); }}
            >
              👑 Admin Demo
            </button>
            <button
              type="button"
              className="btn btn-secondary text-xs py-1 flex-1 justify-center"
              onClick={() => { setEmail("acme@corp.com"); setPassword("Customer@123"); }}
            >
              🏢 Client Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="loading-spinner"><div className="spinner"></div></div>}>
      <LoginForm />
    </Suspense>
  );
}
