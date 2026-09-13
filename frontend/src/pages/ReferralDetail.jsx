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
import { useT } from "../lib/i18n";
import { Ambulance as AmbIcon, Truck } from "lucide-react";

export default function ReferralDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [ambRequests, setAmbRequests] = useState([]);
  const [pickup, setPickup] = useState("");
  const { user } = useAuth();
  const { t, specialty } = useT();

  const load = () => api.get(`/referrals/${id}`).then((r) => { setData(r.data); setPickup(r.data.patient.village || r.data.patient.district); });
  const loadAmb = () => api.get(`/ambulances/requests/by-referral/${id}`).then((r) => setAmbRequests(r.data)).catch(() => {});
  useEffect(() => { load(); loadAmb(); }, [id, load, loadAmb]);

  const transition = async (status, rejection_reason = "") => {
    try {
      await api.patch(`/referrals/${id}/status`, { status, rejection_reason });
      toast.success(t(`status.${status}`));
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
      toast.success(t("rdetail.ambDispatched"));
      loadAmb();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const updateAmb = async (reqId, status) => {
    try {
      await api.patch(`/ambulances/requests/${reqId}/status`, { status });
      toast.success(t(`status.${status}`));
      loadAmb();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  if (!data) return <div className="min-h-screen grain-bg"><Nav /><div className="p-10 text-lg">…</div></div>;
  const { referral, patient, hospital } = data;

  const isDestinationHospital = user?.role === "hospital" && user.hospital_id === hospital.id;
  const isCreator = user && user.id === referral.asha_user_id;
  const canAccept = isDestinationHospital && referral.status === "pending";
  const canDispatch = isCreator && referral.status === "accepted";
  const canArrive = isCreator && referral.status === "in_transit";
  const canComplete = isDestinationHospital && referral.status === "arrived";

  return (
    <div className="min-h-screen grain-bg">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="card-tactical p-5 sm:p-6" data-testid="referral-detail">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm uppercase tracking-widest text-slate-500 font-semibold">{t("rdetail.referral")}</div>
              <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[color:var(--forest)]">#{referral.id.slice(0, 8)}</h1>
            </div>
            <StatusBadge status={referral.status} />
          </div>
          <div className="mt-6"><ReferralStepper status={referral.status} /></div>
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="border rounded-2xl p-4">
              <div className="text-sm uppercase tracking-widest text-slate-500 font-semibold">{t("rdetail.patient")}</div>
              <div className="font-display font-bold text-xl mt-1">{patient.name}</div>
              <div className="text-base text-slate-600 mt-1">{patient.age} {t("patients.years")} · {patient.gender} · {patient.village || patient.district}</div>
              <div className="text-base text-slate-800 mt-2"><span className="font-bold">{t("detail.symptoms")}:</span> {patient.symptoms}</div>
              <div className="text-sm text-slate-500 mt-1">{t("rdetail.severity")}: {t(`create.${patient.severity}`)}</div>
            </div>
            <div className="border rounded-2xl p-4">
              <div className="text-sm uppercase tracking-widest text-slate-500 font-semibold">{t("rdetail.hospital")}</div>
              <div className="font-display font-bold text-xl mt-1">{hospital.name}</div>
              <div className="text-base text-slate-600 mt-1">{hospital.address}, {hospital.city}</div>
              <div className="text-base text-slate-800 mt-2">{t("rdetail.beds")}: {hospital.available_beds}/{hospital.total_beds} · {t("rdetail.icu")}: {hospital.available_icu}/{hospital.total_icu}</div>
              <div className="text-sm text-slate-500 mt-1">{t("rdetail.specialtyRequired")}: {specialty(referral.required_specialty)} · {referral.distance_km} km</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {canAccept && <Button size="lg" onClick={() => transition("accepted")} className="h-14 text-lg bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]" data-testid="hospital-accept-button">{t("rdetail.accept")}</Button>}
            {canAccept && <Button size="lg" variant="outline" onClick={() => transition("rejected", "No capacity")} className="h-14 text-lg border-2 border-rose-300 text-rose-700 hover:bg-rose-50" data-testid="hospital-reject-button">{t("rdetail.reject")}</Button>}
            {canDispatch && <Button size="lg" onClick={() => transition("in_transit")} className="h-14 text-lg bg-[color:var(--blue)] hover:bg-sky-700" data-testid="mark-in-transit-button"><Truck size={20} className="mr-2" /> {t("rdetail.inTransit")}</Button>}
            {canArrive && <Button size="lg" onClick={() => transition("arrived")} className="h-14 text-lg bg-violet-600 hover:bg-violet-700" data-testid="mark-arrived-button">{t("rdetail.arrived")}</Button>}
            {canComplete && <Button size="lg" onClick={() => transition("completed")} className="h-14 text-lg bg-emerald-700 hover:bg-emerald-800" data-testid="mark-completed-button">{t("rdetail.completed")}</Button>}
          </div>
        </div>

        {referral.status !== "rejected" && (isCreator || isDestinationHospital) && (
          <div className="card-tactical p-5 sm:p-6" data-testid="ambulance-widget">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-display font-bold text-xl text-[color:var(--forest)]">{t("rdetail.ambulance")}</div>
                <div className="text-base text-slate-600">{t("rdetail.ambulanceSub")}</div>
              </div>
              {(referral.status === "accepted" || referral.status === "in_transit") && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder={t("rdetail.pickup")} className="w-64 h-12 text-lg" data-testid="ambulance-pickup-input" />
                  <Button size="lg" onClick={requestAmb} className="h-12 text-base bg-[color:var(--terracotta)] hover:bg-[color:var(--terracotta)]/90" data-testid="request-ambulance-button"><AmbIcon size={20} className="mr-2" /> {t("rdetail.requestAmb")}</Button>
                </div>
              )}
            </div>
            {ambRequests.length > 0 && (
              <ul className="mt-4 grid gap-2" data-testid="ambulance-status-widget">
                {ambRequests.map((a) => (
                  <li key={a.id} className="border rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-base font-semibold">{t("rdetail.pickup")}: {a.pickup_address}</div>
                      <div className="text-sm text-slate-500">{t("rdetail.drop")}: {a.drop_address}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={a.status} />
                      {a.status === "dispatched" && <Button size="lg" variant="outline" className="border-2" onClick={() => updateAmb(a.id, "en_route_pickup")} data-testid="amb-enroute-button">{t("rdetail.enroute")}</Button>}
                      {a.status === "en_route_pickup" && <Button size="lg" variant="outline" className="border-2" onClick={() => updateAmb(a.id, "picked_up")} data-testid="amb-pickup-button">{t("rdetail.pickedUp")}</Button>}
                      {a.status === "picked_up" && <Button size="lg" variant="outline" className="border-2" onClick={() => updateAmb(a.id, "delivered")} data-testid="amb-delivered-button">{t("rdetail.delivered")}</Button>}
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
