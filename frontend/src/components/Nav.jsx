import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "./ui/button";
import { HeartPulse, LogOut } from "lucide-react";

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 border-b border-emerald-900/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2" data-testid="nav-home-link">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-[color:var(--sage)] text-white">
            <HeartPulse size={18} />
          </span>
          <span className="font-display font-extrabold text-xl tracking-tight text-[color:var(--forest)]">
            Sanjeevani<span className="text-[color:var(--terracotta)]">.</span>Care
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          {user && user.role === "asha" && (
            <>
              <Link to="/asha/patients" className="pill text-sm hover:bg-emerald-50" data-testid="nav-patients-link">Patients</Link>
              <Link to="/asha/referrals" className="pill text-sm hover:bg-emerald-50" data-testid="nav-referrals-link">Referrals</Link>
            </>
          )}
          {user && user.role === "hospital" && (
            <>
              <Link to="/hospital" className="pill text-sm hover:bg-emerald-50" data-testid="nav-hospital-dashboard-link">Dashboard</Link>
              <Link to="/hospital/referrals" className="pill text-sm hover:bg-emerald-50" data-testid="nav-hospital-referrals-link">Incoming Referrals</Link>
            </>
          )}
          {user && user.role === "patient" && (
            <Link to="/asha/referrals" className="pill text-sm hover:bg-emerald-50" data-testid="nav-my-referrals-link">My Referrals</Link>
          )}
          {user ? (
            <>
              <span className="text-xs text-slate-500 hidden md:inline-block px-2" data-testid="nav-user-email">{user.email}</span>
              <Button variant="outline" size="sm" onClick={async () => { await logout(); navigate("/"); }} data-testid="logout-button">
                <LogOut size={14} className="mr-1" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" data-testid="nav-login-link"><Button size="sm" variant="outline">Login</Button></Link>
              <Link to="/register" data-testid="nav-register-link"><Button size="sm" className="bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]">Get started</Button></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
