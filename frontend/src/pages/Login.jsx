import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { formatApiErrorDetail } from "../lib/api";
import { toast } from "sonner";
import Nav from "../components/Nav";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get("role");
  const roleLabel = role ? t(`register.${role}`) : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`${t("login.welcome")}, ${u.name}`);
      if (u.role === "hospital") navigate("/hospital");
      else if (u.role === "patient") navigate("/me");
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
      <div className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[color:var(--forest)]">{t("login.title")}</h1>
        {roleLabel ? (
          <p className="text-base md:text-lg text-slate-700 mt-2" data-testid="login-role-hint">
            {t("login.asRole")} <span className="font-bold text-[color:var(--sage)]">{roleLabel}</span>
          </p>
        ) : (
          <p className="text-base md:text-lg text-slate-700 mt-2">{t("login.sub")}</p>
        )}
        <form onSubmit={handleSubmit} className="mt-8 card-tactical p-6 space-y-5" data-testid="login-form">
          <div>
            <Label className="text-base">{t("login.email")}</Label>
            <Input className="h-12 text-lg mt-1" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required data-testid="login-email-input" />
          </div>
          <div>
            <Label className="text-base">{t("login.password")}</Label>
            <Input className="h-12 text-lg mt-1" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required data-testid="login-password-input" />
          </div>
          <Button type="submit" size="lg" disabled={loading} className="w-full h-14 text-lg bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]" data-testid="login-submit-button">
            {loading ? t("login.loading") : t("login.submit")}
          </Button>
          <p className="text-base text-slate-600 text-center">
            {t("login.newHere")} <Link to="/register" className="text-[color:var(--sage)] font-bold" data-testid="login-register-link">{t("login.createAccount")}</Link>
          </p>
        </form>
        <div className="mt-6 card-tactical p-4 text-sm text-slate-700 space-y-2">
          <div className="font-bold uppercase tracking-widest text-slate-500">{t("login.demo")}</div>
          <button type="button" className="block underline font-semibold hover:text-[color:var(--sage)]" onClick={() => fill("asha@sanjeevani.in", "Asha@2026")} data-testid="fill-asha-demo">{t("login.demoAsha")} (asha@sanjeevani.in)</button>
          <button type="button" className="block underline font-semibold hover:text-[color:var(--sage)]" onClick={() => fill("patient@sanjeevani.in", "Patient@2026")} data-testid="fill-patient-demo">{t("register.patient")} (patient@sanjeevani.in)</button>
          <button type="button" className="block underline font-semibold hover:text-[color:var(--sage)]" onClick={() => fill("hospital@sanjeevani.in", "Hosp@2026")} data-testid="fill-hospital-demo">{t("login.demoHospital")} (hospital@sanjeevani.in)</button>
        </div>
      </div>
    </div>
  );
}
