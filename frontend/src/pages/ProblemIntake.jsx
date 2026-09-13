import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { useT } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import Nav from "../components/Nav";
import CareNeedCard from "../components/CareNeedCard";
import VoiceInputButton from "../components/VoiceInputButton";
import { Search, Siren, MapPin, BedDouble, Activity, Phone, Building2, UserRound, Clock } from "lucide-react";

export default function ProblemIntake() {
  const { id } = useParams();
  const { t, specialty, lang } = useT();
  const [person, setPerson] = useState(null);
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { api.get(`/patients/${id}`).then((r) => setPerson(r.data)); }, [id]);

  const search = async (isEmergency) => {
    const q = problem.trim();
    if (!q) return toast.error(t("family.needProblem"));
    setLoading(true);
    setEmergency(isEmergency);
    try {
      const { data } = await api.post("/sos/triage", {
        problem: q,
        latitude: person?.latitude || 0,
        longitude: person?.longitude || 0,
        severity: isEmergency ? "critical" : "moderate",
        max_results: 5,
      });
      setResult(data);
      api.patch(`/patients/${id}`, { symptoms: q, severity: isEmergency ? "critical" : "moderate" }).catch(() => {});
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  const label = person ? (person.relationship === "self" ? t("family.me") : person.name) : "";

  if (!person) return <div className="min-h-screen grain-bg"><Nav /><div className="p-10 text-lg">…</div></div>;

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-5">
        <div>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[color:var(--forest)]" data-testid="intake-heading">
            {t("family.helpTitle")} {label}?
          </h1>
          {person && (
            <p className="text-base md:text-lg text-slate-700 mt-2">
              {person.relationship ? t(`rel.${person.relationship}`) : t("rel.other")} · {person.age} {t("patients.years")}
            </p>
          )}
        </div>

        <div className="card-tactical p-5 sm:p-6 space-y-4" data-testid="problem-intake-form">
          <div className="text-lg font-bold text-[color:var(--forest)]">{t("family.problemQ")}</div>
          <Textarea
            rows={3}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder={t("family.typeProblem")}
            className="text-xl p-4 leading-relaxed"
            data-testid="problem-text-input"
          />
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold uppercase tracking-widest text-slate-400">{t("family.or")}</span>
            <VoiceInputButton onText={(text) => setProblem((prev) => (prev ? `${prev} ${text}` : text))} />
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button size="lg" onClick={() => search(false)} disabled={loading} className="h-14 text-lg px-7 bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]" data-testid="find-hospital-button">
              <Search size={22} className="mr-2" /> {loading && !emergency ? t("sos.understanding") : t("family.findHospital")}
            </Button>
            <Button size="lg" onClick={() => search(true)} disabled={loading} className="h-14 text-lg px-7 bg-[color:var(--terracotta)] hover:bg-[color:var(--terracotta)]/90 font-bold" data-testid="emergency-help-button">
              <Siren size={22} className="mr-2" /> {t("family.emergency")}
            </Button>
          </div>
        </div>

        {result && (
          <div className="space-y-4" data-testid="intake-results">
            {emergency && (
              <div className="card-tactical p-5 border-2 border-[color:var(--terracotta)] flex items-center justify-between gap-4 flex-wrap" data-testid="emergency-banner">
                <div className="font-display font-bold text-xl text-[color:var(--terracotta)]">
                  {t("family.emergencyFor")} {label}
                </div>
                <a href="tel:108" className="pill bg-[color:var(--terracotta)] text-white font-bold text-base inline-flex items-center gap-2" data-testid="call-108-button">
                  <Phone size={20} /> {t("family.call108")}
                </a>
              </div>
            )}

            <CareNeedCard result={result} title={person?.relationship === "self" ? t("care.title") : `${t("care.titleOther")} — ${label}`} />

            {result.matches.length > 0 && (
              <h2 className="font-display font-bold text-lg md:text-lg text-[color:var(--forest)]" data-testid="intake-results-heading">{t("care.bestHospitals")}</h2>
            )}

            {result.matches.map((m, idx) => (
              <div key={m.hospital.id} className="card-tactical p-5" data-testid={`intake-hospital-card-${idx}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[color:var(--sage)] grid place-items-center font-display font-extrabold text-xl">{idx + 1}</div>
                    <div>
                      <div className="flex items-center gap-2 font-display font-bold text-2xl text-[color:var(--forest)]"><Building2 size={22} /> {m.hospital.name}</div>
                      <div className="text-base text-slate-600 mt-1">{m.hospital.address}, {m.hospital.city}</div>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-base font-semibold text-slate-700">
                        <span className="inline-flex items-center gap-1.5"><BedDouble size={20} className="text-[color:var(--sage)]" /> {m.hospital.available_beds}/{m.hospital.total_beds} {t("sos.beds")}</span>
                        <span className="inline-flex items-center gap-1.5"><Activity size={20} className="text-[color:var(--terracotta)]" /> {m.hospital.available_icu}/{m.hospital.total_icu} {t("sos.icu")}</span>
                        <span className="inline-flex items-center gap-1.5"><MapPin size={20} className="text-slate-500" /> {m.distance_km} km</span>
                        <span className="inline-flex items-center gap-1.5"><Clock size={20} className="text-slate-500" /> {t("family.eta")}: {Math.max(5, Math.round((m.distance_km / 40) * 60))} {t("family.min")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-widest text-slate-500">{t("detail.score")}</div>
                    <div className="font-display font-extrabold text-4xl text-[color:var(--forest)]" data-testid={`intake-score-${idx}`}>{m.match_score}</div>
                  </div>
                </div>

                <div className="mt-4 border-t pt-4">
                  <div className="text-sm uppercase tracking-widest text-slate-500 font-semibold">{t("sos.doctorsOnDuty")}</div>
                  {m.on_duty_doctors.length === 0 ? (
                    <div className="mt-2 text-base text-rose-700 font-semibold">{t("sos.noDoctors")}</div>
                  ) : (
                    <ul className="mt-2 grid sm:grid-cols-2 gap-2">
                      {m.on_duty_doctors.map((d) => (
                        <li key={d.id} className="flex items-center gap-2 text-base text-slate-800">
                          <UserRound size={20} className="text-[color:var(--sage)]" />
                          <span className="font-semibold">{d.name}</span>
                          <span className="text-sm text-slate-500">· {specialty(d.specialty)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${m.hospital.latitude},${m.hospital.longitude}`}
                      target="_blank" rel="noreferrer"
                      className="pill bg-[color:var(--forest)] text-white font-bold text-base inline-flex items-center gap-2"
                      data-testid={`intake-map-link-${idx}`}
                    >
                      <MapPin size={20} /> {t("family.openMap")}
                    </a>
                    {m.hospital.phone && (
                      <a href={`tel:${m.hospital.phone}`} className="pill bg-[color:var(--sage)] text-white font-bold text-base inline-flex items-center gap-2" data-testid={`intake-call-button-${idx}`}>
                        <Phone size={20} /> {t("sos.call")}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
