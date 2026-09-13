import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useT } from "../lib/i18n";
import { Input } from "../components/ui/input";
import Nav from "../components/Nav";
import { Search, Building2, BedDouble, Activity, MapPin, Phone } from "lucide-react";

export default function HospitalSearch() {
  const { t, specialty } = useT();
  const [hospitals, setHospitals] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => { api.get("/hospitals").then((r) => setHospitals(r.data)); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return hospitals;
    return hospitals.filter((h) =>
      [h.name, h.city, h.state, h.address, ...(h.specialties || []), ...(h.specialties || []).map((s) => specialty(s))]
        .join(" ").toLowerCase().includes(term)
    );
  }, [hospitals, q, specialty]);

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-5">
        <div>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[color:var(--forest)]">{t("search.title")}</h1>
          <p className="text-base md:text-lg text-slate-700 mt-2 max-w-2xl">{t("search.sub")}</p>
        </div>

        <div className="relative">
          <Search size={24} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            className="h-16 text-lg pl-14"
            data-testid="hospital-search-input"
          />
        </div>

        <div className="text-base font-semibold text-slate-600" data-testid="hospital-search-count">{filtered.length} {t("search.results")}</div>

        <div className="grid gap-3" data-testid="hospital-search-results">
          {filtered.length === 0 && <div className="card-tactical p-8 text-center text-lg text-slate-500">{t("search.empty")}</div>}
          {filtered.map((h) => (
            <div key={h.id} className="card-tactical p-5" data-testid={`hospital-search-card-${h.id}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 font-display font-bold text-2xl text-[color:var(--forest)]"><Building2 size={22} /> {h.name}</div>
                  <div className="text-base text-slate-600 mt-1">{h.address}, {h.city}, {h.state}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-base font-semibold text-slate-700">
                    <span className="inline-flex items-center gap-1.5"><BedDouble size={20} className="text-[color:var(--sage)]" /> {h.available_beds}/{h.total_beds} {t("sos.beds")}</span>
                    <span className="inline-flex items-center gap-1.5"><Activity size={20} className="text-[color:var(--terracotta)]" /> {h.available_icu}/{h.total_icu} {t("sos.icu")}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(h.specialties || []).map((s) => (
                      <span key={s} className="pill bg-emerald-50 border border-emerald-200 text-sm font-semibold text-emerald-900">{specialty(s)}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}`}
                    target="_blank" rel="noreferrer"
                    className="pill bg-[color:var(--forest)] text-white font-bold text-base inline-flex items-center gap-2"
                    data-testid={`hospital-search-map-${h.id}`}
                  >
                    <MapPin size={20} /> {t("family.openMap")}
                  </a>
                  {h.phone && (
                    <a href={`tel:${h.phone}`} className="pill bg-[color:var(--sage)] text-white font-bold text-base inline-flex items-center gap-2" data-testid={`hospital-search-call-${h.id}`}>
                      <Phone size={20} /> {t("sos.call")}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
