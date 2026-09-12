import { useCallback, useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import Nav from "../components/Nav";
import { Stethoscope, Trash2, Plus } from "lucide-react";

const SPECIALTIES = [
  "cardiology", "orthopedics", "neurology", "obstetrics", "pediatrics", "general_surgery",
  "trauma", "burns", "poisoning", "internal_medicine", "pulmonology", "gastroenterology",
  "nephrology", "oncology", "ent", "ophthalmology", "psychiatry", "dermatology", "urology", "general",
];

const blank = { name: "", specialty: "general", qualification: "", phone: "", on_duty: true };

export default function HospitalDoctors() {
  const { user } = useAuth();
  const { t, specialty } = useT();
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!user?.hospital_id) return;
    api.get("/doctors", { params: { hospital_id: user.hospital_id } }).then((r) => setDoctors(r.data));
  }, [user?.hospital_id]);

  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/doctors", { ...form, hospital_id: user.hospital_id });
      toast.success(t("doctors.added"));
      setForm(blank);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setSaving(false); }
  };

  const toggleDuty = async (d) => {
    try {
      await api.patch(`/doctors/${d.id}`, { on_duty: !d.on_duty });
      toast.success(t("doctors.updated"));
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const remove = async (d) => {
    try {
      await api.delete(`/doctors/${d.id}`);
      toast.success(t("doctors.deleted"));
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  if (!user?.hospital_id) {
    return <div className="min-h-screen grain-bg"><Nav /><div className="p-10 text-lg text-slate-600">{t("hosp.notLinked")}</div></div>;
  }

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[color:var(--forest)]">{t("doctors.title")}</h1>
          <p className="text-base md:text-lg text-slate-700 mt-2 max-w-2xl">{t("doctors.sub")}</p>
        </div>

        <form onSubmit={add} className="card-tactical p-5 sm:p-6 grid md:grid-cols-2 gap-4" data-testid="add-doctor-form">
          <div><Label className="text-base">{t("doctors.name")}</Label><Input className="h-12 text-lg" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="doctor-name-input" /></div>
          <div>
            <Label className="text-base">{t("doctors.specialty")}</Label>
            <Select value={form.specialty} onValueChange={(v) => setForm({ ...form, specialty: v })}>
              <SelectTrigger className="h-12 text-lg" data-testid="doctor-specialty-select"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white max-h-72">
                {SPECIALTIES.map((s) => <SelectItem key={s} value={s} className="text-base">{specialty(s)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-base">{t("doctors.qualification")}</Label><Input className="h-12 text-lg" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} data-testid="doctor-qualification-input" /></div>
          <div><Label className="text-base">{t("doctors.phone")}</Label><Input className="h-12 text-lg" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="doctor-phone-input" /></div>
          <div className="flex items-center gap-3">
            <Switch checked={form.on_duty} onCheckedChange={(v) => setForm({ ...form, on_duty: v })} data-testid="doctor-onduty-switch" />
            <span className="text-base font-semibold">{form.on_duty ? t("doctors.onDuty") : t("doctors.offDuty")}</span>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" size="lg" disabled={saving} className="h-14 text-lg bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]" data-testid="add-doctor-button">
              <Plus size={22} className="mr-2" /> {saving ? t("doctors.adding") : t("doctors.add")}
            </Button>
          </div>
        </form>

        <div className="grid gap-3" data-testid="doctor-list">
          {doctors.length === 0 && <div className="card-tactical p-8 text-center text-lg text-slate-500">{t("doctors.empty")}</div>}
          {doctors.map((d) => (
            <div key={d.id} className="card-tactical p-5 flex items-center justify-between gap-4 flex-wrap" data-testid={`doctor-row-${d.id}`}>
              <div className="flex items-center gap-4">
                <span className="w-12 h-12 rounded-2xl bg-emerald-100 text-[color:var(--sage)] grid place-items-center"><Stethoscope size={24} /></span>
                <div>
                  <div className="font-display font-bold text-xl text-[color:var(--forest)]">{d.name}</div>
                  <div className="text-base text-slate-600">{specialty(d.specialty)}{d.qualification ? ` · ${d.qualification}` : ""}{d.phone ? ` · ${d.phone}` : ""}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={d.on_duty} onCheckedChange={() => toggleDuty(d)} data-testid={`doctor-duty-toggle-${d.id}`} />
                  <span className={`text-base font-bold ${d.on_duty ? "text-emerald-700" : "text-slate-400"}`}>{d.on_duty ? t("doctors.onDuty") : t("doctors.offDuty")}</span>
                </div>
                <Button variant="outline" size="lg" onClick={() => remove(d)} className="border-rose-300 text-rose-700 hover:bg-rose-50" data-testid={`doctor-delete-${d.id}`}>
                  <Trash2 size={20} className="mr-1.5" /> {t("doctors.remove")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
