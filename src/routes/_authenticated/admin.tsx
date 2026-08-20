import { createFileRoute, Link, ClientOnly, redirect } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useState, useMemo, useEffect } from "react";
import {
  listFaults,
  listTechnicians,
  triageFault,
  assignFault,
  updateStatus,
  getMyRoles,
  grantSelfRole,
} from "@/lib/voxtel.functions";
import { getTelOneCustomerSession, TelOneCustomerSession } from "@/lib/teloneCustomerAuth";
import useTechnicianRealtime from "@/hooks/useTechnicianRealtime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Shield,
  Wrench,
  Users,
  CheckCircle,
  AlertTriangle,
  Activity,
  RefreshCw,
  CalendarDays,
  ShieldAlert,
  ArrowLeft,
  Clock,
} from "lucide-react";
import AdminTechnicianRoster from "@/components/AdminTechnicianRoster";

const FaultsMap = lazy(() => import("@/components/FaultsMap"));

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const customerSession = localStorage.getItem("voxtel_telone_customer_session");
      const adminVerified = localStorage.getItem("voxtel_admin_verified");
      if (customerSession && !adminVerified) {
        throw redirect({ to: "/" });
      }
    }
  },
  head: () => ({ meta: [{ title: "Admin Operations Command Center — VoXtEl" }] }),
  component: Admin,
});

const STATUSES = ["new", "triaged", "assigned", "acknowledged", "in_progress", "resolved"] as const;
const SEVERITIES = ["low", "medium", "high", "critical"] as const;

