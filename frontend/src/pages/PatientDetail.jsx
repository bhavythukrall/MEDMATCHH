import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import Nav from "../components/Nav";
import StatusBadge from "../components/StatusBadge";
import { Sparkles, Building2, CheckCircle2, UploadCloud, FileText, History, ArrowRightLeft } from "lucide-react";

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, specialty } = useT();
  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [history, setHistory] = useState([]);
  const [hospitals, setHospitals] = useState({});
  const [matches, setMatches] = useState(null);
  const [matching, setMatching] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadReports = useCallback(() => api.get(`/uploads/patients/${id}/reports`).then((r) => setReports(r.data)).catch(() => {}), [id]);
  const loadHistory = useCallback(
    () => api.get("/referrals").then((r) => setHistory(r.data.filter((x) => x.patient_id === id))).catch(() => {}),
    [id]
  );

  useEffect(() => {
    api.get(`/patients/${id}`).then((r) => setPatient(r.data));
    api.get("/hospitals").then((r) => setHospitals(Object.fromEntries(r.data.map((h) => [h.id, h.name])))).catch(() => {});
    loadReports();
    loadHistory();
  }, [id, loadReports, loadHistory]);

  const runMatch = async () => {
    setMatching(true);
    try {
      const { data } = await api.post("/match", { patient_id: id, max_results: 5 });
      setMatches(data);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setMatching(false); }
  };

  const createReferral = async (m) => {
    try {
      const { data } = await api.post("/referrals", {
        patient_id: id, hospital_id: m.hospital.id,
        required_specialty: m.required_specialty, notes: m.reason,
        match_score: m.match_score, distance_km: m.distance_km,
      });
      toast.success(t("detail.referralSent"));
      navigate(`/asha/referrals/${data.id}`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post(`/uploads/patients/${id}/reports`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(t("detail.uploaded"));
      loadReports();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setUploading(false); e.target.value = ""; }
  };

  if (!patient) return <div className="min-h-screen grain-bg"><Nav /><div className="p-10 text-lg text-slate-500">…</div></div>;

  const canRefer = user && ["asha", "hospital", "admin"].includes(user.role);

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="card-tactical p-5 sm:p-6" data-testid="patient-detail">
          <div className="flex items-start justify-between gap-5 flex-wrap">
            <div>
              <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[color:var(--forest)]">{patient.name}</h1>
              <div className="text-base text-slate-600 mt-1">{patient.age} {t("patients.years")} · {patient.gender} · {patient.village || patient.district}, {patient.state}</div>
              <div className="mt-5 max-w-2xl">
                <div className="text-sm uppercase tracking-widest text-slate-500 font-semibold">{t("detail.symptoms")}</div>
                <div className="text-lg text-slate-900 mt-1">{patient.symptoms || <span className="text-slate-400">—</span>}</div>
                {patient.injury_details && (
                  <>
                    <div className="text-sm uppercase tracking-widest text-slate-500 font-semibold mt-4">{t("detail.injury")}</div>
                    <div className="text-lg text-slate-900 mt-1">{patient.injury_details}</div>
                  </>
                )}
                <div className="text-sm text-slate-500 mt-3">{t("detail.registered")}: {new Date(patient.created_at).toLocaleString()}</div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {canRefer && (
                <Button onClick={runMatch} size="lg" disabled={matching} className="h-14 text-lg bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]" data-testid="ai-match-button">
                  <Sparkles size={22} className="mr-2" /> {matching ? t("detail.matching") : t("detail.runMatch")}
                </Button>
              )}
              <label className="cursor-pointer inline-flex items-center gap-2 text-lg font-semibold text-slate-700 hover:text-[color:var(--sage)]" data-testid="upload-report-label">
                <UploadCloud size={22} /> {uploading ? t("detail.uploading") : t("detail.upload")}
                <input type="file" className="hidden" onChange={upload} accept="image/*,application/pdf" data-testid="upload-report-input" />
              </label>
            </div>
          </div>
          {user?.role === "hospital" && (
            <div className="mt-5 flex items-start gap-2 text-base text-slate-700 bg-amber-50 border border-amber-200 rounded-xl p-4" data-testid="transfer-note">
              <ArrowRightLeft size={22} className="text-amber-700 shrink-0" />
              <div><span className="font-bold">{t("detail.transfer")}:</span> {t("detail.transferNote")}</div>
            </div>
          )}
        </div>

        {reports.length > 0 && (
          <div className="card-tactical p-5" data-testid="patient-reports-list">
            <div className="font-display font-bold text-xl text-[color:var(--forest)] mb-3">{t("detail.reports")}</div>
            <ul className="grid md:grid-cols-2 gap-2">
              {reports.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-base text-slate-700">
                  <FileText size={20} className="text-[color:var(--sage)]" />
                  <span className="truncate">{r.original_filename}</span>
                  <span className="text-sm text-slate-400 ml-auto">{Math.round(r.size / 1024)} KB</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card-tactical p-5" data-testid="patient-history">
          <div className="flex items-center gap-2 font-display font-bold text-xl text-[color:var(--forest)]"><History size={22} /> {t("detail.history")}</div>
          {history.length === 0 ? (
            <div className="mt-3 text-base text-slate-500">{t("detail.noHistory")}</div>
          ) : (
            <ul className="mt-4 grid gap-2">
              {history.map((r) => (
                <li key={r.id}>
                  <Link to={`/asha/referrals/${r.id}`} className="border rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap hover:border-[color:var(--sage)] transition-colors" data-testid={`history-row-${r.id}`}>
                    <div>
                      <div className="font-semibold text-base text-[color:var(--forest)]">{hospitals[r.hospital_id] || r.hospital_id.slice(0, 8)}</div>
                      <div className="text-sm text-slate-500">{specialty(r.required_specialty)} · {new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {matches && (
          <div className="card-tactical p-5 sm:p-6" data-testid="match-results">
            <div>
              <div className="font-display font-bold text-2xl text-[color:var(--forest)]">{t("detail.ranked")}</div>
              <div className="text-base text-slate-600 mt-1">
                {t("detail.specialty")}: <span className="text-[color:var(--sage)] font-bold">{specialty(matches.required_specialty)}</span>
                {matches.llm_used && <span className="ml-2 pill bg-amber-100 text-amber-900 text-sm font-bold uppercase tracking-wider">{t("detail.aiAssisted")}</span>}
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {matches.matches.map((m, idx) => (
                <div key={m.hospital.id} className="border border-emerald-900/10 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap" data-testid={`hospital-rank-card-${idx}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[color:var(--sage)] grid place-items-center font-display font-extrabold text-xl">{idx + 1}</div>
                    <div>
                      <div className="flex items-center gap-2 font-display font-bold text-xl text-[color:var(--forest)]"><Building2 size={20} /> {m.hospital.name}</div>
                      <div className="text-base text-slate-600 mt-0.5">{m.hospital.city}, {m.hospital.state} · {m.reason}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{t("detail.score")}</div>
                      <div className="font-display font-extrabold text-3xl text-[color:var(--forest)]" data-testid={`hospital-match-score-${idx}`}>{m.match_score}</div>
                    </div>
                    <Button size="lg" onClick={() => createReferral(m)} className="h-12 text-base bg-[color:var(--terracotta)] hover:bg-[color:var(--terracotta)]/90" data-testid={`create-referral-button-${idx}`}>
                      <CheckCircle2 size={20} className="mr-2" /> {t("detail.sendReferral")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
