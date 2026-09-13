import { Link } from "react-router-dom";
import { Users, Stethoscope, Building2, Sparkles, ArrowRight } from "lucide-react";
import Nav from "../components/Nav";
import { useT } from "../lib/i18n";

export default function Landing() {
  const { t } = useT();
  const roles = [
    { key: "asha", icon: Users, title: t("landing.cardAsha"), body: t("landing.cardAshaBody") },
    { key: "patient", icon: Stethoscope, title: t("landing.cardPatient"), body: t("landing.cardPatientBody") },
    { key: "hospital", icon: Building2, title: t("landing.cardHospital"), body: t("landing.cardHospitalBody") },
  ];
  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <section className="relative overflow-hidden hero-noise">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12 lg:py-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 pill bg-white border border-emerald-900/10 text-sm uppercase tracking-widest text-[color:var(--sage)] font-bold">
              <Sparkles size={16} /> {t("landing.badge")}
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-[color:var(--forest)] leading-[1.02] tracking-tight">
              {t("landing.title1")} <br />
              <span className="text-[color:var(--terracotta)]">{t("landing.title2")}</span><br />
              {t("landing.title3")}
            </h1>
            <p className="mt-6 text-base md:text-lg text-slate-700 max-w-2xl leading-relaxed">{t("landing.sub")}</p>

            <div className="mt-8">
              <div className="text-sm uppercase tracking-widest text-slate-500 font-bold">{t("landing.chooseRole")}</div>
              <div className="mt-4 grid sm:grid-cols-3 gap-4" data-testid="role-cards">
                {roles.map((r) => (
                  <Link
                    key={r.key}
                    to={`/login?role=${r.key}`}
                    className="card-tactical p-5 group hover:border-[color:var(--sage)] hover:-translate-y-1 transition-transform transition-colors duration-200"
                    data-testid={`role-card-${r.key}`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[color:var(--sage)] grid place-items-center group-hover:bg-[color:var(--sage)] group-hover:text-white transition-colors">
                      <r.icon size={28} />
                    </div>
                    <h3 className="mt-4 font-display font-bold text-xl text-[color:var(--forest)]">{r.title}</h3>
                    <p className="mt-2 text-base text-slate-700 leading-relaxed">{r.body}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-base font-bold text-[color:var(--sage)]">
                      {t("landing.tapToLogin")} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative">
              <img
                alt="ASHA worker at rural clinic"
                src="https://images.unsplash.com/photo-1581056771107-24ca5f033842?crop=entropy&cs=srgb&fm=jpg&q=85"
                className="rounded-3xl border border-emerald-900/10 shadow-xl object-cover w-full h-[340px] sm:h-[440px]"
              />
              <div className="absolute -bottom-6 left-2 sm:-left-6 card-tactical p-4 shadow-lg w-64">
                <div className="text-xs uppercase tracking-widest text-[color:var(--slate-500)] font-semibold">{t("landing.liveMatch")}</div>
                <div className="mt-1 font-display font-extrabold text-3xl text-[color:var(--forest)]">92<span className="text-lg text-slate-400">/100</span></div>
                <div className="text-sm text-slate-600 mt-1">{t("spec.cardiology")} · 3 ICU · 7.2 km</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
