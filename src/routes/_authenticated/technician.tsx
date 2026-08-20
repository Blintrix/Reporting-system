import { createFileRoute, Link, ClientOnly, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  listFaults,
  updateTechnicianLocation,
  technicianAttendFaultAction,
  FaultRecord,
} from "@/lib/voxtel.functions";
import { FAULT_TYPE_DEFINITIONS, FaultTypeKey, getFaultTypeFromRecord } from "@/lib/faultTypes";
import { DesignatedTechnician } from "@/lib/technicianLogbook";
import { getTelOneCustomerSession, TelOneCustomerSession } from "@/lib/teloneCustomerAuth";
import useTechnicianRealtime from "@/hooks/useTechnicianRealtime";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import FaultTroubleshootingGuide from "@/components/FaultTroubleshootingGuide";
import {
  Zap,
  Building2,
  PhoneCall,
  Wifi,
  BatteryWarning,
  Cpu,
  AlertTriangle,
  Volume2,
  Wrench,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  Star,
  Radio,
  Navigation,
  MapPin,
  Check,
  RefreshCw,
  Layers,
  Inbox,
  Eye,
  X,
  ExternalLink,
  UserCheck,
  ShieldAlert,
  Lock,
  ArrowLeft,
  Clock,
} from "lucide-react";
import TechnicianLogBookStation from "@/components/TechnicianLogBookStation";

const FaultsMap = lazy(() => import("@/components/FaultsMap"));

export const Route = createFileRoute("/_authenticated/technician")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const dutyTech = localStorage.getItem("voxtel_duty_technician");
      const customerSession = localStorage.getItem("voxtel_telone_customer_session");
      // Customers cannot access the technician page in any way
      if (customerSession && !dutyTech) {
        throw redirect({ to: "/" });
      }
    }
  },
  head: () => ({ meta: [{ title: "Technician Dispatch Board — VoXtEl" }] }),
  component: Tech,
});

const STATUS_DOT: Record<string, string> = {
  new: "bg-yellow-500",
  triaged: "bg-orange-500",
  assigned: "bg-amber-500",
  acknowledged: "bg-blue-500",
  in_progress: "bg-purple-500",
  resolved: "bg-emerald-500",
};

const STATUS_OPTIONS = ["assigned", "acknowledged", "in_progress", "resolved"] as const;
const SEVERITY_OPTIONS = ["low", "medium", "high", "critical"] as const;

type ScopeTab = "all" | "my_jobs" | "available" | "in_sector" | "resolved";

function renderFaultTypeIcon(key: FaultTypeKey | string, className = "h-4 w-4") {
  switch (key) {
    case "fiber_cut":
    case "fiber_optic_cut":
      return <Zap className={className} />;
    case "exchange_outage":
    case "central_exchange_outage":
      return <Building2 className={className} />;
    case "copper_landline":
    case "copper_landline_disruption":
      return <PhoneCall className={className} />;
    case "broadband_adsl_lte":
    case "broadband_lte_degradation":
      return <Wifi className={className} />;
    case "power_generator":
    case "power_auxiliary_failure":
      return <BatteryWarning className={className} />;
    case "hardware_cabinet":
    case "msan_cabinet_damage":
      return <Cpu className={className} />;
    default:
      return <AlertTriangle className={className} />;
  }
}

function notify(title: string, body: string) {
  toast.info(title, { description: body });
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification(title, { body });
    } catch {
      // ignore
    }
  }
}

