import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Ambulance, Stethoscope, Users, Sparkles } from "lucide-react";
import Nav from "../components/Nav";

export default function Landing() {
  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <section className="relative overflow-hidden hero-noise">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 pill bg-white border border-emerald-900/10 text-xs uppercase tracking-widest text-[color:var(--sage)] font-semibold">
              <Sparkles size={14} /> AI-guided rural triage
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-[color:var(--forest)] leading-[0.95] tracking-tight">
              From village door <br/>
              <span className="text-[color:var(--terracotta)]">to the right hospital,</span><br/>
              in minutes — not hours.
            </h1>
            <p className="mt-6 text-lg text-slate-700 max-w-2xl leading-relaxed">
              Sanjeevani Care connects ASHA workers, patients, and district hospitals with an AI matching engine that ranks
              hospitals by specialty, bed availability, ICU capacity and distance — then dispatches an ambulance the moment
              the hospital says <span className="font-semibold text-[color:var(--sage)]">Accepted</span>.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" data-testid="hero-cta-register"><Button size="lg" className="bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]">Create an account</Button></Link>
              <Link to="/login" data-testid="hero-cta-login"><Button size="lg" variant="outline">Login</Button></Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="relative">
              <img
                alt="ASHA worker at rural clinic"
                src="https://images.unsplash.com/photo-1581056771107-24ca5f033842?crop=entropy&cs=srgb&fm=jpg&q=85"
                className="rounded-3xl border border-emerald-900/10 shadow-xl object-cover w-full h-[440px]"
              />
              <div className="absolute -bottom-6 -left-6 card-tactical p-4 shadow-lg w-64">
                <div className="text-xs uppercase tracking-widest text-[color:var(--slate-500)]">Live match score</div>
                <div className="mt-1 font-display font-extrabold text-3xl text-[color:var(--forest)]">92<span className="text-lg text-slate-400">/100</span></div>
                <div className="text-xs text-slate-600 mt-1">Cardiology · 3 ICU · 7.2 km</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-12 pb-24 grid md:grid-cols-3 gap-6">
        {[
          { icon: Users, title: "ASHA-first workflow", body: "Register patients, capture symptoms, upload reports — all from a phone."},
          { icon: Stethoscope, title: "Smart hospital match", body: "Rule engine + Claude Sonnet triage picks the right specialty."},
          { icon: Ambulance, title: "One-tap ambulance", body: "Dispatch the moment the hospital accepts. Track every leg."},
        ].map((f) => (
          <div key={f.title} className="card-tactical p-6">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[color:var(--sage)] grid place-items-center"><f.icon /></div>
            <h3 className="mt-4 font-display font-bold text-xl text-[color:var(--forest)]">{f.title}</h3>
            <p className="mt-2 text-slate-600 text-sm leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
