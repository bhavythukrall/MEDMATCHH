import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Nav from "../components/Nav";
import StatusBadge from "../components/StatusBadge";
import { useT } from "../lib/i18n";

export default function ReferralList() {
  const [rows, setRows] = useState([]);
  const [hospitals, setHospitals] = useState({});
  const { t, specialty } = useT();
  useEffect(() => {
    api.get("/referrals").then((r) => setRows(r.data));
    api.get("/hospitals").then((r) => setHospitals(Object.fromEntries(r.data.map((h) => [h.id, h.name]))));
  }, []);
  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[color:var(--forest)]">{t("referrals.title")}</h1>
        <p className="text-base md:text-lg text-slate-700 mt-2">{t("referrals.sub")}</p>
        <div className="mt-8 grid gap-3" data-testid="referral-list">
          {rows.length === 0 && <div className="card-tactical p-10 text-center text-lg text-slate-500">{t("referrals.empty")}</div>}
          {rows.map((r) => (
            <Link key={r.id} to={`/asha/referrals/${r.id}`} className="card-tactical p-5 flex items-center justify-between gap-4 flex-wrap hover:border-[color:var(--sage)] transition-colors" data-testid={`referral-row-${r.id}`}>
              <div>
                <div className="font-display font-bold text-xl text-[color:var(--forest)]">{t("referrals.referral")} {r.id.slice(0, 8)}</div>
                <div className="text-base text-slate-600 mt-0.5">→ {hospitals[r.hospital_id] || r.hospital_id.slice(0, 8)} · {specialty(r.required_specialty)}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{t("referrals.score")}</div>
                  <div className="font-mono font-bold text-lg text-[color:var(--forest)]">{r.match_score}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
