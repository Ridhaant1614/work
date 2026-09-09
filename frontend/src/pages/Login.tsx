import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useToast } from "../toast";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { show } = useToast();
  const [email, setEmail] = useState("owner@soneja.com");
  const [password, setPassword] = useState("Soneja@123");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) { show("Enter email and password", "error"); return; }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate("/", { replace: true });
    } catch (err: any) {
      show(err?.message || "Login failed. Check credentials.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand-mark">SE</div>
        <h1>Soneja Electronics</h1>
        <p>Distribution CRM &amp; Trackers for Home Appliance Distributors (Worldtech TVs)</p>
        <div className="login-features">
          {[
            ["📊", "Live Dashboard KPIs"],
            ["🧾", "Sales & Purchase Orders"],
            ["💰", "Receivables & Payables Aging"],
            ["📦", "Auto Inventory Management"],
            ["🏪", "Dealer Network Directory"],
            ["📈", "Financial Reports"],
          ].map(([icon, label]) => (
            <div key={label} className="login-feature"><span>{icon}</span><span>{label}</span></div>
          ))}
        </div>
      </div>
      <div className="login-right">
        <form className="login-form-box" onSubmit={submit}>
          <h2>Welcome back 👋</h2>
          <p className="sub">Sign in to manage your distribution business</p>
          <div className="form-fields">
            <div className="field">
              <label>Email Address</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@business.com" autoComplete="email" />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" />
            </div>
            <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ marginTop: "var(--s2)", padding: "12px" }}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </div>
          <div className="login-hint">
            <strong>Owner demo:</strong> owner@soneja.com / Soneja@123
          </div>
        </form>
      </div>
    </div>
  );
}
