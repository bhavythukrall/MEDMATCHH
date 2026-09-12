import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Ambulance, Stethoscope, Users, Sparkles, Siren } from "lucide-react";
import Nav from "../components/Nav";
import { useT } from "../lib/i18n";

export default function Landing() {
  const { t } = useT();
  const features = [
    { icon: Users, title: t("landing.f1t"), body: t("landing.f1b") },
    { icon: Stethoscope, title: t("landing.f2t"), body: t("landing.f2b") },
    { icon: Ambulance, title: t("landing.f3t"), body: t("landing.f3b") },
  ];
  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <section className="relative overflow-hidden hero-noise">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-14 lg:py-24 grid lg:grid-cols-12 gap-10 items-center">
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
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/sos" data-testid="hero-cta-sos">
                <Button size="lg" className="h-14 text-lg px-7 font-bold bg-[color:var(--terracotta)] hover:bg-[color:var(--terracotta)]/90">
                  <Siren size={22} className="mr-2" /> {t("landing.ctaSos")}
                </Button>
              </Link>
              <Link to="/register" data-testid="hero-cta-register">
                <Button size="lg" className="h-14 text-lg px-7 bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]">{t("landing.ctaRegister")}</Button>
              </Link>
              <Link to="/login" data-testid="hero-cta-login">
                <Button size="lg" variant="outline" className="h-14 text-lg px-7 border-2">{t("landing.ctaLogin")}</Button>
              </Link>
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

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-24 pt-10 grid md:grid-cols-3 gap-6">
        {features.map((f) => (
          <div key={f.title} className="card-tactical p-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[color:var(--sage)] grid place-items-center"><f.icon size={28} /></div>
            <h3 className="mt-4 font-display font-bold text-xl text-[color:var(--forest)]">{f.title}</h3>
            <p className="mt-2 text-base text-slate-700 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
