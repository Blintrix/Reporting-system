export type ShiftRotationBlock = "block_a" | "block_b" | "standby" | "custom_3day";

export interface DesignatedTechnician {
  id: string;
  technician_code: string;
  name: string;
  phone: string;
  email?: string;
  sector: string;
  skills: string[];
  week_label: string;
  shift_rotation: ShiftRotationBlock;
  shift_label: string;
  shift_start_date: string;
  shift_end_date: string;
  is_designated_this_week: boolean;
  status: "active_duty" | "off_duty" | "on_call" | "shift_completed";
  designated_by: string;
  designated_at: string;
}

export interface LogBookEntry {
  id: string;
  technician_id: string;
  technician_code: string;
  technician_name: string;
  sector: string;
  shift_block: string;
  day_in_rotation: number; // 1, 2, or 3
  total_rotation_days: number; // 3
  clock_in_time: string;
  clock_out_time: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  status: "on_duty" | "logged_out" | "break";
  notes?: string;
}

// Calculate current week bounds
export function getCurrentWeekSchedule() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...

  // Find Monday of current week
  const monday = new Date(now);
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  // Block A: Mon - Wed (3 days)
  const blockAStart = new Date(monday);
  const blockAEnd = new Date(monday);
  blockAEnd.setDate(monday.getDate() + 2);
  blockAEnd.setHours(23, 59, 59, 999);

  // Block B: Thu - Sat (3 days)
  const blockBStart = new Date(monday);
  blockBStart.setDate(monday.getDate() + 3);
  blockBStart.setHours(0, 0, 0, 0);
  const blockBEnd = new Date(monday);
  blockBEnd.setDate(monday.getDate() + 5);
  blockBEnd.setHours(23, 59, 59, 999);

  // Standby: Sun (1 day)
  const standbyStart = new Date(monday);
  standbyStart.setDate(monday.getDate() + 6);
  standbyStart.setHours(0, 0, 0, 0);
  const standbyEnd = new Date(monday);
  standbyEnd.setDate(monday.getDate() + 6);
  standbyEnd.setHours(23, 59, 59, 999);

  const isBlockA = now >= blockAStart && now <= blockAEnd;
  const isBlockB = now >= blockBStart && now <= blockBEnd;

  const currentBlock: ShiftRotationBlock = isBlockA ? "block_a" : isBlockB ? "block_b" : "standby";

  // Calculate which day of the 3-day rotation we are on
  let dayInRotation = 1;
  if (isBlockA) {
    const diffDays = Math.floor((now.getTime() - blockAStart.getTime()) / (1000 * 60 * 60 * 24));
    dayInRotation = Math.min(3, Math.max(1, diffDays + 1));
  } else if (isBlockB) {
    const diffDays = Math.floor((now.getTime() - blockBStart.getTime()) / (1000 * 60 * 60 * 24));
    dayInRotation = Math.min(3, Math.max(1, diffDays + 1));
  }

  const weekNum = Math.ceil(
    ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 +
      new Date(now.getFullYear(), 0, 1).getDay() +
      1) /
      7,
  );

  return {
    weekLabel: `Week ${weekNum}, ${now.getFullYear()} (${monday.toLocaleDateString("en-ZW", { month: "short", day: "numeric" })} - ${new Date(monday.getTime() + 6 * 86400000).toLocaleDateString("en-ZW", { month: "short", day: "numeric" })})`,
    currentBlock,
    dayInRotation,
    totalRotationDays: 3,
    blockA: {
      label: "Block A (Mon – Wed · 3 Days)",
      start: blockAStart.toISOString(),
      end: blockAEnd.toISOString(),
      isActiveNow: isBlockA,
    },
    blockB: {
      label: "Block B (Thu – Sat · 3 Days)",
      start: blockBStart.toISOString(),
      end: blockBEnd.toISOString(),
      isActiveNow: isBlockB,
    },
    standby: {
      label: "Emergency Standby (Sun · 1 Day)",
      start: standbyStart.toISOString(),
      end: standbyEnd.toISOString(),
      isActiveNow: !isBlockA && !isBlockB,
    },
  };
}

