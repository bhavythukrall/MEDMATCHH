import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { useT } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import Nav from "../components/Nav";
import { UserRound, HeartPulse, Pencil, Trash2 } from "lucide-react";

export default function FamilyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useT();
  const [p, setP] = useState(null);

  useEffect(() => { api.get(`/patients/${id}`).then((r) => setP(r.data)); }, [id]);

  const remove = async () => {
    try {
      await api.delete(`/patients/${id}`);
      toast.success(t("family.removed"));
      navigate("/me");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  if (!p) return <div className="min-h-screen grain-bg"><Nav /><div className="p-10 text-lg">…</div></div>;

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-5">
        <div className="card-tactical p-6" data-testid="family-profile">
          <div className="flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-emerald-50 text-[color:var(--sage)] grid place-items-center"><UserRound size={32} /></span>
            <div>
              <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[color:var(--forest)]" data-testid="family-profile-name">{p.name}</h1>
              <div className="text-base text-slate-600 mt-1">
                {p.relationship ? t(`rel.${p.relationship}`) : t("rel.other")} · {p.age} {t("patients.years")} · {t(`create.${p.gender}`)}
                {p.phone ? ` · ${p.phone}` : ""}
              </div>
            </div>
          </div>

          {(p.medical_history || p.allergies) && (
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {p.medical_history && (
                <div className="border rounded-2xl p-4">
                  <div className="text-sm uppercase tracking-widest text-slate-500 font-semibold">{t("family.medicalHistory")}</div>
                  <div className="text-base text-slate-800 mt-1">{p.medical_history}</div>
                </div>
              )}
              {p.allergies && (
                <div className="border rounded-2xl p-4">
                  <div className="text-sm uppercase tracking-widest text-slate-500 font-semibold">{t("family.allergies")}</div>
                  <div className="text-base text-slate-800 mt-1">{p.allergies}</div>
                </div>
              )}
            </div>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to={`/me/${id}/help`} data-testid="use-medmatch-button">
              <Button size="lg" className="h-14 text-lg bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]">
                <HeartPulse size={22} className="mr-2" /> {t("family.useMedmatch")}
              </Button>
            </Link>
            <Link to={`/me/${id}/edit`} data-testid="edit-family-member-button">
              <Button size="lg" variant="outline" className="h-14 text-lg border-2"><Pencil size={20} className="mr-2" /> {t("family.editProfile")}</Button>
            </Link>
            <Button size="lg" variant="outline" onClick={remove} className="h-14 text-lg border-2 border-rose-300 text-rose-700 hover:bg-rose-50" data-testid="remove-family-member-button">
              <Trash2 size={20} className="mr-2" /> {t("family.remove")}
            </Button>
          </div>
        </div>
        <Link to="/me" className="inline-block text-base font-semibold text-[color:var(--sage)]" data-testid="back-to-family-link">← {t("family.who")}</Link>
      </div>
    </div>
  );
}
