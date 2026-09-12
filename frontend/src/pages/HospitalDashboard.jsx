import { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import Nav from "../components/Nav";
import { BedDouble, Activity } from "lucide-react";

export default function HospitalDashboard() {
  const { user } = useAuth();
  const [hospital, setHospital] = useState(null);
  const [beds, setBeds] = useState(0);
  const [icu, setIcu] = useState(0);
  const [emergency, setEmergency] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.hospital_id) return;
    api.get(`/hospitals/${user.hospital_id}`).then((r) => {
      setHospital(r.data);
      setBeds(r.data.available_beds);
      setIcu(r.data.available_icu);
      setEmergency(r.data.emergency_available);
    });
  }, [user?.hospital_id]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/hospitals/${user.hospital_id}/availability`, {
        available_beds: Number(beds), available_icu: Number(icu), emergency_available: emergency,
      });
      setHospital(data);
      toast.success("Availability updated");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setSaving(false); }
  };

  if (!user?.hospital_id) {
    return <div className="min-h-screen grain-bg"><Nav /><div className="p-10 text-slate-600">Your account is not linked to a hospital.</div></div>;
  }
  if (!hospital) return <div className="min-h-screen grain-bg"><Nav /><div className="p-10">Loading…</div></div>;

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="font-display font-extrabold text-4xl text-[color:var(--forest)]">{hospital.name}</h1>
          <p className="text-slate-600 mt-1">{hospital.address}, {hospital.city}, {hospital.state}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="card-tactical p-5" data-testid="hospital-bed-count-input">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500"><BedDouble size={14} /> Beds available</div>
            <div className="mt-3 flex items-end gap-2">
              <Input type="number" value={beds} onChange={(e) => setBeds(e.target.value)} className="text-3xl font-display font-extrabold w-28" />
              <span className="text-slate-400 pb-2">/ {hospital.total_beds}</span>
            </div>
          </div>
          <div className="card-tactical p-5" data-testid="hospital-icu-count-input">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500"><Activity size={14} /> ICU available</div>
            <div className="mt-3 flex items-end gap-2">
              <Input type="number" value={icu} onChange={(e) => setIcu(e.target.value)} className="text-3xl font-display font-extrabold w-28" />
              <span className="text-slate-400 pb-2">/ {hospital.total_icu}</span>
            </div>
          </div>
          <div className="card-tactical p-5">
            <div className="text-xs uppercase tracking-widest text-slate-500">Emergency ready</div>
            <div className="mt-3 flex items-center gap-3">
              <Switch checked={emergency} onCheckedChange={setEmergency} data-testid="hospital-emergency-switch" />
              <span className="text-sm">{emergency ? "Accepting emergencies" : "Emergency ward full"}</span>
            </div>
          </div>
        </div>

        <div>
          <Button onClick={save} disabled={saving} className="bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]" data-testid="update-availability-button">
            {saving ? "Saving…" : "Update availability"}
          </Button>
        </div>

        <div className="card-tactical p-5">
          <div className="text-xs uppercase tracking-widest text-slate-500">Specialties</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {hospital.specialties.map((s) => (
              <span key={s} className="pill text-xs font-semibold uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-300">{s.replace(/_/g, " ")}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
