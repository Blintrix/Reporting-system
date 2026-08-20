import { createFileRoute, useRouter, ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, lazy, Suspense } from "react";
import { getFault } from "@/lib/voxtel.functions";
import { getFaultTypeFromRecord, TELONE_SERVICES, TelOneServiceKey } from "@/lib/faultTypes";
import useTechnicianRealtime from "@/hooks/useTechnicianRealtime";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  MapPin,
  Navigation,
  ArrowLeft,
  Wrench,
  Sparkles,
  Volume2,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import FaultTroubleshootingGuide from "@/components/FaultTroubleshootingGuide";

const FaultsMap = lazy(() => import("@/components/FaultsMap"));

export const Route = createFileRoute("/_authenticated/faults/$id")({
  head: () => ({ meta: [{ title: "Fault Detail & Triage — VoXtEl" }] }),
  component: FaultDetail,
  errorComponent: ({ error, reset }) => (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Could not load fault</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Retry</Button>
    </div>
  ),
  notFoundComponent: () => <div>Fault not found</div>,
});

const EVENT_META: Record<string, { icon: string; label: string; tone: string }> = {
  created: { icon: "📝", label: "Reported", tone: "bg-gray-500" },
  triaged: { icon: "🧭", label: "Triaged", tone: "bg-slate-500" },
  assigned: { icon: "👷", label: "Assigned to technician", tone: "bg-amber-500" },
  status_changed: { icon: "🔄", label: "Status changed", tone: "bg-blue-500" },
};

function FaultDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const fn = useServerFn(getFault);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["fault", id],
    queryFn: () => fn({ data: { id } }),
  });

  const techLocs = useTechnicianRealtime();

  // Realtime: refetch on fault / fault_events changes for this ticket
  useEffect(() => {
    const ch = supabase
      .channel(`fault-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "faults", filter: `id=eq.${id}` },
        (payload) => {
          const oldRow = payload.old as { status?: string } | null;
          const newRow = payload.new as { status?: string } | null;
          if (oldRow?.status && newRow?.status && oldRow.status !== newRow.status) {
            toast.info(`Status changed → ${newRow.status}`);
          }
          refetch();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "fault_events", filter: `fault_id=eq.${id}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, refetch]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading ticket details…</p>;
  if (!data) return null;
  const { fault, events, audioSignedUrl, photoSignedUrl } = data;
  const ft = getFaultTypeFromRecord(fault);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <button
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => router.history.back()}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {ft && (
            <Badge variant="outline" className={`font-semibold ${ft.color}`}>
              {ft.label}
            </Badge>
          )}
          <Badge variant="outline" className="capitalize">
            Severity: {fault.severity}
          </Badge>
          <Badge className="capitalize">{fault.status.replace("_", " ")}</Badge>
          <Badge variant="secondary" className="uppercase font-mono text-[10px]">
            Lang: {fault.detected_language}
          </Badge>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
          {fault.technical_summary || "Untitled fault report"}
        </h1>
        <p className="text-xs text-muted-foreground font-mono">Ticket UUID: {fault.id}</p>
      </div>

      {/* Master Fault Troubleshooting & Voice Guide */}
      <FaultTroubleshootingGuide
        fault={fault}
        audioSignedUrl={audioSignedUrl}
        showChecklistPersistence={true}
      />

      {/* GPS Location & Live Technician Tracking Map on Ticket */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary" /> Live Fault & Technician Tracking Map
            </h2>
            <p className="text-xs text-muted-foreground">
              Track the fault location and real-time movement of assigned TelOne field engineers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {fault.lat != null && fault.lng != null && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${fault.lat},${fault.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground flex items-center gap-1"
              >
                <MapPin className="h-3.5 w-3.5 text-rose-500" /> Open Maps GPS
              </a>
            )}
            <Badge variant="outline" className="text-[11px] font-normal">
              Status: {fault.status.replace("_", " ")}
            </Badge>
          </div>
        </div>

        {fault.lat != null && fault.lng != null && (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>
              GPS Coordinates: {fault.lat.toFixed(5)}, {fault.lng.toFixed(5)}
              {fault.location_accuracy
                ? ` (Accuracy: ±${Math.round(fault.location_accuracy)}m)`
                : ""}
            </span>
          </div>
        )}

        <ClientOnly fallback={<MapSkeleton />}>
          <Suspense fallback={<MapSkeleton />}>
            <FaultsMap faults={[fault]} technicians={techLocs} />
          </Suspense>
        </ClientOnly>
      </section>

      {audioSignedUrl && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-2">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="h-3.5 w-3.5 text-primary" /> Customer Voice Note Recording
          </div>
          <audio src={audioSignedUrl} controls className="w-full" />
        </section>
      )}

      {photoSignedUrl && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Site Photo Attachment
          </div>
          <img src={photoSignedUrl} alt="fault site" className="max-h-96 rounded-lg object-cover" />
        </section>
      )}

      {/* Timeline */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="text-sm font-bold text-foreground">Audit Trail & Status History</div>
          <span className="text-xs text-muted-foreground font-mono">
            {events.length} event records
          </span>
        </div>

        <ol className="relative space-y-4 border-l-2 border-border pl-6">
          {events.map((e) => {
            const meta = EVENT_META[e.event_type] ?? {
              icon: "•",
              label: e.event_type,
              tone: "bg-gray-400",
            };
            const p = (e.payload ?? {}) as Record<string, unknown>;
            return (
              <li key={e.id} className="relative">
                <span
                  className={`absolute -left-[34px] flex h-6 w-6 items-center justify-center rounded-full text-xs text-white ${meta.tone}`}
                  aria-hidden
                >
                  {meta.icon}
                </span>
                <div className="text-sm font-medium text-foreground">
                  {meta.label}
                  {typeof p.status === "string" && (
                    <span className="ml-2 font-semibold text-primary">
                      → {p.status.replace("_", " ")}
                    </span>
                  )}
                  {typeof p.severity === "string" && (
                    <span className="ml-2 text-muted-foreground">severity: {p.severity}</span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(e.created_at).toLocaleString()}
                </div>
              </li>
            );
          })}
          {events.length === 0 && (
            <li className="text-xs text-muted-foreground py-2">No event records logged yet.</li>
          )}
        </ol>
      </section>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="flex h-[360px] w-full items-center justify-center rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground font-mono">
      Loading live ticket map…
    </div>
  );
}
