import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getTechnicianDutyRoster,
  adminAddDesignatedTechnician,
  adminToggleTechnicianDesignation,
  adminRemoveDesignatedTechnician,
  technicianLogBookSignOut,
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
  CalendarDays,
  Clock,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Phone,
  Wrench,
  Activity,
  LogOut,
  Sparkles,
} from "lucide-react";

export default function AdminTechnicianRoster() {
  const queryClient = useQueryClient();
  const getRosterFn = useServerFn(getTechnicianDutyRoster);
  const addTechFn = useServerFn(adminAddDesignatedTechnician);
  const toggleTechFn = useServerFn(adminToggleTechnicianDesignation);
  const removeTechFn = useServerFn(adminRemoveDesignatedTechnician);
  const signOutFn = useServerFn(technicianLogBookSignOut);

  const [showAddForm, setShowAddForm] = useState(false);
  const [filterBlock, setFilterBlock] = useState<string>("all");

  // Form State
  const [name, setName] = useState("");
  const [techCode, setTechCode] = useState("");
  const [phone, setPhone] = useState("");
  const [sector, setSector] = useState("Harare Central & Msasa");
  const [shiftBlock, setShiftBlock] = useState<"block_a" | "block_b" | "standby" | "custom_3day">(
    "block_a",
  );
  const [specialty, setSpecialty] = useState("Fiber Splicing & OTDR");

  const rosterQ = useQuery({
    queryKey: ["technician-duty-roster"],
    queryFn: () => getRosterFn({ data: undefined }),
    refetchInterval: 10000,
  });

  const addMut = useMutation({
    mutationFn: (data: {
      name: string;
      technician_code: string;
      phone: string;
      sector: string;
      shift_rotation: "block_a" | "block_b" | "standby" | "custom_3day";
      skills: string[];
    }) => addTechFn({ data }),
    onSuccess: () => {
      toast.success("Technician added to weekly 3-day roster!");
      setShowAddForm(false);
      setName("");
      setTechCode("");
      setPhone("");
      queryClient.invalidateQueries({ queryKey: ["technician-duty-roster"] });
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleMut = useMutation({
    mutationFn: (data: {
      id: string;
      is_designated: boolean;
      shift_rotation?: "block_a" | "block_b" | "standby" | "custom_3day";
    }) => toggleTechFn({ data }),
    onSuccess: () => {
      toast.success("Technician roster status updated");
      queryClient.invalidateQueries({ queryKey: ["technician-duty-roster"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeTechFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Technician removed from weekly schedule");
      queryClient.invalidateQueries({ queryKey: ["technician-duty-roster"] });
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const clockOutMut = useMutation({
    mutationFn: (technician_id: string) =>
      signOutFn({
        data: {
          technician_id,
          signout_notes: "Admin manual shift sign-out",
        },
      }),
    onSuccess: () => {
      toast.success("Technician signed out from Log Book");
      queryClient.invalidateQueries({ queryKey: ["technician-duty-roster"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const schedule = rosterQ.data?.schedule;
  const technicians = rosterQ.data?.technicians ?? [];
  const activeLogBook = rosterQ.data?.activeLogBook ?? [];
  const allEntries = rosterQ.data?.allLogBookEntries ?? [];

  const filteredTechs = technicians.filter((t) => {
    if (filterBlock === "all") return true;
    return t.shift_rotation === filterBlock;
  });

  function handleCreateTechnician(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !techCode.trim() || !phone.trim()) {
      toast.error("Please fill in Name, Technician ID, and Phone Number.");
      return;
    }
    addMut.mutate({
      name: name.trim(),
      technician_code: techCode.trim(),
      phone: phone.trim(),
      sector,
      shift_rotation: shiftBlock,
      skills: [specialty],
    });
  }

  return (
    <section className="space-y-6 rounded-2xl border border-primary/20 bg-card p-6 shadow-sm">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarDays className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              Weekly Technician Duty Log Book & 3-Day Shift Roster
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-primary">Admin Control:</span> Technicians work in
            designated 3-day shift rotations. Only the Admin can add, designate, or schedule field
            technicians for the active week.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-primary/40 bg-primary/5 text-primary text-xs font-mono py-1 px-3"
          >
            {schedule?.weekLabel || "Current Week"}
          </Badge>
          <Button
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground shadow-xs"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {showAddForm ? "Close Form" : "Add Designated Technician"}
          </Button>
        </div>
      </div>

      {/* 3-Day Rotation Schedule Metrics */}
      {schedule && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div
            className={`rounded-xl border p-3.5 space-y-1.5 transition-all ${
              schedule.blockA.isActiveNow
                ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                : "border-border bg-secondary/30 opacity-80"
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" /> Block A (Mon – Wed)
              </span>
              {schedule.blockA.isActiveNow ? (
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                  ACTIVE NOW (Day {schedule.dayInRotation} of 3)
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  3 Days
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Designated for Monday to Wednesday 3-day work rotation.
            </div>
            <div className="text-[11px] font-mono text-primary font-medium">
              {technicians.filter((t) => t.shift_rotation === "block_a").length} Technicians
              Rostered
            </div>
          </div>

          <div
            className={`rounded-xl border p-3.5 space-y-1.5 transition-all ${
              schedule.blockB.isActiveNow
                ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                : "border-border bg-secondary/30 opacity-80"
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" /> Block B (Thu – Sat)
              </span>
              {schedule.blockB.isActiveNow ? (
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                  ACTIVE NOW (Day {schedule.dayInRotation} of 3)
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  3 Days
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Designated for Thursday to Saturday 3-day work rotation.
            </div>
            <div className="text-[11px] font-mono text-primary font-medium">
              {technicians.filter((t) => t.shift_rotation === "block_b").length} Technicians
              Rostered
            </div>
          </div>

          <div
            className={`rounded-xl border p-3.5 space-y-1.5 transition-all ${
              schedule.standby.isActiveNow
                ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                : "border-border bg-secondary/30 opacity-80"
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" /> Standby (Sun)
              </span>
              {schedule.standby.isActiveNow ? (
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                  ACTIVE NOW
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  1 Day
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Emergency standby & critical outage coverage.
            </div>
            <div className="text-[11px] font-mono text-primary font-medium">
              {technicians.filter((t) => t.shift_rotation === "standby").length} Standby Techs
            </div>
          </div>
        </div>
      )}

      {/* Admin Add Designated Technician Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateTechnician}
          className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between border-b border-primary/20 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">
                Admin Authorization: Add Designated Technician for Week
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30">
              Weekly Roster Config
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="tech-name" className="text-xs font-semibold">
                Technician Full Name *
              </Label>
              <Input
                id="tech-name"
                placeholder="e.g. Tendai Moyo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tech-code" className="text-xs font-semibold">
                Technician ID / Code *
              </Label>
              <Input
                id="tech-code"
                placeholder="e.g. TECH-HRE-01"
                value={techCode}
                onChange={(e) => setTechCode(e.target.value)}
                required
                className="text-xs uppercase font-mono bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tech-phone" className="text-xs font-semibold">
                Contact Phone *
              </Label>
              <Input
                id="tech-phone"
                placeholder="e.g. +263 77 212 3456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tech-sector" className="text-xs font-semibold">
                Operational Exchange Sector *
              </Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger id="tech-sector" className="text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Harare Central & Msasa">Harare Central & Msasa</SelectItem>
                  <SelectItem value="Bulawayo Substation & Belmont">
                    Bulawayo Substation & Belmont
                  </SelectItem>
                  <SelectItem value="Mutare Industrial & Main">Mutare Industrial & Main</SelectItem>
                  <SelectItem value="Gweru Midlands Exchange">Gweru Midlands Exchange</SelectItem>
                  <SelectItem value="Chitungwiza Unit L & Makoni">
                    Chitungwiza Unit L & Makoni
                  </SelectItem>
                  <SelectItem value="Masvingo Core Exchange">Masvingo Core Exchange</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shift-rotation" className="text-xs font-semibold">
                3-Day Shift Rotation Block *
              </Label>
              <Select
                value={shiftBlock}
                onValueChange={(v) =>
                  setShiftBlock(v as "block_a" | "block_b" | "standby" | "custom_3day")
                }
              >
                <SelectTrigger id="shift-rotation" className="text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="block_a">Block A (Mon – Wed · 3 Days)</SelectItem>
                  <SelectItem value="block_b">Block B (Thu – Sat · 3 Days)</SelectItem>
                  <SelectItem value="standby">Emergency Standby (Sun · 1 Day)</SelectItem>
                  <SelectItem value="custom_3day">Custom 3-Day Cycle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tech-specialty" className="text-xs font-semibold">
                Primary Specialty
              </Label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger id="tech-specialty" className="text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fiber Splicing & OTDR">Fiber Splicing & OTDR</SelectItem>
                  <SelectItem value="MSAN Cabinet & Physical Plant">
                    MSAN Cabinet & Physical Plant
                  </SelectItem>
                  <SelectItem value="Copper PSTN & Voice Loop">Copper PSTN & Voice Loop</SelectItem>
                  <SelectItem value="Auxiliary Power & Solar Banks">
                    Auxiliary Power & Solar Banks
                  </SelectItem>
                  <SelectItem value="Broadband DSLAM & SNR Testing">
                    Broadband DSLAM & SNR Testing
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={addMut.isPending}
              className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {addMut.isPending ? "Designating..." : "Authorize & Add to Week's Roster"}
            </Button>
          </div>
        </form>
      )}

      {/* Currently Logged In Technicians (Active Log Book) */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span>Currently Signed In to 3-Day Duty Log Book ({activeLogBook.length})</span>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">Live Field Clock-Ins</span>
        </div>

        {activeLogBook.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 italic">
            No technicians currently clocked in to the duty log book.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {activeLogBook.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      {entry.technician_name}
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground">
                      {entry.technician_code} · {entry.sector}
                    </div>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                    Day {entry.day_in_rotation} of {entry.total_rotation_days}
                  </Badge>
                </div>

                <div className="text-[10px] text-muted-foreground space-y-0.5 border-t border-border/50 pt-1.5">
                  <div className="flex items-center justify-between">
                    <span>Shift: {entry.shift_block}</span>
                    <span>
                      In:{" "}
                      {new Date(entry.clock_in_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {entry.notes && (
                    <div className="truncate text-foreground/80 italic font-mono text-[10px]">
                      "{entry.notes}"
                    </div>
                  )}
                </div>

                <div className="pt-1 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => clockOutMut.mutate(entry.technician_id)}
                    disabled={clockOutMut.isPending}
                    className="h-6 text-[10px] gap-1 text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-3 w-3" /> Clock Out
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Designated Technicians for Active Week Table */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-primary" /> Admin-Designated Technicians for Week (
            {technicians.length})
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filter Shift:</span>
            <Select value={filterBlock} onValueChange={setFilterBlock}>
              <SelectTrigger className="h-7 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shift Blocks</SelectItem>
                <SelectItem value="block_a">Block A (Mon-Wed)</SelectItem>
                <SelectItem value="block_b">Block B (Thu-Sat)</SelectItem>
                <SelectItem value="standby">Standby (Sun)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
              <tr>
                <th className="px-3.5 py-2.5">Technician</th>
                <th className="px-3.5 py-2.5">Assigned Sector</th>
                <th className="px-3.5 py-2.5">3-Day Shift Block</th>
                <th className="px-3.5 py-2.5">Designated Status</th>
                <th className="px-3.5 py-2.5">Specialties</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTechs.map((tech) => {
                const isCurrentlyActive = activeLogBook.some(
                  (a) => a.technician_id === tech.id || a.technician_code === tech.technician_code,
                );

                return (
                  <tr key={tech.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3.5 py-3">
                      <div className="font-bold text-foreground">{tech.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        {tech.technician_code} · {tech.phone}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 font-medium text-foreground">{tech.sector}</td>
                    <td className="px-3.5 py-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${
                          tech.shift_rotation === "block_a"
                            ? "border-primary/40 bg-primary/5 text-primary"
                            : tech.shift_rotation === "block_b"
                              ? "border-blue-500/40 bg-blue-500/5 text-blue-600"
                              : "border-amber-500/40 bg-amber-500/5 text-amber-600"
                        }`}
                      >
                        {tech.shift_label}
                      </Badge>
                    </td>
                    <td className="px-3.5 py-3">
                      {isCurrentlyActive ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
                          Clocked In
                        </Badge>
                      ) : tech.is_designated_this_week ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Designated (Off Shift)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Not Designated
                        </Badge>
                      )}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tech.skills.map((s, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-secondary px-1.5 py-0.5 rounded border border-border text-muted-foreground"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toggleMut.mutate({
                              id: tech.id,
                              is_designated: !tech.is_designated_this_week,
                            })
                          }
                          className="h-7 text-xs px-2"
                        >
                          {tech.is_designated_this_week ? (
                            <span className="text-amber-600 flex items-center gap-1 font-medium">
                              <ToggleRight className="h-3.5 w-3.5" /> Deactivate
                            </span>
                          ) : (
                            <span className="text-emerald-600 flex items-center gap-1 font-medium">
                              <ToggleLeft className="h-3.5 w-3.5" /> Activate
                            </span>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMut.mutate(tech.id)}
                          className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
