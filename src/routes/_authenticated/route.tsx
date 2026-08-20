import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles } from "@/lib/voxtel.functions";
import {
  getTelOneCustomerSession,
  clearTelOneCustomerSession,
  TelOneCustomerSession,
} from "@/lib/teloneCustomerAuth";
import TelOneSelfServiceAuthModal from "@/components/TelOneSelfServiceAuthModal";
import {
  Phone,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  Radio,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import teloneLogo from "@/assets/images/telone_logo_1785336459233.jpg";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return { user: null };
    }
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) return { user: data.user };
    } catch (e) {
      console.warn("Supabase auth check error:", e);
    }
    return { user: null };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fetchRoles = useServerFn(getMyRoles);

  const { data: rolesData } = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => fetchRoles({ data: undefined }),
  });

  const [mounted, setMounted] = useState(false);
  const [customerSession, setCustomerSession] = useState<TelOneCustomerSession | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCustomerSession(getTelOneCustomerSession());

    const handleSessionChange = (e: Event) => {
      const customEvent = e as CustomEvent<TelOneCustomerSession | null>;
      setCustomerSession(customEvent.detail);
    };
    window.addEventListener("voxtel_customer_session_change", handleSessionChange);
    return () => {
      window.removeEventListener("voxtel_customer_session_change", handleSessionChange);
    };
  }, []);

  const isAdminRoute = pathname.startsWith("/admin");
  const isTechnicianRoute = pathname.startsWith("/technician");

  // Navigation items for the customer self service portal
  const navItems = [
    { to: "/", label: "Home" },
    { to: "/report", label: "Report a Fault" },
    { to: "/my-faults", label: "My Faults Tracker" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top TelOne Official Service & Self-Service Portal Auth Header */}
      <div className="border-b border-border bg-secondary/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-xs">
          {/* Left info: TelOne Official Hotline & Self-Service Portal Link */}
          <div className="flex items-center gap-3 text-muted-foreground">
            <a
              href="tel:950"
              className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
            >
              <Phone className="h-3 w-3 text-emerald-600" />
              <span>Toll Free: 950</span>
            </a>
            <span className="opacity-40 hidden sm:inline">|</span>
            <a
              href="https://selfservice.telone.co.zw"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1 hover:text-primary transition-colors font-medium"
            >
              <ExternalLink className="h-3 w-3" />
              <span>TelOne Self Service Portal</span>
            </a>
          </div>

          {/* Right info: TelOne Customer Self Service SSO Status Badge */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-foreground hover:bg-emerald-500/20 transition-all shadow-xs"
              title="Click to view or switch TelOne Self-Service Subscriber credentials"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              {mounted && customerSession ? (
                <span className="flex items-center gap-1">
                  <span>{customerSession.fullName}</span>
                  <span className="font-mono text-muted-foreground text-[11px]">
                    ({customerSession.accountNumber})
                  </span>
                </span>
              ) : (
                <span>Connect TelOne Self Service</span>
              )}
              <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
            </button>

            {mounted && customerSession && (
              <button
                onClick={() => {
                  clearTelOneCustomerSession();
                  setCustomerSession(null);
                  toast.info("Signed out of TelOne Subscriber session");
                }}
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                title="Sign out of subscriber account"
              >
                <LogOut className="h-3 w-3" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main header with logo + primary nav */}
      <header className="border-b border-border bg-background sticky top-0 z-30 shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src={teloneLogo}
              alt="TelOne Logo"
              className="h-9 w-9 rounded-full object-cover shadow-xs group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
            />
            <div className="leading-tight">
              <div className="text-lg font-bold text-primary tracking-tight">
                Tel<span className="text-accent">One</span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                {isAdminRoute
                  ? "Admin Operations Console"
                  : isTechnicianRoute
                    ? "Technician Field Portal"
                    : "VoXtEl Voice Self-Service Portal"}
              </div>
            </div>
          </Link>

          {/* Primary Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((n) => {
              const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground/80 hover:bg-secondary hover:text-primary"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
            >
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              Report Fault
            </Link>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 md:hidden">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-secondary"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="mt-12 border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground space-y-2">
          <div>
            © {new Date().getFullYear()} TelOne Zimbabwe · VoXtEl Voice Fault Reporting System
          </div>
          <div className="flex justify-center gap-4 text-[11px]">
            <Link to="/" className="hover:underline">
              Self Service
            </Link>
            <span>·</span>
            <Link to="/report" className="hover:underline">
              Report a Fault
            </Link>
            <span>·</span>
            <Link to="/my-faults" className="hover:underline">
              My Faults Tracker
            </Link>
            <span>·</span>
            <a
              href="https://selfservice.telone.co.zw"
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              TelOne Portal
            </a>
          </div>
        </div>
      </footer>

      {/* TelOne Self Service Credentials & Auth Modal */}
      <TelOneSelfServiceAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSessionUpdated={(s) => setCustomerSession(s)}
      />
    </div>
  );
}
