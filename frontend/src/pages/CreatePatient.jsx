import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { api, formatApiErrorDetail } from "../lib/api";
import { useT } from "../lib/i18n";
import { toast } from "sonner";
import Nav from "../components/Nav";

const empty = {
  name: "", age: 25, gender: "male", phone: "",
  village: "", district: "", state: "Rajasthan",
  latitude: 26.9124, longitude: 75.7873,
  symptoms: "", injury_details: "", severity: "moderate",
};

export default function CreatePatient() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const { t } = useT();
  const navigate = useNavigate();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, age: Number(form.age), latitude: Number(form.latitude), longitude: Number(form.longitude) };
      const { data } = await api.post("/patients", payload);
      toast.success(t("create.saved"));
      navigate(`/asha/patients/${data.id}`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  const field = "h-12 text-lg mt-1";

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-[color:var(--forest)]">{t("create.title")}</h1>
        <form onSubmit={submit} className="mt-8 card-tactical p-5 sm:p-6 grid md:grid-cols-2 gap-5" data-testid="create-patient-form">
          <div className="md:col-span-2"><Label className="text-base">{t("create.name")}</Label><Input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} required data-testid="patient-name-input" /></div>
          <div><Label className="text-base">{t("create.age")}</Label><Input className={field} type="number" value={form.age} onChange={(e) => set("age", e.target.value)} required data-testid="patient-age-input" /></div>
          <div>
            <Label className="text-base">{t("create.gender")}</Label>
            <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger className={field} data-testid="patient-gender-select"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="male" className="text-base">{t("create.male")}</SelectItem>
                <SelectItem value="female" className="text-base">{t("create.female")}</SelectItem>
                <SelectItem value="other" className="text-base">{t("create.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-base">{t("create.phone")}</Label><Input className={field} value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="patient-phone-input" /></div>
          <div><Label className="text-base">{t("create.village")}</Label><Input className={field} value={form.village} onChange={(e) => set("village", e.target.value)} data-testid="patient-village-input" /></div>
          <div><Label className="text-base">{t("create.district")}</Label><Input className={field} value={form.district} onChange={(e) => set("district", e.target.value)} data-testid="patient-district-input" /></div>
          <div><Label className="text-base">{t("create.state")}</Label><Input className={field} value={form.state} onChange={(e) => set("state", e.target.value)} data-testid="patient-state-input" /></div>
          <div><Label className="text-base">{t("create.lat")}</Label><Input className={field} type="number" step="any" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} data-testid="patient-lat-input" /></div>
          <div><Label className="text-base">{t("create.lon")}</Label><Input className={field} type="number" step="any" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} data-testid="patient-lon-input" /></div>
          <div className="md:col-span-2"><Label className="text-base">{t("create.symptoms")}</Label><Textarea rows={3} className="text-lg mt-1" value={form.symptoms} onChange={(e) => set("symptoms", e.target.value)} placeholder={t("create.symptomsPlaceholder")} data-testid="patient-symptoms-input" /></div>
          <div className="md:col-span-2"><Label className="text-base">{t("create.injury")}</Label><Textarea rows={2} className="text-lg mt-1" value={form.injury_details} onChange={(e) => set("injury_details", e.target.value)} data-testid="patient-injury-input" /></div>
          <div>
            <Label className="text-base">{t("create.severity")}</Label>
            <Select value={form.severity} onValueChange={(v) => set("severity", v)}>
              <SelectTrigger className={field} data-testid="patient-severity-select"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="mild" className="text-base">{t("create.mild")}</SelectItem>
                <SelectItem value="moderate" className="text-base">{t("create.moderate")}</SelectItem>
                <SelectItem value="critical" className="text-base">{t("create.critical")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 mt-2">
            <Button type="submit" size="lg" disabled={loading} className="h-14 text-lg px-7 bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]" data-testid="submit-patient-button">{loading ? t("create.saving") : t("create.submit")}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
