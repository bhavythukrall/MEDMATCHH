import { useT } from "../lib/i18n";
import { AlertTriangle, Stethoscope, ClipboardCheck } from "lucide-react";

const URGENCY_STYLE = {
  urgent: "bg-rose-100 text-rose-900 border-rose-400",
  soon: "bg-amber-100 text-amber-900 border-amber-400",
  routine: "bg-emerald-100 text-emerald-900 border-emerald-400",
};

export default function CareNeedCard({ result, title }) {
  const { t, specialty } = useT();
  const urgency = result.urgency || "routine";

  return (
    <div className="card-tactical p-5 sm:p-6" data-testid="care-need-card">
      <div className="font-display font-bold text-2xl text-[color:var(--forest)]">{title || t("care.title")}</div>
      <div className="mt-5 grid sm:grid-cols-3 gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-slate-500 font-semibold"><AlertTriangle size={18} /> {t("care.urgency")}</div>
          <span className={`mt-2 inline-flex items-center gap-2 border-2 rounded-full px-3 py-1.5 text-base font-bold ${URGENCY_STYLE[urgency]}`} data-testid="care-urgency">
            <span className="w-2.5 h-2.5 rounded-full bg-current" /> {t(`care.${urgency}`)}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-slate-500 font-semibold"><Stethoscope size={18} /> {t("care.careNeeded")}</div>
          <div className="mt-2 font-display font-extrabold text-2xl text-[color:var(--forest)]" data-testid="care-specialty">{specialty(result.required_specialty)}</div>
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-slate-500 font-semibold"><ClipboardCheck size={18} /> {t("care.facilities")}</div>
          <div className="mt-2 flex flex-wrap gap-2" data-testid="care-facilities">
            {(result.facilities || []).map((f) => (
              <span key={f} className="pill bg-white border border-emerald-900/15 text-sm font-semibold">{t(`fac.${f}`)}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
