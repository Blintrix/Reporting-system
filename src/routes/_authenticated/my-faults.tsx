import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo, useEffect } from "react";
import { listFaults, FaultRecord } from "@/lib/voxtel.functions";
import { ZIMBABWE_AREAS, ZimbabweArea } from "@/lib/zimbabweAreas";
import { getTelOneCustomerSession, TelOneCustomerSession } from "@/lib/teloneCustomerAuth";
import { getFaultTypeFromRecord } from "@/lib/faultTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Mic,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Filter,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-faults")({
  head: () => ({ meta: [{ title: "My Fault Tracker & Local Area Status — VoXtEl" }] }),
  component: MyFaults,
});

const STATUS_STEPS = [
  { key: "new", label: "Reported", color: "bg-amber-500" },
  { key: "triaged", label: "AI Triaged", color: "bg-blue-500" },
  { key: "assigned", label: "Tech Assigned", color: "bg-indigo-500" },
  { key: "in_progress", label: "Attending / In Progress", color: "bg-purple-500" },
  { key: "resolved", label: "Restored", color: "bg-emerald-500" },
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

function MyFaults() {
  const listFn = useServerFn(listFaults);

  const [customerSession, setCustomerSession] = useState<TelOneCustomerSession | null>(() =>
    getTelOneCustomerSession(),
  );

  useEffect(() => {
    const handleSessionChange = (e: Event) => {
      const customEvent = e as CustomEvent<TelOneCustomerSession | null>;
      setCustomerSession(customEvent.detail);
    };
    window.addEventListener("voxtel_customer_session_change", handleSessionChange);
    return () => {
      window.removeEventListener("voxtel_customer_session_change", handleSessionChange);
    };
  }, []);

  const [activeTab, setActiveTab] = useState<"mine" | "area">("mine");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [selectedAreaId, setSelectedAreaId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("voxtel_customer_area_id") || "hre-central";
    }
    return "hre-central";
  });

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
        // ignore parse error
      }
    }
  }, []);

  const selectedArea = useMemo(
    () => ZIMBABWE_AREAS.find((a) => a.id === selectedAreaId) || ZIMBABWE_AREAS[0],
    [selectedAreaId],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["faults", "customer-tracker", selectedAreaId, clientReportedIds.length],
    queryFn: () =>
      listFn({
        data: {
          scope: "customer",
          areaId: selectedAreaId,
          clientReportedIds,
          radiusKm: selectedArea.radiusKm,
        },
      }),
    refetchInterval: 6000,
  });

  const myReportedFaults: FaultRecord[] = useMemo(
    () => (data?.myReportedFaults as FaultRecord[]) ?? [],
    [data?.myReportedFaults],
  );

  const areaAttendedFaults: FaultRecord[] = useMemo(
    () => (data?.areaAttendedFaults as FaultRecord[]) ?? [],
    [data?.areaAttendedFaults],
  );

  // Filter based on active tab & search query
  const targetList = activeTab === "mine" ? myReportedFaults : areaAttendedFaults;

  const filteredList = useMemo(() => {
    return targetList.filter((f) => {
      if (statusFilter !== "all") {
        if (statusFilter === "active" && f.status === "resolved") return false;
        if (statusFilter === "resolved" && f.status !== "resolved") return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text =
          `${f.technical_summary || ""} ${f.raw_transcript || ""} ${f.category || ""}`.toLowerCase();
        return text.includes(q);
      }
      return true;
    });
  }, [targetList, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-bold text-[10px]">
              Customer Service Tracker
            </Badge>
            <span className="text-xs text-muted-foreground">Area: {selectedArea.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
            Fault Tracking & Outage Radar
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time status updates for tickets you submitted and field repairs in your sector.
          </p>
        </div>

        <Link to="/report">
          <Button className="font-bold text-xs gap-1.5 shadow-md">
            <Mic className="h-4 w-4" /> Report New Fault
          </Button>
        </Link>
      </div>

      {/* Connected TelOne Subscriber Banner */}
      {customerSession && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0 font-extrabold text-xs shadow-xs">
              TOL
            </div>
            <div className="space-y-0.5 text-xs">
              <div className="font-bold text-foreground flex items-center gap-2">
                <span>{customerSession.fullName}</span>
                <Badge className="bg-emerald-600 text-[10px] text-white">
                  TelOne Subscriber Active
                </Badge>
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-2 text-[11px]">
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
                  Plan: <strong className="text-foreground">{customerSession.serviceType}</strong>
                </span>
                <span>•</span>
                <span>
                  Sector: <strong className="text-foreground">{customerSession.areaName}</strong>
                </span>
              </div>
            </div>
          </div>

          <a
            href="https://selfservice.telone.co.zw"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            TelOne Official Self Service <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tab switchers */}
        <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
          <button
            onClick={() => setActiveTab("mine")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "mine"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            My Reported Faults ({myReportedFaults.length})
          </button>
          <button
            onClick={() => setActiveTab("area")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "area"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className="h-3.5 w-3.5 text-amber-500" />
            {selectedArea.city} Area Repairs ({areaAttendedFaults.length})
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tickets…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-card"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active & In Progress</option>
            <option value="resolved">Resolved / Restored</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-border p-8 text-center text-xs text-muted-foreground">
          Loading ticket status information…
        </div>
      )}

      {/* Ticket List */}
      <div className="space-y-3">
        {filteredList.map((f) => {
          const ft = getFaultTypeFromRecord(f);
          const stepIdx = getStatusStepIndex(f.status);
          const isMine = activeTab === "mine";

          return (
            <div
              key={f.id}
              className={`rounded-xl border p-4 sm:p-5 transition-all shadow-xs space-y-4 bg-card ${
                isMine
                  ? "border-primary/30 hover:border-primary"
                  : "border-border hover:border-border/80"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {isMine ? (
                      <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                        YOUR REPORT
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono border-amber-500/40 text-amber-600 dark:text-amber-400"
                      >
                        NEIGHBORHOOD REPAIR
                      </Badge>
                    )}

                    {ft && (
                      <Badge variant="outline" className={`text-[10px] font-semibold ${ft.color}`}>
                        {ft.label}
                      </Badge>
                    )}

                    <Badge
                      variant={f.status === "resolved" ? "default" : "secondary"}
                      className="text-[10px] font-mono uppercase"
                    >
                      {f.status.replace("_", " ")}
                    </Badge>

                    <span className="text-[11px] text-muted-foreground font-mono">
                      Ticket #{f.id.slice(0, 8)}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm sm:text-base text-foreground">
                    {f.technical_summary || f.raw_transcript}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Reported: {new Date(f.created_at).toLocaleDateString()} at{" "}
                      {new Date(f.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>•</span>
                    <span className="uppercase font-mono font-semibold">
                      Lang: {f.detected_language}
                    </span>
                    <span>•</span>
                    <span className="capitalize">Severity: {f.severity}</span>
                  </div>
                </div>

                <Link to="/faults/$id" params={{ id: f.id }} className="shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold gap-1.5 w-full sm:w-auto"
                  >
                    View Tracker <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>

              {/* Progress Step Bar */}
              <div className="pt-3 border-t border-border/60">
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

        {filteredList.length === 0 && !isLoading && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-foreground">
              {activeTab === "mine"
                ? "No tickets found"
                : `No active repairs in ${selectedArea.name}`}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {activeTab === "mine"
                ? "You haven't reported any network faults or no tickets matched your search filter."
                : `There are currently no active field repairs reported in ${selectedArea.name}.`}
            </p>
            {activeTab === "mine" && (
              <Link to="/report">
                <Button size="sm" className="text-xs font-bold mt-2">
                  <Mic className="h-3.5 w-3.5 mr-1" /> Report a Fault Now
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
