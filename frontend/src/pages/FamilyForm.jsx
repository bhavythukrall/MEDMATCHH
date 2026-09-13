import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { useT } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import Nav from "../components/Nav";

const RELATIONSHIPS = ["self", "mother", "father", "spouse", "son", "daughter", "brother", "sister", "grandparent", "other"];

export default function FamilyForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useT();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(!id);
  const [form, setForm] = useState({
    name: params.get("name") || "",
    relationship: params.get("relationship") || "mother",
    age: 30,
    gender: "female",
    phone: "",
    medical_history: "",
    allergies: "",
  });

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/patients/${id}`).then((r) => {
      setForm({
        name: r.data.name, relationship: r.data.relationship || "other", age: r.data.age,
        gender: r.data.gender, phone: r.data.phone || "",
        medical_history: r.data.medical_history || "", allergies: r.data.allergies || "",
      });
      setReady(true);
    });
  }, [id, isEdit]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, age: Number(form.age) };
      if (isEdit) {
        await api.patch(`/patients/${id}`, payload);
        toast.success(t("family.updated"));
        navigate(`/me/${id}`);
      } else {
        await api.post("/patients", payload);
        toast.success(t("family.saved"));
        navigate("/me");
      }
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setSaving(false); }
  };

  const field = "h-12 text-lg mt-1";

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[color:var(--forest)]">
          {isEdit ? t("family.editTitle") : t("family.addTitle")}
        </h1>
        <p className="text-base md:text-lg text-slate-700 mt-2">{t("family.addSub")}</p>

        <form onSubmit={submit} className="mt-8 card-tactical p-5 sm:p-6 grid sm:grid-cols-2 gap-5" data-testid="family-form">
          <div className="sm:col-span-2">
            <Label className="text-base">{t("family.name")}</Label>
            <Input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} required data-testid="family-name-input" />
          </div>
          <div>
            <Label className="text-base">{t("family.relationship")}</Label>
            <Select value={form.relationship} onValueChange={(v) => set("relationship", v)}>
              <SelectTrigger className={field} data-testid="family-relationship-select"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white max-h-72">
                {RELATIONSHIPS.map((r) => <SelectItem key={r} value={r} className="text-base">{t(`rel.${r}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-base">{t("family.age")}</Label>
            <Input type="number" className={field} value={form.age} onChange={(e) => set("age", e.target.value)} required data-testid="family-age-input" />
          </div>
          <div>
            <Label className="text-base">{t("family.gender")}</Label>
            <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger className={field} data-testid="family-gender-select"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="male" className="text-base">{t("create.male")}</SelectItem>
                <SelectItem value="female" className="text-base">{t("create.female")}</SelectItem>
                <SelectItem value="other" className="text-base">{t("create.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-base">{t("family.phone")}</Label>
            <Input className={field} value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="family-phone-input" />
          </div>
          {isEdit && (
            <>
              <div className="sm:col-span-2">
                <Label className="text-base">{t("family.medicalHistory")}</Label>
                <Textarea rows={2} className="text-lg mt-1" value={form.medical_history} onChange={(e) => set("medical_history", e.target.value)} data-testid="family-history-input" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-base">{t("family.allergies")}</Label>
                <Textarea rows={2} className="text-lg mt-1" value={form.allergies} onChange={(e) => set("allergies", e.target.value)} data-testid="family-allergies-input" />
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" size="lg" disabled={saving || !ready} className="h-14 text-lg px-7 bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]" data-testid="save-family-member-button">
              {saving ? t("family.saving") : t("family.save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
