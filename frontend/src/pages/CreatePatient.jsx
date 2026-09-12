import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { api, formatApiErrorDetail } from "../lib/api";
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
  const navigate = useNavigate();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, age: Number(form.age), latitude: Number(form.latitude), longitude: Number(form.longitude) };
      const { data } = await api.post("/patients", payload);
      toast.success("Patient registered");
      navigate(`/asha/patients/${data.id}`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-display font-extrabold text-4xl text-[color:var(--forest)]">Register patient</h1>
        <form onSubmit={submit} className="mt-8 card-tactical p-6 grid md:grid-cols-2 gap-4" data-testid="create-patient-form">
          <div className="md:col-span-2"><Label>Full name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} required data-testid="patient-name-input" /></div>
          <div><Label>Age</Label><Input type="number" value={form.age} onChange={(e) => set("age", e.target.value)} required data-testid="patient-age-input" /></div>
          <div>
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger data-testid="patient-gender-select"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="patient-phone-input" /></div>
          <div><Label>Village</Label><Input value={form.village} onChange={(e) => set("village", e.target.value)} data-testid="patient-village-input" /></div>
          <div><Label>District</Label><Input value={form.district} onChange={(e) => set("district", e.target.value)} data-testid="patient-district-input" /></div>
          <div><Label>State</Label><Input value={form.state} onChange={(e) => set("state", e.target.value)} data-testid="patient-state-input" /></div>
          <div><Label>Latitude</Label><Input type="number" step="any" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} data-testid="patient-lat-input" /></div>
          <div><Label>Longitude</Label><Input type="number" step="any" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} data-testid="patient-lon-input" /></div>
          <div className="md:col-span-2"><Label>Symptoms</Label><Textarea rows={3} value={form.symptoms} onChange={(e) => set("symptoms", e.target.value)} placeholder="e.g. chest pain, breathless" data-testid="patient-symptoms-input" /></div>
          <div className="md:col-span-2"><Label>Injury details (optional)</Label><Textarea rows={2} value={form.injury_details} onChange={(e) => set("injury_details", e.target.value)} data-testid="patient-injury-input" /></div>
          <div>
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={(v) => set("severity", v)}>
              <SelectTrigger data-testid="patient-severity-select"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="mild">Mild</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 mt-2">
            <Button type="submit" disabled={loading} className="bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]" data-testid="submit-patient-button">{loading ? "Saving..." : "Register patient"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
