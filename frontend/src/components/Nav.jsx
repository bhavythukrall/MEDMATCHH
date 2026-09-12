import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { Button } from "./ui/button";
import { HeartPulse, LogOut, Languages, Siren } from "lucide-react";

export default function Nav() {
  const { user, logout } = useAuth();
  const { t, toggle, lang } = useT();
  const navigate = useNavigate();

  const linkCls = "pill text-base font-semibold text-[color:var(--forest)] hover:bg-emerald-50 transition-colors";

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-emerald-900/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-wrap">
        <Link to="/" className="flex items-center gap-2" data-testid="nav-home-link">
          <span className="grid place-items-center w-11 h-11 rounded-2xl bg-[color:var(--sage)] text-white">
            <HeartPulse size={24} />
          </span>
          <span className="font-display font-extrabold text-xl sm:text-2xl tracking-tight text-[color:var(--forest)]">
            Sanjeevani<span className="text-[color:var(--terracotta)]">.</span>Care
          </span>
        </Link>

        <nav className="flex items-center gap-2 flex-wrap">
          <Link to="/sos" data-testid="nav-sos-link">
            <Button size="lg" className="bg-[color:var(--terracotta)] hover:bg-[color:var(--terracotta)]/90 font-bold text-base">
              <Siren size={22} className="mr-1.5" /> {t("nav.sos")}
            </Button>
          </Link>

          {user && (user.role === "asha" || user.role === "admin") && (
            <>
              <Link to="/asha/patients" className={linkCls} data-testid="nav-patients-link">{t("nav.patients")}</Link>
              <Link to="/asha/referrals" className={linkCls} data-testid="nav-referrals-link">{t("nav.referrals")}</Link>
            </>
          )}
          {user && user.role === "hospital" && (
            <>
              <Link to="/hospital" className={linkCls} data-testid="nav-hospital-dashboard-link">{t("nav.dashboard")}</Link>
              <Link to="/hospital/doctors" className={linkCls} data-testid="nav-hospital-doctors-link">{t("nav.doctors")}</Link>
              <Link to="/asha/patients" className={linkCls} data-testid="nav-hospital-patients-link">{t("nav.patients")}</Link>
              <Link to="/hospital/referrals" className={linkCls} data-testid="nav-hospital-referrals-link">{t("nav.incoming")}</Link>
            </>
          )}
          {user && user.role === "patient" && (
            <>
              <Link to="/asha/patients" className={linkCls} data-testid="nav-patient-records-link">{t("nav.patients")}</Link>
              <Link to="/asha/referrals" className={linkCls} data-testid="nav-my-referrals-link">{t("nav.myReferrals")}</Link>
            </>
          )}

          <Button
            variant="outline"
            size="lg"
            onClick={toggle}
            className="font-semibold text-base border-2"
            data-testid="language-toggle-button"
            aria-label="Change language"
          >
            <Languages size={20} className="mr-1.5" /> {lang === "en" ? "हिंदी" : "English"}
          </Button>

          {user ? (
            <>
              <span className="text-sm text-slate-500 hidden lg:inline-block px-2" data-testid="nav-user-email">{user.email}</span>
              <Button variant="outline" size="lg" onClick={async () => { await logout(); navigate("/"); }} data-testid="logout-button">
                <LogOut size={20} className="mr-1.5" /> {t("nav.logout")}
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" data-testid="nav-login-link"><Button size="lg" variant="outline">{t("nav.login")}</Button></Link>
              <Link to="/register" data-testid="nav-register-link">
                <Button size="lg" className="bg-[color:var(--sage)] hover:bg-[color:var(--sage-hover)]">{t("nav.register")}</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
