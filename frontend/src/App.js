import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { AuthProvider, useAuth } from "./lib/auth";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PatientList from "./pages/PatientList";
import CreatePatient from "./pages/CreatePatient";
import PatientDetail from "./pages/PatientDetail";
import ReferralList from "./pages/ReferralList";
import ReferralDetail from "./pages/ReferralDetail";
import HospitalDashboard from "./pages/HospitalDashboard";

function Protected({ roles, children }) {
  const { user } = useAuth();
  if (user === null) return <div className="p-10 text-slate-500">Loading…</div>;
  if (user === false) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/asha/patients" element={<Protected roles={["asha", "admin", "patient"]}><PatientList /></Protected>} />
          <Route path="/asha/patients/new" element={<Protected roles={["asha", "admin", "patient"]}><CreatePatient /></Protected>} />
          <Route path="/asha/patients/:id" element={<Protected roles={["asha", "admin", "patient"]}><PatientDetail /></Protected>} />
          <Route path="/asha/referrals" element={<Protected><ReferralList /></Protected>} />
          <Route path="/asha/referrals/:id" element={<Protected><ReferralDetail /></Protected>} />
          <Route path="/hospital" element={<Protected roles={["hospital", "admin"]}><HospitalDashboard /></Protected>} />
          <Route path="/hospital/referrals" element={<Protected roles={["hospital", "admin"]}><ReferralList /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
