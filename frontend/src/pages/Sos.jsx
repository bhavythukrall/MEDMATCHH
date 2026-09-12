import { useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { useT } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import Nav from "../components/Nav";
import { Siren, MapPin, Stethoscope, BedDouble, Activity, Phone, Building2, UserRound } from "lucide-react";

const CHIPS = [
  { en: "Chest pain", hi: "सीने में दर्द", value: "सीने में दर्द chest pain" },
  { en: "Miscarriage / pregnancy", hi: "गर्भपात / गर्भावस्था", value: "गर्भपात miscarriage" },
  { en: "Skin problem", hi: "त्वचा की समस्या", value: "skin problem त्वचा" },
  { en: "Migraine / headache", hi: "माइग्रेन / सिरदर्द", value: "migraine माइग्रेन" },
  { en: "Accident / injury", hi: "दुर्घटना / चोट", value: "accident दुर्घटना चोट" },
  { en: "Breathing trouble", hi: "सांस लेने में तकलीफ़", value: "breathless सांस लेने में तकलीफ" },
  { en: "Snake bite", hi: "सांप ने काटा", value: "snake bite सांप ने काटा" },
  { en: "Child is sick", hi: "बच्चा बीमार है", value: "बच्चा child fever" },
];

export default function Sos() {
  const { t, specialty, lang } = useT();
  const [problem, setProblem] = useState("");
  const [coords, setCoords] = useState({ latitude: 0, longitude: 0 });
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const useLocation = () => {
    if (!navigator.geolocation) return toast.error(t("sos.locationFail"));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        setLocating(false);
        toast.success(t("sos.locationSet"));
      },
      () => { setLocating(false); toast.error(t("sos.locationFail")); },
      { timeout: 8000 }
    );
  };

  const triage = async (text) => {
    const q = (text ?? problem).trim();
    if (!q) return toast.error(t("sos.needProblem"));
    setLoading(true);
    try {
      const { data } = await api.post("/sos/triage", { problem: q, ...coords, severity: "critical", max_results: 5 });
      setResult(data);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="flex items-start gap-4">
          <span className="grid place-items-center w-16 h-16 rounded-2xl bg-[color:var(--terracotta)] text-white shrink-0 sos-pulse">
            <Siren size={34} />
          </span>
          <div>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[color:var(--forest)]">{t("sos.title")}</h1>
            <p className="text-base md:text-lg text-slate-700 mt-2 max-w-2xl leading-relaxed">{t("sos.sub")}</p>
          </div>
        </div>

        <div className="card-tactical p-5 sm:p-6 space-y-4" data-testid="sos-form">
          <Textarea
            rows={3}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder={t("sos.placeholder")}
            className="text-xl p-4 leading-relaxed"
            data-testid="sos-problem-input"
          />
          <div>
            <div className="text-sm font-semibold uppercase tracking-widest text-slate-500">{t("sos.quick")}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {CHIPS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => { setProblem(c.value); triage(c.value); }}
                  className="pill border-2 border-emerald-900/15 bg-white text-base font-semibold hover:border-[color:var(--sage)] hover:bg-emerald-50 transition-colors"
                  data-testid={`sos-chip-${c.en.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                >
                  {lang === "hi" ? c.hi : c.en}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button size="lg" onClick={() => triage()} disabled={loading} className="text-lg h-14 px-7 bg-[color:var(--terracotta)] hover:bg-[color:var(--terracotta)]/90 font-bold" data-testid="sos-submit-button">
              <Siren size={22} className="mr-2" /> {loading ? t("sos.finding") : t("sos.find")}
            </Button>
            <Button size="lg" variant="outline" onClick={useLocation} disabled={locating} className="text-lg h-14 px-6 border-2" data-testid="sos-location-button">
              <MapPin size={22} className="mr-2" /> {locating ? t("sos.locating") : t("sos.useLocation")}
            </Button>
          </div>
        </div>

        {!result && <div className="card-tactical p-8 text-center text-slate-500 text-lg">{t("sos.empty")}</div>}

        {result && (
          <div className="space-y-4" data-testid="sos-results">
            <div className="card-tactical p-5 flex items-center gap-4 flex-wrap">
              <span className="grid place-items-center w-14 h-14 rounded-2xl bg-emerald-100 text-[color:var(--sage)]"><Stethoscope size={28} /></span>
              <div>
                <div className="text-sm uppercase tracking-widest text-slate-500 font-semibold">{t("sos.specialistNeeded")}</div>
                <div className="font-display font-extrabold text-3xl text-[color:var(--forest)]" data-testid="sos-specialty">
                  {specialty(result.required_specialty)}
                </div>
              </div>
              {result.llm_used && (
                <span className="pill bg-amber-100 text-amber-900 text-sm font-bold uppercase tracking-wider" data-testid="sos-ai-badge">{t("sos.aiAssisted")}</span>
              )}
            </div>

            <h2 className="font-display font-bold text-lg md:text-lg text-[color:var(--forest)]">{t("sos.results")}</h2>

            {result.matches.map((m, idx) => (
              <div key={m.hospital.id} className="card-tactical p-5" data-testid={`sos-hospital-card-${idx}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[color:var(--sage)] grid place-items-center font-display font-extrabold text-xl">{idx + 1}</div>
                    <div>
                      <div className="flex items-center gap-2 font-display font-bold text-2xl text-[color:var(--forest)]">
                        <Building2 size={22} /> {m.hospital.name}
                      </div>
                      <div className="text-base text-slate-600 mt-1">{m.hospital.address}, {m.hospital.city}</div>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-base font-semibold text-slate-700">
                        <span className="inline-flex items-center gap-1.5"><BedDouble size={20} className="text-[color:var(--sage)]" /> {m.hospital.available_beds}/{m.hospital.total_beds} {t("sos.beds")}</span>
                        <span className="inline-flex items-center gap-1.5"><Activity size={20} className="text-[color:var(--terracotta)]" /> {m.hospital.available_icu}/{m.hospital.total_icu} {t("sos.icu")}</span>
                        <span className="inline-flex items-center gap-1.5"><MapPin size={20} className="text-slate-500" /> {m.distance_km} km</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-widest text-slate-500">{t("detail.score")}</div>
                    <div className="font-display font-extrabold text-4xl text-[color:var(--forest)]" data-testid={`sos-score-${idx}`}>{m.match_score}</div>
                  </div>
                </div>

                <div className="mt-4 border-t pt-4">
                  <div className="text-sm uppercase tracking-widest text-slate-500 font-semibold">{t("sos.doctorsOnDuty")}</div>
                  {m.on_duty_doctors.length === 0 ? (
                    <div className="mt-2 text-base text-rose-700 font-semibold" data-testid={`sos-no-doctors-${idx}`}>{t("sos.noDoctors")}</div>
                  ) : (
                    <ul className="mt-2 grid sm:grid-cols-2 gap-2" data-testid={`sos-doctors-${idx}`}>
                      {m.on_duty_doctors.map((d) => (
                        <li key={d.id} className="flex items-center gap-2 text-base text-slate-800">
                          <UserRound size={20} className="text-[color:var(--sage)]" />
                          <span className="font-semibold">{d.name}</span>
                          <span className="text-sm text-slate-500">· {specialty(d.specialty)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {m.hospital.phone && (
                    <a href={`tel:${m.hospital.phone}`} className="mt-4 inline-flex items-center gap-2 pill bg-[color:var(--sage)] text-white font-bold text-base" data-testid={`sos-call-button-${idx}`}>
                      <Phone size={20} /> {t("sos.call")}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