function Admin() {
  const listFn = useServerFn(listFaults);
  const techFn = useServerFn(listTechnicians);
  const triageFn = useServerFn(triageFault);
  const assignFn = useServerFn(assignFault);
  const statusFn = useServerFn(updateStatus);
  // Real-time locations are handled client-side via Supabase Realtime
  const fetchRolesFn = useServerFn(getMyRoles);
  const grantRoleFn = useServerFn(grantSelfRole);

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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const faultsQ = useQuery({
    queryKey: ["faults", "admin"],
    queryFn: () => listFn({ data: { scope: "admin" } }),
  });

  const techsQ = useQuery({
    queryKey: ["technicians"],
    queryFn: () => techFn({ data: undefined }),
  });

  // replaced polling query with realtime hook below

  const rolesQ = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => fetchRolesFn({ data: undefined }),
  });

  const triageMut = useMutation({
    mutationFn: (v: { id: string; severity?: "low" | "medium" | "high" | "critical" }) =>
      triageFn({ data: v }),
    onSuccess: () => {
      toast.success("Fault triaged");
      faultsQ.refetch();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const assignMut = useMutation({
    mutationFn: (v: { id: string; technician_id: string }) => assignFn({ data: v }),
    onSuccess: () => {
      toast.success("Technician assigned");
      faultsQ.refetch();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: (typeof STATUSES)[number] }) => statusFn({ data: v }),
    onSuccess: () => {
      toast.success("Status updated");
      faultsQ.refetch();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const grantMut = useMutation({
    mutationFn: (role: "reporter" | "admin" | "technician") => grantRoleFn({ data: { role } }),
    onSuccess: () => {
      toast.success("Role permissions updated");
      rolesQ.refetch();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const allFaults = useMemo(() => faultsQ.data?.faults ?? [], [faultsQ.data?.faults]);
  const techs = techsQ.data?.technicians ?? [];
  const locations = useTechnicianRealtime();
  const myRoles = rolesQ.data?.roles ?? [];

  // Filtered faults list
  const filteredFaults = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allFaults.filter((f) => {
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      if (severityFilter !== "all" && f.severity !== severityFilter) return false;
      if (q) {
        const summary = typeof f.technical_summary === "string" ? f.technical_summary : "";
        const transcript = typeof f.raw_transcript === "string" ? f.raw_transcript : "";
        const cat = typeof f.category === "string" ? f.category : "";
        const text = `${summary} ${transcript} ${cat}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [allFaults, search, statusFilter, severityFilter]);

  // System KPI calculations
  const stats = useMemo(() => {
    let unassigned = 0;
    let critical = 0;
    let inProgress = 0;
    let resolved = 0;

    for (const f of allFaults) {
      if (!f.assigned_technician_id && f.status !== "resolved") unassigned++;
      if (f.severity === "critical" && f.status !== "resolved") critical++;
      if (f.status === "in_progress") inProgress++;
      if (f.status === "resolved") resolved++;
    }

    return {
      total: allFaults.length,
      unassigned,
      critical,
      inProgress,
      resolved,
      activeTechs: locations.length,
    };
  }, [allFaults, locations]);

  // If connected as customer subscriber and not admin verified, block access
  if (customerSession) {
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
            Administrative Console Restricted
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            This command center is restricted exclusively to authorized TelOne Network Operations
            Managers and Administrators. Customers and subscribers cannot access admin controls or
            fault triage.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 text-xs space-y-1.5 text-left">
          <div className="font-bold text-foreground flex items-center justify-between">
            <span>Subscriber Account: {customerSession.fullName}</span>
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
    <div className="space-y-8">
      {/* Admin Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Operations Command Center
            </h1>
            <Badge className="bg-primary text-primary-foreground font-mono text-[10px]">
              ADMIN URL
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Full system override & field dispatch console for TelOne network infrastructure across
            Zimbabwe.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              faultsQ.refetch();
              toast.info("Refreshed operational data");
            }}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Systems
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">
            Total Tickets
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">{stats.total}</div>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-xs">
          <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400 uppercase flex items-center justify-between">
            Unassigned
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">
            {stats.unassigned}
          </div>
        </div>

        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 shadow-xs">
          <div className="text-[11px] font-medium text-red-700 dark:text-red-400 uppercase">
            Critical Severity
          </div>
          <div className="mt-1 text-2xl font-bold text-red-700 dark:text-red-400">
            {stats.critical}
          </div>
        </div>

        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 shadow-xs">
          <div className="text-[11px] font-medium text-purple-700 dark:text-purple-400 uppercase">
            In Progress
          </div>
          <div className="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-400">
            {stats.inProgress}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-xs">
          <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase">
            Resolved
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {stats.resolved}
          </div>
        </div>

        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 shadow-xs">
          <div className="text-[11px] font-medium text-blue-700 dark:text-blue-400 uppercase flex items-center justify-between">
            Active Techs
            <Wrench className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-400">
            {stats.activeTechs}
          </div>
        </div>
      </div>

      {/* Weekly Technician Duty Log Book & 3-Day Shift Roster (Admin Only) */}
      <AdminTechnicianRoster />

      {/* Field Dispatch Radar Map */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Live Dispatch Radar Map
            </h2>
            <p className="text-xs text-muted-foreground">
              Real-time map showing reported fault locations and on-duty TelOne field engineers.
            </p>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {filteredFaults.length} tickets on map · {locations.length} technicians tracked
          </div>
        </div>

        <ClientOnly fallback={<MapSkeleton />}>
          <Suspense fallback={<MapSkeleton />}>
            <FaultsMap faults={filteredFaults} technicians={locations} />
          </Suspense>
        </ClientOnly>
      </section>

      {/* Master Fault Triage & Override Table */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Master System Queue & Dispatch</h2>
            <p className="text-xs text-muted-foreground">
              Review transcripts, triage severity, assign technicians, or override ticket status.
            </p>
          </div>

          <div className="text-xs text-muted-foreground">
            Showing {filteredFaults.length} of {allFaults.length} total system faults
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
          <Input
            placeholder="Filter by summary, transcript, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:col-span-2"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-xs font-medium"
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-xs font-medium"
          >
            <option value="all">All Severities</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Faults Table / List */}
        {faultsQ.isLoading && (
          <p className="text-xs text-muted-foreground py-4">Loading queue...</p>
        )}

        <ul className="space-y-3">
          {filteredFaults.map((f) => {
            const assignedTech = techs.find((t) => t.id === f.assigned_technician_id);
            return (
              <li
                key={f.id}
                className="rounded-lg border border-border bg-background p-4 space-y-3 hover:border-primary/50 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1 max-w-2xl">
                    <Link
                      to="/faults/$id"
                      params={{ id: f.id }}
                      className="font-bold text-sm text-foreground hover:text-primary transition-colors hover:underline block"
                    >
                      {f.technical_summary || f.raw_transcript}
                    </Link>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                      <span>ID: {f.id.slice(0, 8)}</span>
                      <span>·</span>
                      <span>{new Date(f.created_at).toLocaleString()}</span>
                      <span>·</span>
                      <span className="uppercase font-semibold text-[10px] bg-secondary px-1.5 py-0.5 rounded">
                        Lang: {f.detected_language}
                      </span>
                      {f.category && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-foreground">{f.category}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        f.severity === "critical"
                          ? "destructive"
                          : f.severity === "high"
                            ? "default"
                            : "outline"
                      }
                    >
                      {f.severity}
                    </Badge>

                    <Badge
                      className={
                        f.status === "resolved"
                          ? "bg-emerald-500 text-white"
                          : f.status === "in_progress"
                            ? "bg-purple-500 text-white"
                            : f.status === "assigned"
                              ? "bg-amber-500 text-white"
                              : "bg-secondary text-secondary-foreground"
                      }
                    >
                      {f.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                {/* Raw Transcript Snippet */}
                {f.raw_transcript && (
                  <div className="text-xs bg-muted/40 p-2.5 rounded border border-border/50 text-muted-foreground font-mono">
                    <span className="font-semibold text-foreground">Transcript:</span> "
                    {f.raw_transcript}"
                  </div>
                )}

                {/* Actions Bar */}
                <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Severity Selector */}
                    <Select
                      value={f.severity}
                      onValueChange={(sev) =>
                        triageMut.mutate({ id: f.id, severity: sev as (typeof SEVERITIES)[number] })
                      }
                    >
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue placeholder="Severity..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITIES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            Sev: {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Assign Technician */}
                    <Select
                      value={f.assigned_technician_id || "__none"}
                      onValueChange={(techId) => {
                        if (techId !== "__none") {
                          assignMut.mutate({ id: f.id, technician_id: techId });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-56 text-xs">
                        <SelectValue placeholder="Assign Technician..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none" disabled>
                          Unassigned
                        </SelectItem>
                        {techs.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">
                            👷 {t.display_name || t.id.slice(0, 8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Status Override */}
                    <Select
                      value={f.status}
                      onValueChange={(st) =>
                        statusMut.mutate({ id: f.id, status: st as (typeof STATUSES)[number] })
                      }
                    >
                      <SelectTrigger className="h-8 w-36 text-xs">
                        <SelectValue placeholder="Status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((st) => (
                          <SelectItem key={st} value={st} className="text-xs">
                            Status: {st.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-muted-foreground text-[11px]">
                    Assigned To:{" "}
                    <span className="font-semibold text-foreground">
                      {assignedTech ? assignedTech.display_name : "None"}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}

          {filteredFaults.length === 0 && !faultsQ.isLoading && (
            <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
              No system faults match your filters.
            </div>
          )}
        </ul>
      </section>

      {/* Role & Access Management */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">System Roles & Permissions</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Grant active permissions across the system. Active roles for current account:{" "}
          <span className="font-bold text-foreground">{myRoles.join(", ")}</span>.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {(["reporter", "technician", "admin"] as const).map((r) => (
            <Button
              key={r}
              variant={myRoles.includes(r) ? "secondary" : "outline"}
              size="sm"
              className="text-xs"
              disabled={grantMut.isPending || myRoles.includes(r)}
              onClick={() => grantMut.mutate(r)}
            >
              {myRoles.includes(r) ? `✓ Active Role: ${r}` : `Grant ${r} Access`}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="flex h-[420px] w-full items-center justify-center rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground">
      Loading dispatch map…
    </div>
  );
}
