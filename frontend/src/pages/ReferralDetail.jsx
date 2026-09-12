import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import Nav from "../components/Nav";
import StatusBadge from "../components/StatusBadge";
import ReferralStepper from "../components/ReferralStepper";
import { useAuth } from "../lib/auth";
import { Ambulance as AmbIcon, Truck } from "lucide-react";

export default function ReferralDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [ambRequests, setAmbRequests] = useState([]);
  const [pickup, setPickup] = useState("");
  const { user } = useAuth();

  const load = () => api.get(`/referrals/${id}`).then((r) => { setData(r.data); setPickup(r.data.patient.village || r.data.patient.district); });
  const loadAmb = () => api.get(`/ambulances/requests/by-referral/${id}`).then((r) => setAmbRequests(r.data)).catch(() => {});
  useEffect(() => { load(); loadAmb(); }, [id]);

  const transition = async (status, rejection_reason = "") => {
    try {
      await api.patch(`/referrals/${id}/status`, { status, rejection_reason });
      toast.success(`Referral → ${status.replace("_", " ")}`);
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const requestAmb = async () => {
    try {
      await api.post("/ambulances/request", {
        referral_id: id, pickup_address: pickup,
        pickup_lat: data.patient.latitude, pickup_lon: data.patient.longitude,
        drop_address: data.hospital.address, drop_lat: data.hospital.latitude, drop_lon: data.hospital.longitude,
      });
      toast.success("Ambulance dispatched");
      loadAmb();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const updateAmb = async (reqId, status) => {
    try {
      await api.patch(`/ambulances/requests/${reqId}/status`, { status });
      toast.success(`Ambulance → ${status.replace("_", " ")}`);
      loadAmb();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  if (!data) return <div className="min-h-screen grain-bg"><Nav /><div className="p-10">Loading…</div></div>;
  const { referral, patient, hospital } = data;

  const isHospitalUser = user?.role === "hospital" && user.hospital_id === hospital.id;
  const isAshaOwner = user?.role === "asha" && user.id === referral.asha_user_id;
  const canAccept = isHospitalUser && referral.status === "pending";
  const canDispatch = isAshaOwner && referral.status === "accepted";
  const canArrive = isAshaOwner && referral.status === "in_transit";
  const canComplete = isHospitalUser && referral.status === "arrived";

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div className="card-tactical p-6" data-testid="referral-detail">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Referral</div>
              <h1 className="font-display font-extrabold text-3xl text-[color:var(--forest)]">#{referral.id.slice(0, 8)}</h1>
            </div>
            <StatusBadge status={referral.status} />
          </div>
          <div className="mt-6"><ReferralStepper status={referral.status} /></div>
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="border rounded-xl p-4">
              <div className="text-xs uppercase tracking-widest text-slate-500">Patient</div>
              <div className="font-display font-bold text-lg mt-1">{patient.name}</div>
              <div className="text-sm text-slate-600 mt-1">{patient.age} yrs · {patient.gender} · {patient.village || patient.district}</div>
              <div className="text-sm text-slate-700 mt-2"><span className="font-semibold">Symptoms:</span> {patient.symptoms}</div>
              <div className="text-xs text-slate-500 mt-1">Severity: {patient.severity}</div>
            </div>
            <div className="border rounded-xl p-4">
              <div className="text-xs uppercase tracking-widest text-slate-500">Hospital</div>
              <div className="font-display font-bold text-lg mt-1">{hospital.name}</div>
              <div className="text-sm text-slate-600 mt-1">{hospital.address}, {hospital.city}</div>
              <div className="text-sm text-slate-700 mt-2">Beds: {hospital.available_beds}/{hospital.total_beds} · ICU: {hospital.available_icu}/{hospital.total_icu}</div>
              <div className="text-xs text-slate-500 mt-1">Specialty required: {referral.required_specialty} · {referral.distance_km} km</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {canAccept && <Button onClick={() => transition("accepted")} className="bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]" data-testid="hospital-accept-button">Accept referral</Button>}
            {canAccept && <Button variant="outline" onClick={() => transition("rejected", "No capacity")} className="border-rose-300 text-rose-700 hover:bg-rose-50" data-testid="hospital-reject-button">Reject</Button>}
            {canDispatch && <Button onClick={() => transition("in_transit")} className="bg-[color:var(--blue)] hover:bg-sky-700" data-testid="mark-in-transit-button"><Truck size={16} className="mr-1" /> Mark in-transit</Button>}
            {canArrive && <Button onClick={() => transition("arrived")} className="bg-violet-600 hover:bg-violet-700" data-testid="mark-arrived-button">Mark arrived</Button>}
            {canComplete && <Button onClick={() => transition("completed")} className="bg-emerald-700 hover:bg-emerald-800" data-testid="mark-completed-button">Mark completed</Button>}
          </div>
        </div>

        {referral.status !== "rejected" && (isAshaOwner || isHospitalUser) && (
          <div className="card-tactical p-6" data-testid="ambulance-widget">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-display font-bold text-lg text-[color:var(--forest)]">Ambulance</div>
                <div className="text-sm text-slate-500">Dispatch nearest available vehicle after acceptance.</div>
              </div>
              {(referral.status === "accepted" || referral.status === "in_transit") && (
                <div className="flex items-center gap-2">
                  <Input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Pickup address" className="w-64" data-testid="ambulance-pickup-input" />
                  <Button onClick={requestAmb} className="bg-[color:var(--terracotta)] hover:bg-[color:var(--terracotta)]/90" data-testid="request-ambulance-button"><AmbIcon size={16} className="mr-1" /> Request ambulance</Button>
                </div>
              )}
            </div>
            {ambRequests.length > 0 && (
              <ul className="mt-4 grid gap-2" data-testid="ambulance-status-widget">
                {ambRequests.map((a) => (
                  <li key={a.id} className="border rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-semibold">Pickup: {a.pickup_address}</div>
                      <div className="text-xs text-slate-500">Drop: {a.drop_address}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={a.status} />
                      {a.status === "dispatched" && <Button size="sm" variant="outline" onClick={() => updateAmb(a.id, "en_route_pickup")} data-testid="amb-enroute-button">En route</Button>}
                      {a.status === "en_route_pickup" && <Button size="sm" variant="outline" onClick={() => updateAmb(a.id, "picked_up")} data-testid="amb-pickup-button">Picked up</Button>}
                      {a.status === "picked_up" && <Button size="sm" variant="outline" onClick={() => updateAmb(a.id, "delivered")} data-testid="amb-delivered-button">Delivered</Button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
