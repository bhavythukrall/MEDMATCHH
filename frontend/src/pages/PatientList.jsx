import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import Nav from "../components/Nav";
import { Plus, UserRound } from "lucide-react";

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  useEffect(() => { api.get("/patients").then((r) => setPatients(r.data)); }, []);
  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-extrabold text-4xl text-[color:var(--forest)]">Patients</h1>
            <p className="text-slate-600 mt-1">Register new patients and start referrals.</p>
          </div>
          <Link to="/asha/patients/new" data-testid="new-patient-link">
            <Button className="bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]"><Plus size={16} className="mr-1" /> New patient</Button>
          </Link>
        </div>
        <div className="mt-8 grid gap-4" data-testid="patient-list">
          {patients.length === 0 && (
            <div className="card-tactical p-10 text-center text-slate-500">No patients yet. Create your first one.</div>
          )}
          {patients.map((p) => (
            <Link key={p.id} to={`/asha/patients/${p.id}`} className="card-tactical p-5 flex items-center justify-between hover:border-[color:var(--sage)] transition" data-testid={`patient-row-${p.id}`}>
              <div className="flex items-center gap-4">
                <span className="w-10 h-10 rounded-full bg-emerald-100 text-[color:var(--sage)] grid place-items-center"><UserRound /></span>
                <div>
                  <div className="font-display font-bold text-lg text-[color:var(--forest)]">{p.name}</div>
                  <div className="text-sm text-slate-500">{p.age} yrs · {p.gender} · {p.village || p.district || "Rural"}</div>
                </div>
              </div>
              <div className="text-sm text-slate-600 max-w-xl truncate">{p.symptoms || "No symptoms recorded"}</div>
              <span className={`pill text-xs font-semibold uppercase tracking-widest border ${p.severity === "critical" ? "bg-rose-100 text-rose-800 border-rose-300" : p.severity === "mild" ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-amber-100 text-amber-900 border-amber-300"}`}>{p.severity}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