// Initial Admin-designated technicians for the active week
export const INITIAL_DESIGNATED_TECHNICIANS: DesignatedTechnician[] = [
  {
    id: "tech-001",
    technician_code: "TECH-HRE-01",
    name: "Tendai Moyo",
    phone: "+263 77 212 3456",
    email: "tendai.moyo@telone.co.zw",
    sector: "Harare Central & Msasa",
    skills: ["Optical Fiber Splicing", "OTDR Backbone", "Exchange OLT"],
    week_label: "Current Roster Week",
    shift_rotation: "block_a",
    shift_label: "Block A (Mon – Wed · 3 Days)",
    shift_start_date: new Date(Date.now() - 86400000 * 1).toISOString(),
    shift_end_date: new Date(Date.now() + 86400000 * 1).toISOString(),
    is_designated_this_week: true,
    status: "active_duty",
    designated_by: "Admin Central Dispatch",
    designated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "tech-002",
    technician_code: "TECH-BYO-02",
    name: "Sipho Ndlovu",
    phone: "+263 71 987 6543",
    email: "sipho.ndlovu@telone.co.zw",
    sector: "Bulawayo Substation & Belmont",
    skills: ["Auxiliary Power Systems", "Generator DC Banks", "DSLAM Reset"],
    week_label: "Current Roster Week",
    shift_rotation: "block_a",
    shift_label: "Block A (Mon – Wed · 3 Days)",
    shift_start_date: new Date(Date.now() - 86400000 * 1).toISOString(),
    shift_end_date: new Date(Date.now() + 86400000 * 1).toISOString(),
    is_designated_this_week: true,
    status: "active_duty",
    designated_by: "Admin Central Dispatch",
    designated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "tech-003",
    technician_code: "TECH-MTR-03",
    name: "Chipo Mutasa",
    phone: "+263 73 345 6789",
    email: "chipo.mutasa@telone.co.zw",
    sector: "Mutare Industrial & Main",
    skills: ["Copper PSTN Loop", "MSAN Cabinet Restoration", "ADSL SNR"],
    week_label: "Current Roster Week",
    shift_rotation: "block_b",
    shift_label: "Block B (Thu – Sat · 3 Days)",
    shift_start_date: new Date(Date.now() + 86400000 * 2).toISOString(),
    shift_end_date: new Date(Date.now() + 86400000 * 4).toISOString(),
    is_designated_this_week: true,
    status: "off_duty",
    designated_by: "Admin Central Dispatch",
    designated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "tech-004",
    technician_code: "TECH-GWR-04",
    name: "Farai Shumba",
    phone: "+263 77 888 9999",
    email: "farai.shumba@telone.co.zw",
    sector: "Gweru Midlands Exchange",
    skills: ["Fiber Plant", "Outdoor Pillar Repair", "Vandalism Recovery"],
    week_label: "Current Roster Week",
    shift_rotation: "block_b",
    shift_label: "Block B (Thu – Sat · 3 Days)",
    shift_start_date: new Date(Date.now() + 86400000 * 2).toISOString(),
    shift_end_date: new Date(Date.now() + 86400000 * 4).toISOString(),
    is_designated_this_week: true,
    status: "off_duty",
    designated_by: "Admin Central Dispatch",
    designated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "tech-005",
    technician_code: "TECH-CHIT-05",
    name: "Blessing Moyo",
    phone: "+263 78 111 2233",
    email: "blessing.moyo@telone.co.zw",
    sector: "Chitungwiza Unit L & Makoni",
    skills: ["Drop-Wire PSTN", "Broadband Line Noise", "Customer Premises"],
    week_label: "Current Roster Week",
    shift_rotation: "standby",
    shift_label: "Emergency Standby (Sun · 1 Day)",
    shift_start_date: new Date(Date.now() + 86400000 * 5).toISOString(),
    shift_end_date: new Date(Date.now() + 86400000 * 5).toISOString(),
    is_designated_this_week: true,
    status: "on_call",
    designated_by: "Admin Central Dispatch",
    designated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export const INITIAL_LOGBOOK_ENTRIES: LogBookEntry[] = [
  {
    id: "lb-001",
    technician_id: "tech-001",
    technician_code: "TECH-HRE-01",
    technician_name: "Tendai Moyo",
    sector: "Harare Central & Msasa",
    shift_block: "Block A (Mon – Wed · 3 Days)",
    day_in_rotation: 2,
    total_rotation_days: 3,
    clock_in_time: new Date(Date.now() - 3600000 * 4).toISOString(),
    clock_out_time: null,
    gps_lat: -17.8252,
    gps_lng: 31.0335,
    status: "on_duty",
    notes: "Commenced Day 2 of 3 field rotation. Inspecting Harare Central fiber cut tickets.",
  },
  {
    id: "lb-002",
    technician_id: "tech-002",
    technician_code: "TECH-BYO-02",
    technician_name: "Sipho Ndlovu",
    sector: "Bulawayo Substation & Belmont",
    shift_block: "Block A (Mon – Wed · 3 Days)",
    day_in_rotation: 2,
    total_rotation_days: 3,
    clock_in_time: new Date(Date.now() - 3600000 * 5).toISOString(),
    clock_out_time: null,
    gps_lat: -20.1569,
    gps_lng: 28.5828,
    status: "on_duty",
    notes: "Day 2 of 3 active. Deployed with backup DC inverter kit at Bulawayo Substation.",
  },
];
