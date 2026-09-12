import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import Nav from "../components/Nav";
import { BedDouble, Activity, Stethoscope, ClipboardList } from "lucide-react";

export default function HospitalDashboard() {
  const { user } = useAuth();
  const { t, specialty } = useT();
  const [hospital, setHospital] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.hospital_id) return;
    api.get(`/hospitals/${user.hospital_id}`).then((r) => {
      setHospital(r.data);
      setForm({
        available_beds: r.data.available_beds,
        total_beds: r.data.total_beds,
        available_icu: r.data.available_icu,
        total_icu: r.data.total_icu,
        emergency_available: r.data.emergency_available,
        phone: r.data.phone || "",
        specialties: (r.data.specialties || []).join(", "),
      });
    });
    api.get("/doctors", { params: { hospital_id: user.hospital_id } }).then((r) => setDoctors(r.data)).catch(() => {});
  }, [user?.hospital_id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/hospitals/${user.hospital_id}/availability`, {
        available_beds: Number(form.available_beds),
        total_beds: Number(form.total_beds),
        available_icu: Number(form.available_icu),
        total_icu: Number(form.total_icu),
        emergency_available: form.emergency_available,
        phone: form.phone,
        specialties: form.specialties.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
      });
      setHospital(data);
      toast.success(t("hosp.saved"));
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setSaving(false); }
  };

  if (!user?.hospital_id) {
    return <div className="min-h-screen grain-bg"><Nav /><div className="p-10 text-lg text-slate-600" data-testid="hospital-not-linked">{t("hosp.notLinked")}</div></div>;
  }
  if (!hospital || !form) return <div className="min-h-screen grain-bg"><Nav /><div className="p-10 text-lg">…</div></div>;

  const onDuty = doctors.filter((d) => d.on_duty);

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[color:var(--forest)]" data-testid="hospital-name">{hospital.name}</h1>
          <p className="text-base md:text-lg text-slate-700 mt-2">{hospital.address}, {hospital.city}, {hospital.state}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-tactical p-5">
            <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-slate-500 font-semibold"><BedDouble size={20} /> {t("hosp.bedsAvailable")}</div>
            <Input type="number" value={form.available_beds} onChange={(e) => set("available_beds", e.target.value)} className="mt-3 h-16 text-3xl font-display font-extrabold" data-testid="hospital-bed-count-input" />
          </div>
          <div className="card-tactical p-5">
            <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-slate-500 font-semibold"><BedDouble size={20} /> {t("hosp.totalBeds")}</div>
            <Input type="number" value={form.total_beds} onChange={(e) => set("total_beds", e.target.value)} className="mt-3 h-16 text-3xl font-display font-extrabold" data-testid="hospital-total-beds-input" />
          </div>
          <div className="card-tactical p-5">
            <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-slate-500 font-semibold"><Activity size={20} /> {t("hosp.icuAvailable")}</div>
            <Input type="number" value={form.available_icu} onChange={(e) => set("available_icu", e.target.value)} className="mt-3 h-16 text-3xl font-display font-extrabold" data-testid="hospital-icu-count-input" />
          </div>
          <div className="card-tactical p-5">
            <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-slate-500 font-semibold"><Activity size={20} /> {t("hosp.totalIcu")}</div>
            <Input type="number" value={form.total_icu} onChange={(e) => set("total_icu", e.target.value)} className="mt-3 h-16 text-3xl font-display font-extrabold" data-testid="hospital-total-icu-input" />
          </div>
        </div>

        <div className="card-tactical p-5 grid md:grid-cols-2 gap-5">
          <div>
            <Label className="text-base">{t("hosp.specialties")}</Label>
            <Input value={form.specialties} onChange={(e) => set("specialties", e.target.value)} className="h-12 text-lg mt-1" data-testid="hospital-specialties-input" />
            <p className="text-sm text-slate-500 mt-1">{t("hosp.specialtiesHint")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(hospital.specialties || []).map((s) => (
                <span key={s} className="pill text-sm font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">{specialty(s)}</span>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <Label className="text-base">{t("hosp.phone")}</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="h-12 text-lg mt-1" data-testid="hospital-phone-input" />
            </div>
            <div>
              <div className="text-sm uppercase tracking-widest text-slate-500 font-semibold">{t("hosp.emergency")}</div>
              <div className="mt-2 flex items-center gap-3">
                <Switch checked={form.emergency_available} onCheckedChange={(v) => set("emergency_available", v)} data-testid="hospital-emergency-switch" />
                <span className="text-base font-semibold">{form.emergency_available ? t("hosp.accepting") : t("hosp.full")}</span>
              </div>
            </div>
          </div>
        </div>

        <Button onClick={save} size="lg" disabled={saving} className="h-14 text-lg bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]" data-testid="update-availability-button">
          {saving ? t("hosp.saving") : t("hosp.save")}
        </Button>

        <div className="card-tactical p-5" data-testid="hospital-doctors-summary">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-slate-500 font-semibold"><Stethoscope size={20} /> {t("hosp.doctorsOnDuty")}</div>
              <div className="font-display font-extrabold text-4xl text-[color:var(--forest)] mt-1" data-testid="on-duty-count">{onDuty.length}<span className="text-xl text-slate-400">/{doctors.length}</span></div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link to="/hospital/doctors"><Button size="lg" variant="outline" className="h-14 text-lg border-2" data-testid="manage-doctors-link"><Stethoscope size={20} className="mr-2" /> {t("hosp.manageDoctors")}</Button></Link>
              <Link to="/hospital/referrals"><Button size="lg" variant="outline" className="h-14 text-lg border-2" data-testid="view-referrals-link"><ClipboardList size={20} className="mr-2" /> {t("hosp.viewReferrals")}</Button></Link>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {onDuty.map((d) => (
              <span key={d.id} className="pill text-sm font-semibold bg-white border border-emerald-900/15">{d.name} · {specialty(d.specialty)}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
