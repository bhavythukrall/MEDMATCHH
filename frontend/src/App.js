import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { AuthProvider, useAuth } from "./lib/auth";
import { LanguageProvider } from "./lib/i18n";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Sos from "./pages/Sos";
import PatientList from "./pages/PatientList";
import CreatePatient from "./pages/CreatePatient";
import PatientDetail from "./pages/PatientDetail";
import ReferralList from "./pages/ReferralList";
import ReferralDetail from "./pages/ReferralDetail";
import HospitalDashboard from "./pages/HospitalDashboard";
import HospitalDoctors from "./pages/HospitalDoctors";
import FamilyHome from "./pages/FamilyHome";
import FamilyForm from "./pages/FamilyForm";
import FamilyProfile from "./pages/FamilyProfile";
import ProblemIntake from "./pages/ProblemIntake";

function Protected({ roles, children }) {
  const { user } = useAuth();
  if (user === null) return <div className="p-10 text-lg text-slate-500">Loading…</div>;
  if (user === false) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

const CARE_ROLES = ["asha", "admin", "patient", "hospital"];
const SELF_ROLES = ["patient", "admin"];

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster richColors position="top-right" />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/sos" element={<Sos />} />
            <Route path="/me" element={<Protected roles={SELF_ROLES}><FamilyHome /></Protected>} />
            <Route path="/me/add" element={<Protected roles={SELF_ROLES}><FamilyForm /></Protected>} />
            <Route path="/me/:id" element={<Protected roles={SELF_ROLES}><FamilyProfile /></Protected>} />
            <Route path="/me/:id/edit" element={<Protected roles={SELF_ROLES}><FamilyForm /></Protected>} />
            <Route path="/me/:id/help" element={<Protected roles={SELF_ROLES}><ProblemIntake /></Protected>} />
            <Route path="/asha/patients" element={<Protected roles={["asha", "admin", "hospital"]}><PatientList /></Protected>} />
            <Route path="/asha/patients/new" element={<Protected roles={["asha", "admin", "hospital"]}><CreatePatient /></Protected>} />
            <Route path="/asha/patients/:id" element={<Protected roles={CARE_ROLES}><PatientDetail /></Protected>} />
            <Route path="/asha/referrals" element={<Protected><ReferralList /></Protected>} />
            <Route path="/asha/referrals/:id" element={<Protected><ReferralDetail /></Protected>} />
            <Route path="/hospital" element={<Protected roles={["hospital", "admin"]}><HospitalDashboard /></Protected>} />
            <Route path="/hospital/doctors" element={<Protected roles={["hospital", "admin"]}><HospitalDoctors /></Protected>} />
            <Route path="/hospital/referrals" element={<Protected roles={["hospital", "admin"]}><ReferralList /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
