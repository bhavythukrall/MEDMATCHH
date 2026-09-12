import { useT } from "../lib/i18n";

const STYLES = {
  pending:    "bg-amber-100 text-amber-900 border-amber-400",
  accepted:   "bg-emerald-100 text-emerald-900 border-emerald-500",
  in_transit: "bg-sky-100 text-sky-900 border-sky-500",
  arrived:    "bg-violet-100 text-violet-900 border-violet-500",
  completed:  "bg-green-100 text-green-900 border-green-500",
  rejected:   "bg-rose-100 text-rose-900 border-rose-500",
  available:  "bg-emerald-100 text-emerald-900 border-emerald-500",
  dispatched: "bg-sky-100 text-sky-900 border-sky-500",
  en_route_pickup: "bg-sky-100 text-sky-900 border-sky-500",
  picked_up:  "bg-violet-100 text-violet-900 border-violet-500",
  delivered:  "bg-green-100 text-green-900 border-green-500",
};

export default function StatusBadge({ status }) {
  const { status: label } = useT();
  const s = String(status || "").toLowerCase();
  const cls = STYLES[s] || "bg-slate-100 text-slate-800 border-slate-300";
  return (
    <span data-testid="referral-status-badge" className={`inline-flex items-center gap-1.5 border-2 ${cls} text-sm font-bold uppercase tracking-wider px-3 py-1.5 rounded-full`}>
      <span className="w-2 h-2 rounded-full bg-current opacity-70" />
      {label(s) || s.replace(/_/g, " ")}
    </span>
  );
}
