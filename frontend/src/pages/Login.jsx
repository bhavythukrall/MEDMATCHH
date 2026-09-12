import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { useAuth } from "../lib/auth";
import { formatApiErrorDetail } from "../lib/api";
import { toast } from "sonner";
import Nav from "../components/Nav";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}`);
      if (u.role === "hospital") navigate("/hospital");
      else if (u.role === "asha") navigate("/asha/patients");
      else navigate("/asha/patients");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fill = (e, p) => { setEmail(e); setPassword(p); };

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="font-display font-extrabold text-4xl text-[color:var(--forest)]">Login</h1>
        <p className="text-slate-600 mt-2">Access your Sanjeevani dashboard.</p>
        <form onSubmit={handleSubmit} className="mt-8 card-tactical p-6 space-y-4" data-testid="login-form">
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required data-testid="login-email-input" />
          </div>
          <div>
            <Label>Password</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required data-testid="login-password-input" />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]" data-testid="login-submit-button">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-sm text-slate-500 text-center">
            New here? <Link to="/register" className="text-[color:var(--sage)] font-semibold" data-testid="login-register-link">Create an account</Link>
          </p>
        </form>
        <div className="mt-6 card-tactical p-4 text-xs text-slate-600 space-y-2">
          <div className="font-semibold uppercase tracking-widest text-slate-500">Demo accounts</div>
          <button type="button" className="block underline hover:text-[color:var(--sage)]" onClick={() => fill("asha@sanjeevani.in", "Asha@2026")} data-testid="fill-asha-demo">Use ASHA worker (asha@sanjeevani.in / Asha@2026)</button>
          <button type="button" className="block underline hover:text-[color:var(--sage)]" onClick={() => fill("hospital@sanjeevani.in", "Hosp@2026")} data-testid="fill-hospital-demo">Use Hospital admin (hospital@sanjeevani.in / Hosp@2026)</button>
        </div>
      </div>
    </div>
  );
}
