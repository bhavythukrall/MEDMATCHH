import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useT } from "../lib/i18n";
import { Button } from "../components/ui/button";
import Nav from "../components/Nav";
import { Plus, UserRound, History } from "lucide-react";

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const { t } = useT();
  useEffect(() => { api.get("/patients").then((r) => setPatients(r.data)); }, []);
  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[color:var(--forest)]">{t("patients.title")}</h1>
            <p className="text-base md:text-lg text-slate-700 mt-2 max-w-2xl">{t("patients.sub")}</p>
          </div>
          <Link to="/asha/patients/new" data-testid="new-patient-link">
            <Button size="lg" className="h-14 text-lg px-6 bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]"><Plus size={22} className="mr-2" /> {t("patients.new")}</Button>
          </Link>
        </div>
        <div className="mt-8 grid gap-4" data-testid="patient-list">
          {patients.length === 0 && (
            <div className="card-tactical p-10 text-center text-lg text-slate-500">{t("patients.empty")}</div>
          )}
          {patients.map((p) => (
            <Link key={p.id} to={`/asha/patients/${p.id}`} className="card-tactical p-5 flex items-center justify-between gap-4 flex-wrap hover:border-[color:var(--sage)] transition-colors" data-testid={`patient-row-${p.id}`}>
              <div className="flex items-center gap-4">
                <span className="w-12 h-12 rounded-full bg-emerald-100 text-[color:var(--sage)] grid place-items-center"><UserRound size={26} /></span>
                <div>
                  <div className="font-display font-bold text-xl text-[color:var(--forest)]">{p.name}</div>
                  <div className="text-base text-slate-600">{p.age} {t("patients.years")} · {p.gender} · {p.village || p.district || "—"}</div>
                </div>
              </div>
              <div className="text-base text-slate-700 max-w-md truncate">{p.symptoms || t("patients.noSymptoms")}</div>
              <div className="flex items-center gap-3">
                <span className={`pill text-sm font-bold border ${p.severity === "critical" ? "bg-rose-100 text-rose-800 border-rose-300" : p.severity === "mild" ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-amber-100 text-amber-900 border-amber-300"}`}>{t(`create.${p.severity}`)}</span>
                <span className="inline-flex items-center gap-1.5 text-base font-semibold text-[color:var(--sage)]"><History size={20} /> {t("patients.viewHistory")}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
