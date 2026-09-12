import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAuth } from "../lib/auth";
import { api, formatApiErrorDetail } from "../lib/api";
import { toast } from "sonner";
import Nav from "../components/Nav";

export default function Register() {
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "", role: "asha", hospital_id: "" });
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
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
      toast.success(`Welcome, ${u.name}`);
      if (u.role === "hospital") navigate("/hospital");
      else navigate("/asha/patients");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="font-display font-extrabold text-4xl text-[color:var(--forest)]">Create account</h1>
        <p className="text-slate-600 mt-2">Choose your role to get started.</p>
        <form onSubmit={handleSubmit} className="mt-8 card-tactical p-6 space-y-4" data-testid="register-form">
          <div>
            <Label>I am a</Label>
            <Select value={form.role} onValueChange={(v) => setField("role", v)}>
              <SelectTrigger data-testid="register-role-select"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="asha" data-testid="role-option-asha">ASHA Worker</SelectItem>
                <SelectItem value="patient" data-testid="role-option-patient">Patient / Family</SelectItem>
                <SelectItem value="hospital" data-testid="role-option-hospital">Hospital Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.role === "hospital" && (
            <div>
              <Label>Hospital</Label>
              <Select value={form.hospital_id} onValueChange={(v) => setField("hospital_id", v)}>
                <SelectTrigger data-testid="register-hospital-select"><SelectValue placeholder="Select hospital" /></SelectTrigger>
                <SelectContent className="bg-white">
                  {hospitals.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Full name</Label><Input value={form.name} onChange={(e) => setField("name", e.target.value)} required data-testid="register-name-input" /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} data-testid="register-phone-input" /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} required data-testid="register-email-input" /></div>
          <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} required data-testid="register-password-input" /></div>
          <Button disabled={loading} type="submit" className="w-full bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]" data-testid="register-submit-button">
            {loading ? "Creating..." : "Create account"}
          </Button>
          <p className="text-sm text-slate-500 text-center">
            Have an account? <Link to="/login" className="text-[color:var(--sage)] font-semibold">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
