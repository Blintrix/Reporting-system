import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { listFaults, FaultRecord } from "@/lib/voxtel.functions";
import { ZIMBABWE_AREAS, ZimbabweArea, findClosestArea } from "@/lib/zimbabweAreas";
import {
  getTelOneCustomerSession,
  clearTelOneCustomerSession,
  TelOneCustomerSession,
} from "@/lib/teloneCustomerAuth";
import { getFaultTypeFromRecord } from "@/lib/faultTypes";
import useTechnicianRealtime from "@/hooks/useTechnicianRealtime";
import TelOneSelfServiceLanding from "@/components/TelOneSelfServiceLanding";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Mic,
  Phone,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  Radio,
  Wrench,
  ShieldCheck,
  Building2,
  Navigation,
  ArrowRight,
  ExternalLink,
  Layers,
  AlertTriangle,
  LocateFixed,
  Zap,
  LogOut,
  RefreshCw,
} from "lucide-react";

const FaultsMap = lazy(() => import("@/components/FaultsMap"));

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "TelOne VoXtEl — Customer Self Service & Local Area Tracker" }] }),
  component: Home,
});

const STATUS_STEPS = [
  { key: "new", label: "Reported", color: "bg-amber-500" },
  { key: "triaged", label: "AI Triaged", color: "bg-blue-500" },
  { key: "assigned", label: "Tech Assigned", color: "bg-indigo-500" },
  { key: "in_progress", label: "Attending / In Progress", color: "bg-purple-500" },
  { key: "resolved", label: "Service Restored", color: "bg-emerald-500" },
];

function getStatusStepIndex(status: string): number {
  switch (status) {
    case "new":
      return 0;
    case "triaged":
      return 1;
    case "assigned":
    case "acknowledged":
      return 2;
    case "in_progress":
      return 3;
    case "resolved":
      return 4;
    default:
      return 0;
  }
}

