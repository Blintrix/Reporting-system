import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getTechnicianDutyRoster,
  technicianLogBookSignIn,
  technicianLogBookSignOut,
  updateTechnicianLocation,
} from "@/lib/voxtel.functions";
import { DesignatedTechnician, LogBookEntry } from "@/lib/technicianLogbook";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  BookOpen,
  Clock,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  CheckCircle2,
  LogOut,
  LogIn,
  AlertTriangle,
  Users,
  Activity,
  Calendar,
  Sparkles,
} from "lucide-react";

interface TechnicianLogBookStationProps {
  onTechnicianSelected?: (techId: string) => void;
  activeTechId?: string;
}

export default function TechnicianLogBookStation({
  onTechnicianSelected,
  activeTechId,
}: TechnicianLogBookStationProps) {
  const queryClient = useQueryClient();
  const getRosterFn = useServerFn(getTechnicianDutyRoster);
  const signInFn = useServerFn(technicianLogBookSignIn);
  const signOutFn = useServerFn(technicianLogBookSignOut);
  const locFn = useServerFn(updateTechnicianLocation);

  const [selectedTechCode, setSelectedTechCode] = useState<string>("");
  const [customTechCode, setCustomTechCode] = useState<string>("");
  const [dutyNotes, setDutyNotes] = useState<string>("");
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);

  // Local storage cache for active technician session
  const [currentSessionTech, setCurrentSessionTech] = useState<DesignatedTechnician | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("voxtel_duty_technician");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const rosterQ = useQuery({
    queryKey: ["technician-duty-roster"],
    queryFn: () => getRosterFn({ data: undefined }),
    refetchInterval: 12000,
  });

  const schedule = rosterQ.data?.schedule;
  const technicians = rosterQ.data?.technicians ?? [];
  const activeLogBook = rosterQ.data?.activeLogBook ?? [];

  // Find if current session tech is logged in in the LogBook store
  const activeEntry = activeLogBook.find(
    (e) =>
      currentSessionTech &&
      (e.technician_id === currentSessionTech.id ||
        e.technician_code === currentSessionTech.technician_code),
  );

  const signInMut = useMutation({
    mutationFn: async (vars: { technician_code_or_id: string; notes?: string }) => {
      // Get current GPS coords if available
      let lat: number | null = null;
      let lng: number | null = null;
      if (typeof window !== "undefined" && "geolocation" in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // fallback
        }
      }

      return signInFn({
        data: {
          technician_code_or_id: vars.technician_code_or_id,
          gps_lat: lat,
          gps_lng: lng,
          notes: vars.notes,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(`Logged into 3-Day Duty Log Book: ${res.technician.name}`, {
        description: `Day ${res.dayInRotation} of 3-Day Rotation · ${res.technician.shift_label}`,
      });
      setCurrentSessionTech(res.technician);
      if (typeof window !== "undefined") {
        localStorage.setItem("voxtel_duty_technician", JSON.stringify(res.technician));
        window.dispatchEvent(new Event("voxtel_technician_session_change"));
      }
      if (onTechnicianSelected) {
        onTechnicianSelected(res.technician.id);
      }
      setIsClockingIn(false);
      queryClient.invalidateQueries({ queryKey: ["technician-duty-roster"] });
      queryClient.invalidateQueries({ queryKey: ["faults"] });
    },
    onError: (e) => {
      toast.error("Log Book Login Denied", {
        description: (e as Error).message,
        duration: 6000,
      });
    },
  });

  const signOutMut = useMutation({
    mutationFn: (notes?: string) =>
      signOutFn({
        data: {
          technician_id: currentSessionTech?.id,
          signout_notes: notes || "End of shift sign-out",
        },
      }),
    onSuccess: () => {
      toast.success("Clocked out of Duty Log Book");
      setCurrentSessionTech(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("voxtel_duty_technician");
        window.dispatchEvent(new Event("voxtel_technician_session_change"));
      }
      queryClient.invalidateQueries({ queryKey: ["technician-duty-roster"] });
      queryClient.invalidateQueries({ queryKey: ["faults"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function handleSignInSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = customTechCode.trim() || selectedTechCode;
    if (!code) {
      toast.error("Please enter or select your Technician ID / Code");
      return;
    }
    signInMut.mutate({
      technician_code_or_id: code,
      notes: dutyNotes.trim(),
    });
  }

  // Active rotation designated technicians list
  const activeRotationTechs = technicians.filter((t) => {
    if (!schedule) return true;
    if (schedule.currentBlock === "block_a") return t.shift_rotation === "block_a";
    if (schedule.currentBlock === "block_b") return t.shift_rotation === "block_b";
    return t.shift_rotation === "standby";
  });

  return (
    <div className="rounded-2xl border border-primary/25 bg-card p-5 shadow-xs space-y-4">
      {/* Top Shift Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">
                Technician 3-Day Duty Log Book Station
              </h2>
              <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                Admin Designated
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {schedule?.weekLabel || "Weekly Roster"} ·{" "}
              <span className="font-semibold text-foreground">
                {schedule?.currentBlock === "block_a"
                  ? "Block A Active (Mon – Wed)"
                  : schedule?.currentBlock === "block_b"
                    ? "Block B Active (Thu – Sat)"
                    : "Emergency Standby (Sun)"}
              </span>{" "}
              · Day {schedule?.dayInRotation ?? 1} of 3
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowRosterModal(!showRosterModal)}
            className="text-xs gap-1.5 h-8 font-medium"
          >
            <Users className="h-3.5 w-3.5 text-primary" />
            Active On-Duty Log ({activeLogBook.length})
          </Button>

          {currentSessionTech && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => signOutMut.mutate("Technician manual sign out")}
              disabled={signOutMut.isPending}
              className="text-xs gap-1.5 h-8 text-destructive border-destructive/30 hover:bg-destructive/10 font-medium"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          )}
        </div>
      </div>

      {/* On-Duty Active Status Banner or Login Gate */}
      {currentSessionTech ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 font-bold text-sm">
                  {currentSessionTech.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    {currentSessionTech.name}
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                    ON DUTY · DAY {schedule?.dayInRotation ?? 1} OF 3
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="font-mono">{currentSessionTech.technician_code}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-emerald-600" />
                    {currentSessionTech.sector}
                  </span>
                  <span>•</span>
                  <span>{currentSessionTech.shift_label}</span>
                </div>
              </div>
            </div>

            <div className="text-right text-xs">
              <div className="text-emerald-600 font-semibold flex items-center gap-1 justify-end">
                <CheckCircle2 className="h-3.5 w-3.5" /> Admin Authorized
              </div>
              <div className="text-muted-foreground text-[11px]">
                {activeEntry
                  ? `Clocked In: ${new Date(activeEntry.clock_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Active 3-Day Rotation Shift"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-500/20 pt-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Skills:</span>
              <div className="flex flex-wrap gap-1">
                {currentSessionTech.skills.map((s, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-background/80 px-2 py-0.5 rounded border border-emerald-500/20 text-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-[11px] font-mono text-foreground/80">
              Assigned by Admin: {currentSessionTech.designated_by}
            </div>
          </div>
        </div>
      ) : (
        /* Sign-in Gate with Strict 3-Day Shift Verification */
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Log Book Sign-In (3-Day Rotation Enforcement)
              </h3>
              <p className="text-xs text-muted-foreground">
                Technicians work in 3-day rotations.{" "}
                <span className="font-semibold text-primary">
                  Only Admin-designated technicians
                </span>{" "}
                for the current week and active 3-day block (Mon–Wed or Thu–Sat) are permitted to
                log in.
              </p>
            </div>
          </div>

          <form onSubmit={handleSignInSubmit} className="space-y-3.5 pt-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="roster-select" className="text-xs font-semibold">
                  Select Your Name from Week's Roster
                </Label>
                <Select
                  value={selectedTechCode}
                  onValueChange={(val) => {
                    setSelectedTechCode(val);
                    setCustomTechCode("");
                  }}
                >
                  <SelectTrigger id="roster-select" className="text-xs bg-background">
                    <SelectValue placeholder="-- Choose Rostered Technician --" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((t) => {
                      const isCurrentRotation =
                        (t.shift_rotation === "block_a" && schedule?.blockA.isActiveNow) ||
                        (t.shift_rotation === "block_b" && schedule?.blockB.isActiveNow) ||
                        t.shift_rotation === "standby";

                      return (
                        <SelectItem key={t.id} value={t.technician_code} className="text-xs">
                          {t.name} ({t.technician_code}) — {t.shift_label}{" "}
                          {isCurrentRotation ? "✓ Active Now" : "(Off Shift)"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custom-code" className="text-xs font-semibold">
                  Or Enter Technician ID / Code
                </Label>
                <Input
                  id="custom-code"
                  placeholder="e.g. TECH-HRE-01"
                  value={customTechCode}
                  onChange={(e) => {
                    setCustomTechCode(e.target.value);
                    setSelectedTechCode("");
                  }}
                  className="text-xs uppercase font-mono bg-background"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="duty-notes" className="text-xs font-semibold">
                Daily Log Book Entry / Starting Notes (Optional)
              </Label>
              <Input
                id="duty-notes"
                placeholder="e.g. Commencing field shift, inspecting Harare Central MSANs..."
                value={dutyNotes}
                onChange={(e) => setDutyNotes(e.target.value)}
                className="text-xs bg-background"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>
                  Active Cycle:{" "}
                  <strong>
                    {schedule?.currentBlock === "block_a"
                      ? "Block A (Mon - Wed)"
                      : "Block B (Thu - Sat)"}
                  </strong>{" "}
                  · Day {schedule?.dayInRotation ?? 1} of 3
                </span>
              </div>

              <Button
                type="submit"
                disabled={signInMut.isPending || (!selectedTechCode && !customTechCode)}
                className="gap-2 text-xs font-bold bg-primary text-primary-foreground shadow-xs h-9 px-4"
              >
                <LogIn className="h-4 w-4" />
                {signInMut.isPending ? "Validating Roster..." : "Clock In to 3-Day Duty Log"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Active On-Duty Technicians Drawer / List */}
      {showRosterModal && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-primary/20 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
              <span>All Technicians Signed In to Log Book ({activeLogBook.length})</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRosterModal(false)}
              className="h-6 text-[11px] px-2 text-muted-foreground"
            >
              Close
            </Button>
          </div>

          {activeLogBook.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 italic">
              No technicians currently clocked in for duty.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {activeLogBook.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-border bg-background p-3 space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {entry.technician_name}
                    </span>
                    <Badge className="bg-emerald-600 text-white text-[10px]">
                      Day {entry.day_in_rotation} of 3
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {entry.technician_code} · {entry.sector}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-between border-t border-border/50 pt-1">
                    <span>Shift: {entry.shift_block}</span>
                    <span>
                      In:{" "}
                      {new Date(entry.clock_in_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
