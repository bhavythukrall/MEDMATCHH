import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import Nav from "../components/Nav";
import { UserRound, Plus, HeartPulse } from "lucide-react";

export default function FamilyHome() {
  const { user } = useAuth();
  const { t } = useT();
  const [people, setPeople] = useState([]);

  useEffect(() => { api.get("/patients").then((r) => setPeople(r.data)); }, []);

  const hasSelf = people.some((p) => p.relationship === "self");

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[color:var(--forest)]" data-testid="family-heading">{t("family.who")}</h1>
        <p className="text-base md:text-lg text-slate-700 mt-2 max-w-2xl">{t("family.whoSub")}</p>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="family-list">
          {!hasSelf && (
            <Link
              to={`/me/add?relationship=self&name=${encodeURIComponent(user?.name || "")}`}
              className="card-tactical p-6 group hover:border-[color:var(--sage)] hover:-translate-y-1 transition-transform transition-colors"
              data-testid="family-card-me-setup"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[color:var(--sage)] grid place-items-center group-hover:bg-[color:var(--sage)] group-hover:text-white transition-colors"><UserRound size={32} /></div>
              <div className="mt-4 font-display font-bold text-2xl text-[color:var(--forest)]">{t("family.me")}</div>
              <div className="text-base text-slate-600 mt-1">{t("family.meSub")}</div>
            </Link>
          )}

          {people.map((p) => (
            <Link
              key={p.id}
              to={`/me/${p.id}`}
              className="card-tactical p-6 group hover:border-[color:var(--sage)] hover:-translate-y-1 transition-transform transition-colors"
              data-testid={`family-card-${p.id}`}
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[color:var(--sage)] grid place-items-center group-hover:bg-[color:var(--sage)] group-hover:text-white transition-colors"><UserRound size={32} /></div>
              <div className="mt-4 font-display font-bold text-2xl text-[color:var(--forest)]">
                {p.relationship === "self" ? t("family.me") : p.name}
              </div>
              <div className="text-base text-slate-600 mt-1">
                {p.relationship ? t(`rel.${p.relationship}`) : t("rel.other")} · {p.age} {t("patients.years")}
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-base font-bold text-[color:var(--sage)]">
                <HeartPulse size={20} /> {t("family.useFor")} {p.relationship === "self" ? t("family.me") : p.name}
              </div>
            </Link>
          ))}

          <Link to="/me/add" className="card-tactical p-6 border-dashed border-2 grid place-items-center text-center hover:border-[color:var(--sage)] transition-colors" data-testid="add-family-member-button">
            <div>
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[color:var(--sage)] text-white grid place-items-center"><Plus size={32} /></div>
              <div className="mt-4 font-display font-bold text-xl text-[color:var(--forest)]">{t("family.add")}</div>
            </div>
          </Link>
        </div>

        {people.length === 0 && <p className="mt-6 text-base text-slate-500">{t("family.emptyHint")}</p>}
      </div>
    </div>
  );
}
