import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { api, formatApiErrorDetail } from "../lib/api";
import { toast } from "sonner";
import Nav from "../components/Nav";

export default function Register() {
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "", role: "asha", hospital_id: "" });
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();

  useEffect(() => { api.get("/hospitals").then((r) => setHospitals(r.data)).catch(() => {}); }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (form.role !== "hospital") delete payload.hospital_id;
      const u = await register(payload);
      toast.success(`${t("login.welcome")}, ${u.name}`);
      if (u.role === "hospital") navigate("/hospital");
      else if (u.role === "patient") navigate("/me");
      else navigate("/asha/patients");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[color:var(--forest)]">{t("register.title")}</h1>
        <p className="text-base md:text-lg text-slate-700 mt-2">{t("register.sub")}</p>
        <form onSubmit={handleSubmit} className="mt-8 card-tactical p-6 space-y-5" data-testid="register-form">
          <div>
            <Label className="text-base">{t("register.iam")}</Label>
            <Select value={form.role} onValueChange={(v) => setField("role", v)}>
              <SelectTrigger className="h-12 text-lg mt-1" data-testid="register-role-select"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="asha" className="text-base" data-testid="role-option-asha">{t("register.asha")}</SelectItem>
                <SelectItem value="patient" className="text-base" data-testid="role-option-patient">{t("register.patient")}</SelectItem>
                <SelectItem value="hospital" className="text-base" data-testid="role-option-hospital">{t("register.hospital")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.role === "hospital" && (
            <div>
              <Label className="text-base">{t("register.hospital_label")}</Label>
              <Select value={form.hospital_id} onValueChange={(v) => setField("hospital_id", v)}>
                <SelectTrigger className="h-12 text-lg mt-1" data-testid="register-hospital-select"><SelectValue placeholder={t("register.selectHospital")} /></SelectTrigger>
                <SelectContent className="bg-white">
                  {hospitals.map((h) => <SelectItem key={h.id} value={h.id} className="text-base">{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div><Label className="text-base">{t("register.name")}</Label><Input className="h-12 text-lg mt-1" value={form.name} onChange={(e) => setField("name", e.target.value)} required data-testid="register-name-input" /></div>
          <div><Label className="text-base">{t("register.phone")}</Label><Input className="h-12 text-lg mt-1" value={form.phone} onChange={(e) => setField("phone", e.target.value)} data-testid="register-phone-input" /></div>
          <div><Label className="text-base">{t("register.email")}</Label><Input className="h-12 text-lg mt-1" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} required data-testid="register-email-input" /></div>
          <div><Label className="text-base">{t("register.password")}</Label><Input className="h-12 text-lg mt-1" type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} required data-testid="register-password-input" /></div>
          <Button disabled={loading} size="lg" type="submit" className="w-full h-14 text-lg bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]" data-testid="register-submit-button">
            {loading ? t("register.loading") : t("register.submit")}
          </Button>
          <p className="text-base text-slate-600 text-center">
            {t("register.have")} <Link to="/login" className="text-[color:var(--sage)] font-bold">{t("register.signin")}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