function Tech() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listFaults);
  const attendFn = useServerFn(technicianAttendFaultAction);
  const locFn = useServerFn(updateTechnicianLocation);

  const [customerSession, setCustomerSession] = useState<TelOneCustomerSession | null>(() =>
    getTelOneCustomerSession(),
  );

  useEffect(() => {
    const handleCustomerSessionChange = (e: Event) => {
      const customEvent = e as CustomEvent<TelOneCustomerSession | null>;
      setCustomerSession(customEvent.detail);
    };
    window.addEventListener("voxtel_customer_session_change", handleCustomerSessionChange);
    return () => {
      window.removeEventListener("voxtel_customer_session_change", handleCustomerSessionChange);
    };
  }, []);

  const [loggedTech, setLoggedTech] = useState<DesignatedTechnician | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("voxtel_duty_technician");
      if (saved) {
        try {
          return JSON.parse(saved) as DesignatedTechnician;
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  // Listen to session changes
  useEffect(() => {
    function handleSessionUpdate() {
      const saved = localStorage.getItem("voxtel_duty_technician");
      if (saved) {
        try {
          setLoggedTech(JSON.parse(saved) as DesignatedTechnician);
        } catch {
          setLoggedTech(null);
        }
      } else {
        setLoggedTech(null);
      }
    }
    window.addEventListener("voxtel_technician_session_change", handleSessionUpdate);
    window.addEventListener("storage", handleSessionUpdate);
    return () => {
      window.removeEventListener("voxtel_technician_session_change", handleSessionUpdate);
      window.removeEventListener("storage", handleSessionUpdate);
    };
  }, []);

  const q = useQuery({
    queryKey: ["faults", "tech"],
    queryFn: () => listFn({ data: { scope: "technician" } }),
    refetchInterval: 8000,
  });
  const techLocs = useTechnicianRealtime();

  // Navigation tab scope
  const [scopeTab, setScopeTab] = useState<ScopeTab>("all");

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [faultTypeFilter, setFaultTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "severity">("newest");

  // Quick inspection modal state
  const [inspectingFault, setInspectingFault] = useState<FaultRecord | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [showResolveModalForId, setShowResolveModalForId] = useState<string | null>(null);
  const [playingCardSpeechId, setPlayingCardSpeechId] = useState<string | null>(null);

  const handleCardSpeak = (f: FaultRecord) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Text-to-speech is not supported in this browser.");
      return;
    }
    if (playingCardSpeechId === f.id) {
      window.speechSynthesis.cancel();
      setPlayingCardSpeechId(null);
      return;
    }

    const textToSpeak = f.raw_transcript || f.technical_summary;
    if (!textToSpeak) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (f.detected_language === "sn") utterance.lang = "sn-ZW";
    else if (f.detected_language === "nd") utterance.lang = "nd-ZW";
    else utterance.lang = "en-ZW";

    utterance.onstart = () => setPlayingCardSpeechId(f.id);
    utterance.onend = () => setPlayingCardSpeechId(null);
    utterance.onerror = () => setPlayingCardSpeechId(null);

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Attend / Claim Action Mutation
  const attendMut = useMutation({
    mutationFn: async (vars: {
      fault_id: string;
      action: "attend" | "acknowledge" | "start_work" | "resolve" | "release";
      notes?: string;
    }) => {
      if (!loggedTech) {
        throw new Error(
          "Please sign in to the 3-Day Duty Log Book first to claim or attend to faults.",
        );
      }
      return attendFn({
        data: {
          fault_id: vars.fault_id,
          technician_id: loggedTech.id,
          technician_name: loggedTech.name,
          technician_code: loggedTech.technician_code,
          action: vars.action,
          notes: vars.notes,
        },
      });
    },
    onSuccess: (res, vars) => {
      if (vars.action === "attend") {
        toast.success("🎯 Fault Claimed Successfully!", {
          description: `${loggedTech?.name} is now attending to this fault.`,
        });
      } else if (vars.action === "acknowledge") {
        toast.success("📋 Dispatch Order Acknowledged", {
          description: "Ticket status set to acknowledged.",
        });
      } else if (vars.action === "start_work") {
        toast.success("🚗 Work In Progress", {
          description: "Technician on-site repairing subscriber infrastructure.",
        });
      } else if (vars.action === "resolve") {
        toast.success("✅ Fault Marked as Resolved", {
          description: "Repairs verified and recorded in field log.",
        });
        setShowResolveModalForId(null);
        setResolveNotes("");
      } else if (vars.action === "release") {
        toast.info("Ticket Released", {
          description: "Fault returned to team queue for re-assignment.",
        });
      }

      if (inspectingFault && inspectingFault.id === vars.fault_id) {
        setInspectingFault((prev) =>
          prev ? { ...prev, status: res.status as FaultRecord["status"] } : null,
        );
      }
      queryClient.invalidateQueries({ queryKey: ["faults"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  // Realtime subscriptions
  useEffect(() => {
    const ch = supabase
      .channel("tech-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "faults" }, (payload) => {
        const oldRow = payload.old as { status?: string } | null;
        const newRow = payload.new as { status?: string; technical_summary?: string } | null;
        if (
          payload.eventType === "UPDATE" &&
          oldRow?.status &&
          newRow?.status &&
          oldRow.status !== newRow.status
        ) {
          notify(
            "Fault status changed",
            `${newRow.technical_summary?.slice(0, 60) || "A fault"} → ${newRow.status}`,
          );
        } else if (payload.eventType === "INSERT") {
          notify("New fault reported", newRow?.technical_summary?.slice(0, 80) || "Just reported");
        }
        q.refetch();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fault_events" }, () =>
        q.refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [q]);

  // Live location tracking
  const [tracking, setTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!tracking) {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not available");
      setTracking(false);
      return;
    }
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    let lastSent = 0;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSent < 10_000) return; // throttle to 10s
        lastSent = now;
        locFn({
          data: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading ?? null,
            speed: pos.coords.speed ?? null,
          },
        }).catch((e: Error) => {
          toast.error(e.message);
        });
      },
      (err) => toast.error(`GPS: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [tracking, locFn]);

  const faults: FaultRecord[] = useMemo(
    () => (q.data?.faults as FaultRecord[]) ?? [],
    [q.data?.faults],
  );

  // Helper to check if fault is assigned to current logged-in technician
  const isAssignedToMe = useCallback(
    (f: FaultRecord) => {
      if (!loggedTech) return false;
      return (
        f.assigned_technician_id === loggedTech.id ||
        f.assigned_technician_id === loggedTech.technician_code ||
        (f.assigned_technician &&
          (f.assigned_technician.id === loggedTech.id ||
            f.assigned_technician.code === loggedTech.technician_code))
      );
    },
    [loggedTech],
  );

  // Helper to check if fault matches technician's sector
  const isMatchesMySector = useCallback(
    (f: FaultRecord) => {
      if (!loggedTech?.sector) return false;
      const sectorKeywords = loggedTech.sector.toLowerCase().split(/\s+/);
      const summary =
        `${f.technical_summary ?? ""} ${f.raw_transcript ?? ""} ${f.category ?? ""}`.toLowerCase();
      return sectorKeywords.some((k) => k.length > 3 && summary.includes(k));
    },
    [loggedTech],
  );

  // Stats
  const stats = useMemo(() => {
    let assigned = 0;
    let acknowledged = 0;
    let in_progress = 0;
    let resolved = 0;
    let myJobsCount = 0;
    let availableCount = 0;
    let inSectorCount = 0;

    for (const f of faults) {
      if (f.status === "assigned") assigned++;
      if (f.status === "acknowledged") acknowledged++;
      if (f.status === "in_progress") in_progress++;
      if (f.status === "resolved") resolved++;

      if (isAssignedToMe(f) && f.status !== "resolved") {
        myJobsCount++;
      }
      if (!f.assigned_technician_id && f.status !== "resolved") {
        availableCount++;
      }
      if (isMatchesMySector(f) && f.status !== "resolved") {
        inSectorCount++;
      }
    }

    return {
      total: faults.length,
      assigned,
      acknowledged,
      in_progress,
      resolved,
      myJobsCount,
      availableCount,
      inSectorCount,
    };
  }, [faults, isAssignedToMe, isMatchesMySector]);

  // Fault Type Counts
  const faultTypeCounts = useMemo(() => {
    const counts: Record<FaultTypeKey, number> = {
      fiber_cut: 0,
      exchange_outage: 0,
      copper_landline: 0,
      broadband_adsl_lte: 0,
      power_generator: 0,
      hardware_cabinet: 0,
      general_telecom: 0,
    };
    for (const f of faults) {
      const ft = getFaultTypeFromRecord(f);
      if (ft && ft.id in counts) {
        counts[ft.id]++;
      }
    }
    return counts;
  }, [faults]);

  // Filtered Faults based on scope tabs and filter controls
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return faults.filter((f) => {
      // Scope tab filtering
      if (scopeTab === "my_jobs") {
        if (!isAssignedToMe(f) || f.status === "resolved") return false;
      } else if (scopeTab === "available") {
        if (f.assigned_technician_id != null || f.status === "resolved") return false;
      } else if (scopeTab === "in_sector") {
        if (!isMatchesMySector(f) || f.status === "resolved") return false;
      } else if (scopeTab === "resolved") {
        if (f.status !== "resolved") return false;
      }

      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      if (severityFilter !== "all" && f.severity !== severityFilter) return false;
      if (faultTypeFilter !== "all") {
        const ft = getFaultTypeFromRecord(f);
        if (!ft || (ft.id !== faultTypeFilter && ft.key !== faultTypeFilter)) return false;
      }
      if (term) {
        const summary = typeof f.technical_summary === "string" ? f.technical_summary : "";
        const transcript = typeof f.raw_transcript === "string" ? f.raw_transcript : "";
        const cat = typeof f.category === "string" ? f.category : "";
        const hay = `${summary} ${transcript} ${cat}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [
    faults,
    scopeTab,
    statusFilter,
    severityFilter,
    faultTypeFilter,
    search,
    isAssignedToMe,
    isMatchesMySector,
  ]);

  // Sorted faults
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const severityWeight: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    if (sortBy === "severity") {
      arr.sort((a, b) => (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0));
    } else {
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return arr;
  }, [filtered, sortBy]);

  const active = useMemo(() => sorted.filter((f) => f.status !== "resolved"), [sorted]);
  const resolvedList = useMemo(() => sorted.filter((f) => f.status === "resolved"), [sorted]);

  // Find logged-in technician's first active job for quick navigation bar
  const myPrimaryActiveJob = useMemo(() => {
    if (!loggedTech) return null;
    return faults.find((f) => isAssignedToMe(f) && f.status !== "resolved");
  }, [faults, loggedTech, isAssignedToMe]);

  const scrollToLogBook = () => {
    const el = document.getElementById("technician-logbook-station");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // If user is connected as a customer subscriber and not logged in as a duty technician, block access completely
  if (customerSession && !loggedTech) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/30 shadow-md">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <Badge variant="destructive" className="font-mono text-xs uppercase px-3 py-1">
            403 · Access Forbidden
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Technician Portal Access Prohibited
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            This terminal is restricted exclusively to authenticated TelOne Field Service
            Technicians and Network Operations engineers on active duty. Customers and subscribers
            cannot access technician dispatch queues or field tools.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 text-xs space-y-1.5 text-left">
          <div className="font-bold text-foreground flex items-center justify-between">
            <span>Current Subscriber: {customerSession.fullName}</span>
            <Badge className="bg-emerald-600 text-white text-[10px]">Subscriber Role</Badge>
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-2 text-[11px]">
            <span>
              Account:{" "}
              <strong className="font-mono text-foreground">{customerSession.accountNumber}</strong>
            </span>
            <span>•</span>
            <span>
              Line:{" "}
              <strong className="font-mono text-foreground">
                {customerSession.landlineNumber}
              </strong>
            </span>
            <span>•</span>
            <span>
              Sector: <strong className="text-foreground">{customerSession.areaName}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/">
            <Button className="font-bold text-xs gap-1.5 shadow-md">
              <ArrowLeft className="h-4 w-4" /> Return to Customer Portal
            </Button>
          </Link>
          <Link to="/my-faults">
            <Button variant="outline" className="font-bold text-xs gap-1.5">
              <Clock className="h-4 w-4" /> View My Reported Tickets
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-semibold text-[10px]">
              TelOne Engineering Operations
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">
              Field Technician Triage & Job Claiming Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Technician Dispatch Board
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time subscriber faults categorized by Voice AI. Select any open fault below to
            claim and attend to field repairs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loggedTech ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>
                {loggedTech.name} ({loggedTech.technician_code})
              </span>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToLogBook}
              className="text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 gap-1.5"
            >
              <BookOpen className="h-3.5 w-3.5" /> Sign into Duty Log Book
            </Button>
          )}

          <Button
            variant={tracking ? "destructive" : "default"}
            onClick={() => setTracking((v) => !v)}
            className="shadow-sm font-semibold text-xs h-8"
          >
            {tracking ? "■ Stop Sharing Location" : "📍 Share Live GPS"}
          </Button>
        </div>
      </div>

      {/* Technician 3-Day Duty Log Book Station */}
      <div id="technician-logbook-station">
        <TechnicianLogBookStation />
      </div>

      {/* Active Duty Status & Quick Job Bar (When Logged In) */}
      {loggedTech && (
        <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Active Duty Station
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-background font-mono">
                    {loggedTech.shift_label}
                  </Badge>
                  <Badge className="text-[10px] bg-emerald-600 text-white font-semibold">
                    {loggedTech.sector}
                  </Badge>
                </div>
                <div className="text-sm font-extrabold text-foreground">
                  {loggedTech.name} ({loggedTech.technician_code})
                </div>
              </div>
            </div>

            {myPrimaryActiveJob ? (
              <div className="flex flex-wrap items-center gap-2 bg-background/80 border border-border p-2 rounded-lg">
                <div className="text-xs space-y-0.5 pr-2">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Radio className="h-3 w-3 text-amber-500 animate-pulse" /> Ongoing Ticket
                  </div>
                  <div className="font-semibold text-foreground max-w-[240px] truncate">
                    {myPrimaryActiveJob.technical_summary || "Active field ticket"}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setInspectingFault(myPrimaryActiveJob)}
                  className="text-xs font-bold h-7 bg-primary text-primary-foreground"
                >
                  Inspect Ticket
                </Button>
                <Link
                  to="/faults/$id"
                  params={{ id: myPrimaryActiveJob.id }}
                  className="text-xs font-bold h-7 px-2.5 rounded-md border border-input bg-card flex items-center gap-1 hover:bg-muted text-foreground"
                >
                  Tracking <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>
                  Ready for dispatch — click{" "}
                  <strong className="text-foreground">"Attend to this Fault"</strong> below to claim
                  a job.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Status Counters */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Faults" value={stats.total} tone="bg-muted/50 border-border" />
        <StatCard
          label="My Claimed Jobs"
          value={stats.myJobsCount}
          tone="bg-primary/10 border-primary/30 text-primary font-black"
        />
        <StatCard
          label="Unassigned Queue"
          value={stats.availableCount}
          tone="bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
        />
        <StatCard
          label="In Progress"
          value={stats.in_progress}
          tone="bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
        />
        <StatCard
          label="Resolved"
          value={stats.resolved}
          tone="bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
        />
      </div>

      {/* Scope Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setScopeTab("all")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            scopeTab === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Layers className="h-3.5 w-3.5" /> All Open Faults (
          {faults.filter((f) => f.status !== "resolved").length})
        </button>

        <button
          type="button"
          onClick={() => setScopeTab("my_jobs")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            scopeTab === "my_jobs"
              ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/30"
              : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Star className="h-3.5 w-3.5 text-amber-300" /> My Claimed Jobs ({stats.myJobsCount})
        </button>

        <button
          type="button"
          onClick={() => setScopeTab("available")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            scopeTab === "available"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Inbox className="h-3.5 w-3.5" /> Available to Claim ({stats.availableCount})
        </button>

        {loggedTech?.sector && (
          <button
            type="button"
            onClick={() => setScopeTab("in_sector")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              scopeTab === "in_sector"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" /> In My Sector: {loggedTech.sector.split(" ")[0]} (
            {stats.inSectorCount})
          </button>
        )}

        <button
          type="button"
          onClick={() => setScopeTab("resolved")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            scopeTab === "resolved"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Resolved Archive ({stats.resolved})
        </button>
      </div>

      {/* AI Speech Diagnosis & Fault Type Breakdown */}
      <section className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              AI Speech Diagnosis & Fault Type Breakdown
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Click any category below to filter faults
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(FAULT_TYPE_DEFINITIONS) as FaultTypeKey[]).map((key) => {
            const def = FAULT_TYPE_DEFINITIONS[key];
            const count = faultTypeCounts[key] || 0;
            const isSelected = faultTypeFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFaultTypeFilter(isSelected ? "all" : key)}
                className={`flex items-start justify-between p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/15 shadow-sm ring-1 ring-primary"
                    : "border-border bg-card/80 hover:bg-card hover:border-primary/40"
                }`}
              >
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                    <span className={def.color}>{renderFaultTypeIcon(key, "h-3.5 w-3.5")}</span>
                    <span>{def.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {def.description}
                  </p>
                </div>
                <div
                  className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold shrink-0 ${
                    count > 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Filter & Search Bar */}
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-5 shadow-xs">
        <div className="md:col-span-2">
          <Input
            placeholder="Search voice transcript, summary, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs"
          />
        </div>

        <select
          value={faultTypeFilter}
          onChange={(e) => setFaultTypeFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">⚡ All Categories ({faults.length})</option>
          {(Object.keys(FAULT_TYPE_DEFINITIONS) as FaultTypeKey[]).map((k) => (
            <option key={k} value={k}>
              {FAULT_TYPE_DEFINITIONS[k].label} ({faultTypeCounts[k] || 0})
            </option>
          ))}
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Severities</option>
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              Severity: {s.toUpperCase()}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "newest" | "severity")}
          className="rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="newest">Sort: Newest First</option>
          <option value="severity">Sort: Highest Severity First</option>
        </select>
      </div>

      {/* Zimbabwe Interactive Dispatch Map */}
      <section className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Interactive Fault Dispatch Map — Zimbabwe
            </h2>
            <p className="text-xs text-muted-foreground">
              Displays subscriber fault sites & live technician GPS tracking positions across
              Zimbabwe.
            </p>
          </div>
          <Legend />
        </div>
        <ClientOnly fallback={<MapSkeleton />}>
          <Suspense fallback={<MapSkeleton />}>
            <FaultsMap faults={filtered} technicians={techLocs} />
          </Suspense>
        </ClientOnly>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 font-mono">
          <span>
            {filtered.filter((f) => f.lat != null && f.lng != null).length} of {filtered.length}{" "}
            fault sites mapped
          </span>
          <span>{techLocs.length ?? 0} field engineers active</span>
        </div>
      </section>

      {/* Faults List Section with 1-Click "Attend" & Navigation Actions */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              {scopeTab === "my_jobs" && `My Active Claimed Jobs (${active.length})`}
              {scopeTab === "available" && `Available Unclaimed Faults (${active.length})`}
              {scopeTab === "in_sector" && `Faults in Sector (${active.length})`}
              {scopeTab === "resolved" && `Resolved Archive (${resolvedList.length})`}
              {scopeTab === "all" && `Open Faults Queue (${active.length})`}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {faultTypeFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFaultTypeFilter("all")}
                className="text-xs text-muted-foreground hover:text-foreground h-7"
              >
                Clear Category Filter
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => q.refetch()}
              className="text-xs h-7 gap-1 font-semibold"
            >
              <RefreshCw className={`h-3 w-3 ${q.isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        {q.isLoading && <p className="text-xs text-muted-foreground">Loading fault tickets…</p>}

        <div className="space-y-3.5">
          {(scopeTab === "resolved" ? resolvedList : active).map((f) => {
            const ft = getFaultTypeFromRecord(f);
            const isMine = isAssignedToMe(f);
            const isUnassigned = !f.assigned_technician_id;

            return (
              <div
                key={f.id}
                className={`rounded-xl border p-4 shadow-xs space-y-3 transition-all ${
                  isMine
                    ? "border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/20"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                {/* Card Header & Badges */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_DOT[f.status] ?? "bg-gray-400"}`}
                      />
                      <button
                        type="button"
                        onClick={() => setInspectingFault(f)}
                        className="font-bold text-sm text-foreground hover:text-primary hover:underline transition-colors text-left"
                      >
                        {f.technical_summary || f.raw_transcript.slice(0, 80) || "Fault Report"}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(f.created_at).toLocaleString()}</span>
                      <span>·</span>
                      <span className="uppercase font-mono font-semibold">
                        Lang: {f.detected_language}
                      </span>
                      {f.lat != null && f.lng != null && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-foreground font-semibold">
                            📍 GPS: {f.lat.toFixed(4)}, {f.lng.toFixed(4)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isMine && (
                      <Badge className="bg-amber-600 text-white font-bold text-[10px] gap-1 shadow-xs">
                        <Star className="h-3 w-3 fill-white" /> YOUR ACTIVE JOB
                      </Badge>
                    )}
                    {isUnassigned && f.status !== "resolved" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 font-bold"
                      >
                        UNASSIGNED QUEUE
                      </Badge>
                    )}
                    {ft && (
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-semibold gap-1 ${ft.color}`}
                      >
                        {renderFaultTypeIcon(ft.key, "h-3 w-3")}
                        {ft.label}
                      </Badge>
                    )}
                    <Badge
                      variant={
                        f.severity === "critical"
                          ? "destructive"
                          : f.severity === "high"
                            ? "default"
                            : "secondary"
                      }
                      className="text-[10px] uppercase font-mono font-bold"
                    >
                      {f.severity}
                    </Badge>
                    <Badge className="text-[10px] uppercase font-mono bg-secondary text-secondary-foreground">
                      {f.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                {/* Spoken Voice Transcript & Recommended Procedure */}
                <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Volume2 className="h-3 w-3 text-primary" /> Customer Voice Audio Message
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCardSpeak(f)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                          playingCardSpeechId === f.id
                            ? "bg-rose-500 text-white animate-pulse"
                            : "bg-primary/10 hover:bg-primary/20 text-primary"
                        }`}
                      >
                        {playingCardSpeechId === f.id ? "⏸ Stop Voice" : "🔊 Listen Voice"}
                      </button>
                    </div>
                    <p className="text-foreground italic font-mono text-[11px] line-clamp-2">
                      "{f.raw_transcript || "No transcript recorded."}"
                    </p>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                        <Wrench className="h-3 w-3" /> The Best Way to Fix It
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ~{ft?.estimatedRepairTimeMinutes || 30}m SOP
                      </span>
                    </div>
                    <p className="text-muted-foreground font-medium text-[11px] line-clamp-2">
                      {ft?.recommendedAction ||
                        "Measure circuit parameters, verify DP connections, and contact central exchange test desk."}
                    </p>
                  </div>
                </div>

                {/* Action Controls & Attend Button */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectingFault(f)}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> Inspect Procedure & Timeline
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <Link
                      to="/faults/$id"
                      params={{ id: f.id }}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      Full Ticket <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  {/* Actions for Logged-In Technicians */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* If fault is unassigned or assigned to someone else, logged in technician can select to attend */}
                    {!isMine && f.status !== "resolved" && (
                      <Button
                        size="sm"
                        disabled={attendMut.isPending}
                        onClick={() => {
                          if (!loggedTech) {
                            toast.error(
                              "Please sign in to the 3-Day Duty Log Book first to claim faults.",
                            );
                            scrollToLogBook();
                            return;
                          }
                          attendMut.mutate({ fault_id: f.id, action: "attend" });
                        }}
                        className="text-xs font-bold h-8 gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <UserCheck className="h-3.5 w-3.5" /> Attend to this Fault
                      </Button>
                    )}

                    {/* If fault is assigned to THIS logged in technician */}
                    {isMine && f.status === "assigned" && (
                      <Button
                        size="sm"
                        disabled={attendMut.isPending}
                        onClick={() => attendMut.mutate({ fault_id: f.id, action: "acknowledge" })}
                        className="text-xs font-bold h-8 gap-1.5 shadow-sm bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Check className="h-3.5 w-3.5" /> Acknowledge Job
                      </Button>
                    )}

                    {isMine && f.status === "acknowledged" && (
                      <Button
                        size="sm"
                        disabled={attendMut.isPending}
                        onClick={() => attendMut.mutate({ fault_id: f.id, action: "start_work" })}
                        className="text-xs font-bold h-8 gap-1.5 shadow-sm bg-purple-600 text-white hover:bg-purple-700"
                      >
                        <Navigation className="h-3.5 w-3.5" /> Start Work / On-Site
                      </Button>
                    )}

                    {isMine && f.status === "in_progress" && (
                      <Button
                        size="sm"
                        onClick={() => setShowResolveModalForId(f.id)}
                        className="text-xs font-bold h-8 gap-1.5 shadow-sm bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark Resolved
                      </Button>
                    )}

                    {isMine && f.status !== "resolved" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={attendMut.isPending}
                        onClick={() => attendMut.mutate({ fault_id: f.id, action: "release" })}
                        className="text-xs text-muted-foreground hover:text-destructive h-8 px-2"
                      >
                        Release Job
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {active.length === 0 && scopeTab !== "resolved" && (
            <div className="rounded-xl border border-border bg-card p-8 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">No active faults in this view</h3>
              <p className="text-xs text-muted-foreground">
                All faults matching your selected tab have been attended to or resolved.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScopeTab("all");
                  setFaultTypeFilter("all");
                  setStatusFilter("all");
                  setSeverityFilter("all");
                  setSearch("");
                }}
                className="text-xs mt-2"
              >
                Reset All Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Quick Inspection Modal / Drawer */}
      {inspectingFault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground text-[10px]">
                    Fault Diagnostics
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    ID: {inspectingFault.id.slice(0, 8)}…
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mt-1">
                  {inspectingFault.technical_summary || "Subscriber Fault Report"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingFault(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Master Troubleshooting & Voice Guide */}
            <FaultTroubleshootingGuide fault={inspectingFault} showChecklistPersistence={true} />

            {/* GPS & Navigation */}
            {inspectingFault.lat != null && inspectingFault.lng != null && (
              <div className="p-3 rounded-lg border border-border bg-card flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                  <div>
                    <div className="font-bold text-foreground">GPS Location Coordinates</div>
                    <div className="font-mono text-muted-foreground">
                      Latitude: {inspectingFault.lat.toFixed(6)}, Longitude:{" "}
                      {inspectingFault.lng.toFixed(6)}
                    </div>
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${inspectingFault.lat},${inspectingFault.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold flex items-center gap-1"
                >
                  <Navigation className="h-3.5 w-3.5" /> Navigate via Google Maps
                </a>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
              <Link
                to="/faults/$id"
                params={{ id: inspectingFault.id }}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                Open Full Tracking Page <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <div className="flex items-center gap-2">
                {!isAssignedToMe(inspectingFault) && inspectingFault.status !== "resolved" && (
                  <Button
                    size="sm"
                    disabled={attendMut.isPending}
                    onClick={() => {
                      if (!loggedTech) {
                        toast.error(
                          "Please sign in to the 3-Day Duty Log Book first to claim faults.",
                        );
                        scrollToLogBook();
                        return;
                      }
                      attendMut.mutate({ fault_id: inspectingFault.id, action: "attend" });
                    }}
                    className="text-xs font-bold bg-primary text-primary-foreground gap-1.5"
                  >
                    <UserCheck className="h-3.5 w-3.5" /> Attend to this Fault
                  </Button>
                )}

                {isAssignedToMe(inspectingFault) && inspectingFault.status === "assigned" && (
                  <Button
                    size="sm"
                    disabled={attendMut.isPending}
                    onClick={() =>
                      attendMut.mutate({ fault_id: inspectingFault.id, action: "acknowledge" })
                    }
                    className="text-xs font-bold bg-blue-600 text-white"
                  >
                    Acknowledge Order
                  </Button>
                )}

                {isAssignedToMe(inspectingFault) && inspectingFault.status === "acknowledged" && (
                  <Button
                    size="sm"
                    disabled={attendMut.isPending}
                    onClick={() =>
                      attendMut.mutate({ fault_id: inspectingFault.id, action: "start_work" })
                    }
                    className="text-xs font-bold bg-purple-600 text-white"
                  >
                    Start Work / On-Site
                  </Button>
                )}

                {isAssignedToMe(inspectingFault) && inspectingFault.status === "in_progress" && (
                  <Button
                    size="sm"
                    onClick={() => setShowResolveModalForId(inspectingFault.id)}
                    className="text-xs font-bold bg-emerald-600 text-white"
                  >
                    Mark Resolved
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resolution Notes Modal */}
      {showResolveModalForId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Complete & Resolve Fault
              </h3>
              <button
                type="button"
                onClick={() => setShowResolveModalForId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">
                Technician Repair & Clearance Notes
              </label>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="e.g. Spliced 24-core fiber trunk at DP-04 pillar, verified OTDR attenuation < 0.2dB. Power and dial tone restored."
                rows={4}
                className="w-full rounded-lg border border-input bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResolveModalForId(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={attendMut.isPending}
                onClick={() =>
                  attendMut.mutate({
                    fault_id: showResolveModalForId,
                    action: "resolve",
                    notes: resolveNotes,
                  })
                }
                className="text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" /> Confirm Resolution
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-xl border p-3.5 shadow-xs ${tone}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function Legend() {
  const items: Array<[string, string]> = [
    ["Assigned", "bg-amber-500"],
    ["Acknowledged", "bg-blue-500"],
    ["In Progress", "bg-purple-500"],
    ["Resolved", "bg-emerald-500"],
    ["Technician GPS", "bg-red-600 ring-2 ring-white"],
  ];
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
      {items.map(([label, dot]) => (
        <span key={label} className="inline-flex items-center gap-1.5 font-medium">
          <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="flex h-[420px] w-full items-center justify-center rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground font-mono">
      Loading interactive field dispatch map…
    </div>
  );
}
