import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import Nav from "../components/Nav";
import { Sparkles, Building2, CheckCircle2, UploadCloud, FileText } from "lucide-react";

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [matches, setMatches] = useState(null);
  const [matching, setMatching] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadPatient = () => api.get(`/patients/${id}`).then((r) => setPatient(r.data));
  const loadReports = () => api.get(`/uploads/patients/${id}/reports`).then((r) => setReports(r.data)).catch(() => {});

  useEffect(() => { loadPatient(); loadReports(); }, [id]);

  const runMatch = async () => {
    setMatching(true);
    try {
      const { data } = await api.post("/match", { patient_id: id, max_results: 5 });
      setMatches(data);
      toast.success(`Matched ${data.matches.length} hospital(s) — specialty: ${data.required_specialty}`);
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
      toast.success("Referral sent to hospital");
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
      toast.success("Report uploaded");
      loadReports();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setUploading(false); e.target.value = ""; }
  };

  if (!patient) return <div className="min-h-screen grain-bg"><Nav /><div className="p-10 text-slate-500">Loading…</div></div>;
  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="card-tactical p-6" data-testid="patient-detail">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display font-extrabold text-3xl text-[color:var(--forest)]">{patient.name}</h1>
              <div className="text-sm text-slate-500 mt-1">{patient.age} yrs · {patient.gender} · {patient.village || patient.district}, {patient.state}</div>
              <div className="mt-4 max-w-2xl">
                <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Symptoms</div>
                <div className="text-slate-800 mt-1">{patient.symptoms || <span className="text-slate-400">—</span>}</div>
                {patient.injury_details && <><div className="text-xs uppercase tracking-widest text-slate-500 font-semibold mt-3">Injury</div><div className="text-slate-800 mt-1">{patient.injury_details}</div></>}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={runMatch} disabled={matching} className="bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]" data-testid="ai-match-button">
                <Sparkles size={16} className="mr-1" /> {matching ? "Matching…" : "Run smart hospital match"}
              </Button>
              <label className="cursor-pointer inline-flex items-center gap-2 text-sm text-slate-700 hover:text-[color:var(--sage)]" data-testid="upload-report-label">
                <UploadCloud size={16} /> {uploading ? "Uploading…" : "Upload medical report"}
                <input type="file" className="hidden" onChange={upload} accept="image/*,application/pdf" data-testid="upload-report-input" />
              </label>
            </div>
          </div>
        </div>

        {reports.length > 0 && (
          <div className="card-tactical p-5" data-testid="patient-reports-list">
            <div className="font-display font-bold text-lg text-[color:var(--forest)] mb-3">Medical reports</div>
            <ul className="grid md:grid-cols-2 gap-2">
              {reports.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <FileText size={16} className="text-[color:var(--sage)]" />
                  <span className="truncate">{r.original_filename}</span>
                  <span className="text-xs text-slate-400 ml-auto">{Math.round(r.size / 1024)} KB</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {matches && (
          <div className="card-tactical p-6" data-testid="match-results">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display font-bold text-xl text-[color:var(--forest)]">Ranked hospitals</div>
                <div className="text-sm text-slate-500 mt-0.5">
                  Specialty: <span className="text-[color:var(--sage)] font-semibold">{matches.required_specialty}</span>
                  {matches.llm_used && <span className="ml-2 pill bg-amber-100 text-amber-900 text-xs uppercase tracking-wider">AI-assisted</span>}
                </div>
                {matches.reasoning && <div className="text-xs text-slate-500 mt-1">{matches.reasoning}</div>}
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {matches.matches.map((m, idx) => (
                <div key={m.hospital.id} className="border border-emerald-900/10 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap" data-testid={`hospital-rank-card-${idx}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-[color:var(--sage)] grid place-items-center font-display font-extrabold">{idx + 1}</div>
                    <div>
                      <div className="flex items-center gap-2 font-display font-bold text-lg text-[color:var(--forest)]"><Building2 size={16} /> {m.hospital.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{m.hospital.city}, {m.hospital.state} · {m.reason}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-widest text-slate-500">Score</div>
                      <div className="font-display font-extrabold text-3xl text-[color:var(--forest)]" data-testid={`hospital-match-score-${idx}`}>{m.match_score}</div>
                    </div>
                    <Button onClick={() => createReferral(m)} className="bg-[color:var(--terracotta)] hover:bg-[color:var(--terracotta)]/90" data-testid={`create-referral-button-${idx}`}>
                      <CheckCircle2 size={16} className="mr-1" /> Send referral
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