function Home() {
  const listFn = useServerFn(listFaults);

  const [customerSession, setCustomerSession] = useState<TelOneCustomerSession | null>(() =>
    getTelOneCustomerSession(),
  );

  useEffect(() => {
    const handleSessionChange = (e: Event) => {
      const customEvent = e as CustomEvent<TelOneCustomerSession | null>;
      setCustomerSession(customEvent.detail);
      if (customEvent.detail?.areaId) {
        setSelectedAreaId(customEvent.detail.areaId);
      }
    };
    window.addEventListener("voxtel_customer_session_change", handleSessionChange);
    return () => {
      window.removeEventListener("voxtel_customer_session_change", handleSessionChange);
    };
  }, []);

  // Customer selected area state with persistence
  const [selectedAreaId, setSelectedAreaId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return (
        customerSession?.areaId || localStorage.getItem("voxtel_customer_area_id") || "hre-central"
      );
    }
    return "hre-central";
  });

  const [userGps, setUserGps] = useState<{ lat: number; lng: number } | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Client reported fault IDs from local storage
  const [clientReportedIds, setClientReportedIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("voxtel_my_reported_fault_ids") || "[]");
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem("voxtel_my_reported_fault_ids") || "[]");
        setClientReportedIds(saved);
      } catch {
        // ignore
      }
    }
  }, []);

  const selectedArea = useMemo(
    () => ZIMBABWE_AREAS.find((a) => a.id === selectedAreaId) || ZIMBABWE_AREAS[0],
    [selectedAreaId],
  );

  const handleAreaChange = (areaId: string) => {
    setSelectedAreaId(areaId);
    if (typeof window !== "undefined") {
      localStorage.setItem("voxtel_customer_area_id", areaId);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserGps(coords);
        const closest = findClosestArea(coords.lat, coords.lng);
        handleAreaChange(closest.id);
        setIsDetectingGps(false);
        toast.success(`📍 Auto-detected Area: ${closest.name}`, {
          description: `Location centered at ${closest.city} (${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})`,
        });
      },
      (err) => {
        setIsDetectingGps(false);
        toast.error(`GPS Detection error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // Fetch strictly scoped faults for customer
  const faultsQ = useQuery({
    queryKey: [
      "faults",
      "customer",
      selectedAreaId,
      userGps?.lat,
      userGps?.lng,
      clientReportedIds.length,
    ],
    queryFn: () =>
      listFn({
        data: {
          scope: "customer",
          areaId: selectedAreaId,
          userLat: userGps?.lat,
          userLng: userGps?.lng,
          clientReportedIds,
          radiusKm: selectedArea.radiusKm,
        },
      }),
    refetchInterval: 8000,
  });

  const myReportedFaults: FaultRecord[] = useMemo(
    () => (faultsQ.data?.myReportedFaults as FaultRecord[]) ?? [],
    [faultsQ.data?.myReportedFaults],
  );

  const areaAttendedFaults: FaultRecord[] = useMemo(
    () => (faultsQ.data?.areaAttendedFaults as FaultRecord[]) ?? [],
    [faultsQ.data?.areaAttendedFaults],
  );

  // Combined scoped list for map (only customer's reports + area attended faults)
  const scopedFaults: FaultRecord[] = useMemo(
    () => (faultsQ.data?.faults as FaultRecord[]) ?? [],
    [faultsQ.data?.faults],
  );

  const techLocs = useTechnicianRealtime();

  // If customer is not signed in, show the exact TelOne Self-Service landing and sign-in page from image
  if (!customerSession) {
    return (
      <div className="space-y-6 pb-12">
        <TelOneSelfServiceLanding
          onSignedIn={(session) => {
            setCustomerSession(session);
            if (session.areaId) {
              setSelectedAreaId(session.areaId);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner */}
      <section
        className="relative overflow-hidden rounded-2xl px-6 py-9 text-primary-foreground sm:px-10 sm:py-12 shadow-lg"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            <Radio className="h-3.5 w-3.5 animate-pulse text-accent" />
            Voice Self-Service & Local Area Tracker
          </div>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl tracking-tight">
            Report TelOne network faults with your voice — in Shona, Ndebele, or English.
          </h1>
          <p className="mt-3 text-sm text-white/95 sm:text-base leading-relaxed">
            VoXtEl automatically transcribes your spoken report, pinpoints your location, and
            dispatches field technicians to restore your landline or internet service fast.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/report"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-bold text-accent-foreground shadow-md hover:bg-accent/90 transition-all hover:scale-[1.02]"
            >
              <Mic className="h-4 w-4" />
              Report a Fault Now
            </Link>
            <Link
              to="/my-faults"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-all"
            >
              <Clock className="h-4 w-4" />
              Track My Tickets ({myReportedFaults.length})
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-10 h-56 w-56 rounded-full bg-accent/25 blur-2xl" />
      </section>

      {/* Connected TelOne Subscriber Banner */}
      {customerSession && (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white font-extrabold text-xs shrink-0 shadow-xs">
                TOL
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-base text-foreground">
                    {customerSession.fullName}
                  </span>
                  <Badge className="bg-emerald-600 text-[10px] text-white font-mono">
                    VERIFIED SUBSCRIBER
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                  <span>
                    Account:{" "}
                    <strong className="font-mono text-foreground">
                      {customerSession.accountNumber}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Voice Line:{" "}
                    <strong className="font-mono text-foreground">
                      {customerSession.landlineNumber}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Service:{" "}
                    <strong className="text-foreground">{customerSession.serviceType}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearTelOneCustomerSession();
                  setCustomerSession(null);
                  toast.info("Signed out of TelOne Subscriber session");
                }}
                className="text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out / Switch
              </Button>
              <a
                href="https://selfservice.telone.co.zw"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                selfservice.telone.co.zw
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Customer Area Location Bar & Privacy Boundary Notification */}
      <section className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                Neighborhood Scope Active
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">
                Customer Privacy Boundary Enforced
              </span>
            </div>
            <div className="text-sm sm:text-base font-extrabold text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
              <span>
                Current Sector: {selectedArea.name} ({selectedArea.city})
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              You are only viewing faults you personally reported and active repairs being attended
              to within <strong>{selectedArea.name}</strong>. Faults from unrelated cities are
              filtered out.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedAreaId}
              onChange={(e) => handleAreaChange(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            >
              {ZIMBABWE_AREAS.map((a) => (
                <option key={a.id} value={a.id}>
                  📍 {a.name} ({a.city})
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={detectLocation}
              disabled={isDetectingGps}
              className="text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
            >
              <LocateFixed className={`h-3.5 w-3.5 ${isDetectingGps ? "animate-spin" : ""}`} />
              {isDetectingGps ? "Locating…" : "Auto-Detect My GPS"}
            </Button>
          </div>
        </div>
      </section>

      {/* Customer Quick Self Service Grid */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Customer Self Service</h2>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Link
            to="/report"
            className="group rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-md"
          >
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Mic className="h-5 w-5" />
            </div>
            <div className="font-bold text-sm text-foreground">Record Fault Report</div>
            <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Speak naturally in Shona, Ndebele, or English. Instant AI normalization & automated
              GPS triage.
            </div>
          </Link>

          <Link
            to="/my-faults"
            className="group rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-md"
          >
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Search className="h-5 w-5" />
            </div>
            <div className="font-bold text-sm text-foreground">Track My Personal Tickets</div>
            <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Follow real-time progress of faults you submitted from triaged to assigned and
              restored.
            </div>
          </Link>

          <a
            href="https://www.telone.co.zw/Shops"
            target="_blank"
            rel="noreferrer"
            className="group rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-md"
          >
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="font-bold text-sm text-foreground">Find TelOne Centre</div>
            <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Locate client service centres and payment shops in {selectedArea.city} and nationwide.
            </div>
          </a>
        </div>
      </section>

      {/* SECTION 1: Faults Reported By You (Personal Status Tracker) */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">
                My Reported Faults & Real-Time Tracking Status ({myReportedFaults.length})
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Direct tracking for all subscriber tickets submitted from your account or device.
            </p>
          </div>
          <Link to="/report">
            <Button size="sm" className="text-xs font-bold gap-1.5 h-8">
              <Mic className="h-3.5 w-3.5" /> Report New Fault
            </Button>
          </Link>
        </div>

        {faultsQ.isLoading && (
          <p className="text-xs text-muted-foreground">Loading your tickets…</p>
        )}

        <div className="space-y-3">
          {myReportedFaults.map((f) => {
            const ft = getFaultTypeFromRecord(f);
            const stepIdx = getStatusStepIndex(f.status);

            return (
              <div
                key={f.id}
                className="rounded-xl border border-primary/25 bg-card hover:border-primary/50 transition-all p-4 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                        YOUR REPORT
                      </Badge>
                      {ft && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${ft.color}`}
                        >
                          {ft.label}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] font-mono uppercase">
                        {f.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="font-bold text-sm text-foreground">
                      {f.technical_summary || f.raw_transcript}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Reported {new Date(f.created_at).toLocaleString()} · Lang:{" "}
                      <span className="uppercase font-mono font-semibold">
                        {f.detected_language}
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/faults/$id"
                    params={{ id: f.id }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    View Live Tracker <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Progress Step Bar */}
                <div className="pt-2 border-t border-border/60">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2">
                    Service Restoration Progress
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 text-center">
                    {STATUS_STEPS.map((step, idx) => {
                      const isCompleted = idx <= stepIdx;
                      const isCurrent = idx === stepIdx;
                      return (
                        <div key={step.key} className="space-y-1">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isCompleted ? step.color : "bg-muted"
                            } ${isCurrent ? "ring-2 ring-primary/40 animate-pulse" : ""}`}
                          />
                          <span
                            className={`text-[10px] block leading-tight font-medium ${
                              isCurrent
                                ? "font-bold text-foreground"
                                : isCompleted
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {myReportedFaults.length === 0 && !faultsQ.isLoading && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">
                No active faults reported by you
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                You haven't submitted any fault tickets yet. If you are experiencing service
                disruptions, click below to record a report.
              </p>
              <Link to="/report">
                <Button size="sm" variant="outline" className="text-xs font-bold mt-2">
                  <Mic className="h-3.5 w-3.5 mr-1" /> Report a Fault Now
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: Local Area Outages & Actively Attended Faults */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-500" />
              <h2 className="text-base font-bold text-foreground">
                Attended Repairs & Local Outages in {selectedArea.name} ({areaAttendedFaults.length}
                )
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live updates on neighborhood infrastructure faults currently being repaired by TelOne
              engineers.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {selectedArea.city} Area Hub
          </Badge>
        </div>

        {/* Local Area Interactive Map */}
        <div className="space-y-2">
          <ClientOnly fallback={<MapSkeleton />}>
            <Suspense fallback={<MapSkeleton />}>
              <FaultsMap faults={scopedFaults} technicians={techLocs} />
            </Suspense>
          </ClientOnly>
          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-1 font-mono">
            <span>
              📍 Showing {scopedFaults.length} scoped fault sites in {selectedArea.name}
            </span>
            <span>{techLocs.length} field engineers on duty</span>
          </div>
        </div>

        {/* Local Area Incidents List */}
        <div className="space-y-2.5 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Active Repairs in Your Neighborhood
          </h3>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {areaAttendedFaults.map((f) => {
              const ft = getFaultTypeFromRecord(f);
              return (
                <div
                  key={f.id}
                  className="flex items-start justify-between rounded-lg border border-border p-3.5 bg-muted/20 hover:border-primary/40 transition-colors"
                >
                  <div className="min-w-0 pr-2 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="font-bold text-xs text-foreground line-clamp-1">
                        {f.technical_summary || f.raw_transcript}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Status:{" "}
                      <strong className="text-foreground capitalize">
                        {f.status.replace("_", " ")}
                      </strong>{" "}
                      · Category: {ft?.label || "General Telecom"}
                    </div>
                    {f.assigned_technician_id && (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Wrench className="h-3 w-3" /> Field technician attending on-site
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={f.status === "in_progress" ? "default" : "secondary"}
                    className="text-[10px] uppercase font-mono shrink-0"
                  >
                    {f.status.replace("_", " ")}
                  </Badge>
                </div>
              );
            })}

            {areaAttendedFaults.length === 0 && !faultsQ.isLoading && (
              <div className="col-span-2 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                ✨ No active major network outages reported in {selectedArea.name}. Local exchange
                systems operating normally.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TelOne Customer Support Hotline */}
      <section className="rounded-xl border border-border bg-gradient-to-r from-primary/5 to-accent/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-bold text-foreground text-sm">
            Need immediate assistance with landline, voice, or fiber?
          </h3>
          <p className="text-xs text-muted-foreground">
            Our toll-free customer support hotline is available 24/7 across Zimbabwe.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="tel:950"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <Phone className="h-3.5 w-3.5" /> Call Toll Free 950
          </a>
        </div>
      </section>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="flex h-[380px] w-full items-center justify-center rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground font-mono">
      Loading TelOne neighborhood map…
    </div>
  );
}
