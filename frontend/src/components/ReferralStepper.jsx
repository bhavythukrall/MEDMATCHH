const STEPS = [
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "in_transit", label: "In Transit" },
  { key: "arrived", label: "Arrived" },
  { key: "completed", label: "Completed" },
];

export default function ReferralStepper({ status }) {
  if (status === "rejected") {
    return (
      <div className="border border-rose-300 bg-rose-50 rounded-xl p-4 text-rose-900" data-testid="referral-stepper-rejected">
        <div className="font-display font-bold">Referral Rejected</div>
        <div className="text-sm text-rose-700">The receiving hospital could not accept this patient.</div>
      </div>
    );
  }
  const idx = Math.max(0, STEPS.findIndex((s) => s.key === status));
  return (
    <ol className="grid grid-cols-5 gap-2" data-testid="referral-stepper">
      {STEPS.map((s, i) => {
        const active = i <= idx;
        return (
          <li key={s.key} className="flex flex-col items-center gap-2">
            <div className={`w-9 h-9 rounded-full grid place-items-center font-mono text-sm border-2 ${active ? "bg-[color:var(--sage)] text-white border-[color:var(--sage)]" : "bg-white text-slate-400 border-slate-200"}`}>{i + 1}</div>
            <span className={`text-xs uppercase tracking-wider ${active ? "text-[color:var(--forest)] font-semibold" : "text-slate-400"}`}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
