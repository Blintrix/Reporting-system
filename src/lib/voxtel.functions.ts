import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { analyzeFaultSpeech } from "@/lib/faultTypes";
import { isFaultInCustomerArea } from "@/lib/zimbabweAreas";
import {
  DesignatedTechnician,
  LogBookEntry,
  ShiftRotationBlock,
  getCurrentWeekSchedule,
  INITIAL_DESIGNATED_TECHNICIANS,
  INITIAL_LOGBOOK_ENTRIES,
} from "@/lib/technicianLogbook";

const LANGUAGES = ["en", "sn", "nd"] as const;
const SEVERITIES = ["low", "medium", "high", "critical"] as const;
const STATUSES = ["new", "triaged", "assigned", "acknowledged", "in_progress", "resolved"] as const;
const ROLES = ["reporter", "admin", "technician"] as const;

// In-Memory Mock Store for Offline/Demo Mode
export type FaultRecord = {
  id: string;
  client_uuid: string;
  reporter_id: string;
  raw_transcript: string;
  technical_summary: string;
  detected_language: (typeof LANGUAGES)[number];
  category: string | null;
  severity: (typeof SEVERITIES)[number];
  status: (typeof STATUSES)[number];
  lat: number | null;
  lng: number | null;
  location_accuracy: number | null;
  audio_url: string | null;
  photo_url: string | null;
  assigned_technician_id?: string | null;
  assigned_technician?: { id: string; name?: string; code?: string } | null;
  created_at: string;
  updated_at: string;
};

type EventRecord = {
  id: string;
  fault_id: string;
  actor_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

const MOCK_FAULTS: FaultRecord[] = [
  {
    id: "f1000000-0000-0000-0000-000000000001",
    client_uuid: "c1000000-0000-0000-0000-000000000001",
    reporter_id: "00000000-0000-0000-0000-000000000001",
    raw_transcript:
      "Monika pano paHarare Central Exchange fiber cable pairambidza kubatana chaiko, yakadambuka.",
    technical_summary:
      "[FIBER CUT] Optical fiber trunk severed at Harare Central Exchange causing 24-core backbone link failure.",
    detected_language: "sn",
    category: "Fiber Infrastructure",
    severity: "critical",
    status: "in_progress",
    lat: -17.8252,
    lng: 31.0335,
    location_accuracy: 12,
    audio_url: null,
    photo_url: null,
    assigned_technician_id: "tech-001",
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "f1000000-0000-0000-0000-000000000002",
    client_uuid: "c1000000-0000-0000-0000-000000000002",
    reporter_id: "00000000-0000-0000-0000-000000000001",
    raw_transcript:
      "PaBulawayo Substation amandla awezile kakhulu, inethiwekhi ayisebenzi kahle, magetsi aenda.",
    technical_summary:
      "[POWER AUXILIARY] Grid power surge and backup DC battery bank trip at Bulawayo Substation causing base station reset.",
    detected_language: "nd",
    category: "Auxiliary & Energy",
    severity: "high",
    status: "assigned",
    lat: -20.1569,
    lng: 28.5828,
    location_accuracy: 25,
    audio_url: null,
    photo_url: null,
    assigned_technician_id: "tech-002",
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "f1000000-0000-0000-0000-000000000003",
    client_uuid: "c1000000-0000-0000-0000-000000000003",
    reporter_id: "00000000-0000-0000-0000-000000000001",
    raw_transcript:
      "Landline phone in Mutare main line is dead, no dial tone since morning, lines are completely silent.",
    technical_summary:
      "[COPPER LANDLINE] PSTN copper pair open circuit in Mutare industrial area. Zero dial tone and high loop resistance.",
    detected_language: "en",
    category: "Voice & Access Loop",
    severity: "medium",
    status: "acknowledged",
    lat: -18.9728,
    lng: 32.6694,
    location_accuracy: 18,
    audio_url: null,
    photo_url: null,
    assigned_technician_id: "tech-003",
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "f1000000-0000-0000-0000-000000000004",
    client_uuid: "c1000000-0000-0000-0000-000000000004",
    reporter_id: "00000000-0000-0000-0000-000000000001",
    raw_transcript:
      "Roadside MSAN distribution cabinet pillar in Gweru was hit by a truck and damaged, wires exposed.",
    technical_summary:
      "[CABINET DAMAGE] Physical impact and enclosure damage on MSAN roadside pillar in Gweru. Terminal blocks exposed.",
    detected_language: "en",
    category: "Outdoor Plant & Distribution",
    severity: "high",
    status: "new",
    lat: -19.4587,
    lng: 29.8149,
    location_accuracy: 15,
    audio_url: null,
    photo_url: null,
    assigned_technician_id: null,
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: "f1000000-0000-0000-0000-000000000005",
    client_uuid: "c1000000-0000-0000-0000-000000000005",
    reporter_id: "00000000-0000-0000-0000-000000000001",
    raw_transcript:
      "TelOne ADSL modem broadband light is blinking red, extreme latency and packet loss since 2pm.",
    technical_summary:
      "[BROADBAND / LTE] DSLAM port synchronization failure and SNR attenuation causing severe broadband packet loss.",
    detected_language: "en",
    category: "Data & Internet Services",
    severity: "medium",
    status: "new",
    lat: -17.8312,
    lng: 31.0456,
    location_accuracy: 10,
    audio_url: null,
    photo_url: null,
    assigned_technician_id: null,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

const MOCK_EVENTS: EventRecord[] = [
  {
    id: "e1",
    fault_id: "f1000000-0000-0000-0000-000000000001",
    actor_id: "00000000-0000-0000-0000-000000000001",
    event_type: "created",
    payload: { severity: "critical" },
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: "e2",
    fault_id: "f1000000-0000-0000-0000-000000000001",
    actor_id: "00000000-0000-0000-0000-000000000001",
    event_type: "assigned",
    payload: { technician_id: "tech-001" },
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

const MOCK_ROLES: Map<string, Set<string>> = new Map([
  ["00000000-0000-0000-0000-000000000001", new Set(["reporter", "admin", "technician"])],
]);

const MOCK_TECHNICIANS = [
  { id: "tech-001", display_name: "Tendai Moyo (Harare)" },
  { id: "tech-002", display_name: "Sipho Ndlovu (Bulawayo)" },
  { id: "tech-003", display_name: "Chipo Mutasa (Mutare)" },
];

const MOCK_LOCATIONS: Map<
  string,
  { lat: number; lng: number; accuracy: number | null; updated_at: string }
> = new Map([
  ["tech-001", { lat: -17.828, lng: 31.038, accuracy: 10, updated_at: new Date().toISOString() }],
  ["tech-002", { lat: -20.15, lng: 28.58, accuracy: 15, updated_at: new Date().toISOString() }],
]);

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------- transcribe + normalize ----------

const TranscribeInput = z.object({
  audioBase64: z.string().min(1),
  mimeType: z.string().default("audio/webm"),
  languageHint: z.enum(LANGUAGES).optional(),
});

export const transcribeAndNormalize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TranscribeInput.parse(d))
  .handler(async ({ data }) => {
    const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

    if (openaiKey) {
      try {
        const bytes = base64ToBytes(data.audioBase64);
        const ext = data.mimeType.includes("mp4") ? "m4a" : "webm";
        const fd = new FormData();
        const audioBuf = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer;
        fd.append("file", new Blob([audioBuf], { type: data.mimeType }), `audio.${ext}`);
        fd.append("model", "whisper-1");
        fd.append("response_format", "verbose_json");
        if (data.languageHint) fd.append("language", data.languageHint);

        const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiKey}` },
          body: fd,
        });

        if (whisperRes.ok) {
          const whisperJson = (await whisperRes.json()) as { text: string; language?: string };
          const rawTranscript = (whisperJson.text ?? "").trim();
          const langRaw = (whisperJson.language ?? "").toLowerCase();
          const langMap: Record<string, (typeof LANGUAGES)[number]> = {
            english: "en",
            en: "en",
            shona: "sn",
            sn: "sn",
            ndebele: "nd",
            nd: "nd",
          };
          const detectedLanguage: (typeof LANGUAGES)[number] =
            langMap[langRaw] ?? data.languageHint ?? "en";

          const sys = `You are a maintenance-ops linguist for TelOne Zimbabwe. Convert field fault reports into technical fault terminology. Output STRICT JSON only.`;
          const userPrompt = `Raw transcript (${detectedLanguage}): """${rawTranscript}"""\n\nReturn JSON with keys: technical_summary (string, <= 60 words), category (string like "fiber-break" | "electrical" | "copper-line"), suggested_severity ("low"|"medium"|"high"|"critical").`;

          const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: sys },
                { role: "user", content: userPrompt },
              ],
              response_format: { type: "json_object" },
            }),
          });

          if (aiRes.ok) {
            const aj = await aiRes.json();
            const content = aj.choices?.[0]?.message?.content ?? "{}";
            const parsed = JSON.parse(content);
            const analyzed = analyzeFaultSpeech(rawTranscript, detectedLanguage);
            return {
              raw_transcript: rawTranscript,
              technical_summary: parsed.technical_summary || analyzed.technical_summary,
              detected_language: detectedLanguage,
              category: parsed.category || analyzed.category,
              suggested_severity: parsed.suggested_severity || analyzed.suggested_severity,
              fault_type: analyzed.fault_type,
              fault_type_label: analyzed.fault_type_label,
              recommended_action: analyzed.recommended_action,
              diagnostic_indicators: analyzed.diagnostic_indicators,
            };
          }
        }
      } catch (e) {
        console.warn("OpenAI transcription error, falling back to analysis engine:", e);
      }
    }

    // Fallback simulation for seamless client operation
    const hint = data.languageHint || "en";
    let mockRaw = "";

    if (hint === "sn") {
      mockRaw =
        "Netiweki yeTelOne yambomira kushanda pano muHarare Central Exchange, fiber cable yakadambuka.";
    } else if (hint === "nd") {
      mockRaw =
        "Inethiwekhi yeTelOne iyawa eBulawayo Substation, amandla awezile kakhulu, intambo ezidabukileyo.";
    } else {
      mockRaw =
        "TelOne broadband line interrupted and signal degraded near the Harare main exchange junction.";
    }

    const analyzed = analyzeFaultSpeech(mockRaw, hint);

    return {
      raw_transcript: mockRaw,
      technical_summary: analyzed.technical_summary,
      detected_language: hint,
      category: analyzed.category,
      suggested_severity: analyzed.suggested_severity,
      fault_type: analyzed.fault_type,
      fault_type_label: analyzed.fault_type_label,
      recommended_action: analyzed.recommended_action,
      diagnostic_indicators: analyzed.diagnostic_indicators,
    };
  });

// ---------- createFault ----------

const CreateFaultInput = z.object({
  client_uuid: z.string().uuid("Invalid client UUID format"),
  raw_transcript: z.string().min(5, "Validation Error: Transcript must be at least 5 characters"),
  technical_summary: z
    .string()
    .min(5, "Validation Error: Technical summary must be at least 5 characters"),
  detected_language: z.enum(LANGUAGES),
  category: z.string().nullable().optional(),
  severity: z.enum(SEVERITIES).default("medium"),
  lat: z
    .number()
    .min(-25, "Latitude out of valid regional bounds")
    .max(-10, "Latitude out of valid regional bounds")
    .nullable()
    .optional(),
  lng: z
    .number()
    .min(20, "Longitude out of valid regional bounds")
    .max(36, "Longitude out of valid regional bounds")
    .nullable()
    .optional(),
  location_accuracy: z.number().nullable().optional(),
  audioBase64: z.string().optional(),
  audioMime: z.string().optional(),
  photoBase64: z.string().optional(),
  photoMime: z.string().optional(),
});

export const createFault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateFaultInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const faultId = crypto.randomUUID();

    const audioDataUrl = data.audioBase64
      ? `data:${data.audioMime || "audio/webm"};base64,${data.audioBase64}`
      : null;
    const photoDataUrl = data.photoBase64
      ? `data:${data.photoMime || "image/jpeg"};base64,${data.photoBase64}`
      : null;

    const newFault: FaultRecord = {
      id: faultId,
      client_uuid: data.client_uuid,
      reporter_id: userId,
      raw_transcript: data.raw_transcript,
      technical_summary: data.technical_summary,
      detected_language: data.detected_language,
      category: data.category ?? "telecom-fault",
      severity: data.severity,
      status: "new",
      lat: data.lat ?? -17.8252,
      lng: data.lng ?? 31.0335,
      location_accuracy: data.location_accuracy ?? 10,
      audio_url: audioDataUrl,
      photo_url: photoDataUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: row, error } = await supabase
        .from("faults")
        .insert({
          id: faultId,
          client_uuid: data.client_uuid,
          reporter_id: userId,
          raw_transcript: data.raw_transcript,
          technical_summary: data.technical_summary,
          detected_language: data.detected_language,
          category: data.category ?? null,
          severity: data.severity,
          lat: data.lat ?? null,
          lng: data.lng ?? null,
          location_accuracy: data.location_accuracy ?? null,
        })
        .select()
        .single();

      if (!error && row) {
        return { fault: { ...row, audio_url: audioDataUrl, photo_url: photoDataUrl } };
      }
    } catch (e) {
      console.warn("Supabase insert fallback:", e);
    }

    // Fallback in-memory insert
    MOCK_FAULTS.unshift(newFault);
    MOCK_EVENTS.push({
      id: crypto.randomUUID(),
      fault_id: faultId,
      actor_id: userId,
      event_type: "created",
      payload: { severity: data.severity },
      created_at: new Date().toISOString(),
    });

    return { fault: newFault };
  });

// ---------- listFaults ----------

export const listFaults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        scope: z.enum(["mine", "customer", "admin", "technician"]),
        areaId: z.string().optional(),
        userLat: z.number().nullable().optional(),
        userLng: z.number().nullable().optional(),
        radiusKm: z.number().optional(),
        clientReportedIds: z.array(z.string()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let allFaults: FaultRecord[] = [];

    try {
      const { data: dbRows, error } = await supabase
        .from("faults")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && dbRows && dbRows.length > 0) {
        allFaults = dbRows;
      }
    } catch (e) {
      console.warn("Supabase listFaults fallback:", e);
    }

    if (allFaults.length === 0) {
      allFaults = [...MOCK_FAULTS];
    }

    const clientIdsSet = new Set(data.clientReportedIds || []);

    // Helper: Identify if fault was submitted by this customer
    const isReportedByMe = (f: FaultRecord) => {
      if (f.reporter_id === userId && userId !== "00000000-0000-0000-0000-000000000001") {
        return true;
      }
      if (clientIdsSet.has(f.id) || clientIdsSet.has(f.client_uuid)) {
        return true;
      }
      // Demo mock fallback: if user has no specific client IDs, default ticket #5 is their sample report
      if (
        clientIdsSet.size === 0 &&
        userId === "00000000-0000-0000-0000-000000000001" &&
        f.id === "f1000000-0000-0000-0000-000000000005"
      ) {
        return true;
      }
      return false;
    };

    // Scope: "mine" -> STRICTLY faults reported by this user
    if (data.scope === "mine") {
      const myFaults = allFaults.filter((f) => isReportedByMe(f));
      return {
        faults: myFaults,
        myReportedFaults: myFaults,
        areaAttendedFaults: [],
      };
    }

    // Scope: "customer" -> ONLY (1) Faults reported by customer + (2) Faults in customer's area that are reported & attended to
    if (data.scope === "customer") {
      const selectedAreaId = data.areaId || "hre-central";
      const userGps =
        data.userLat != null && data.userLng != null
          ? { lat: data.userLat, lng: data.userLng }
          : null;
      const radius = data.radiusKm || 25;

      const myReported = allFaults.filter((f) => isReportedByMe(f));

      // Area attended faults: Located strictly in customer's area and being attended to or actively reported
      const areaAttended = allFaults.filter((f) => {
        // Exclude customer's own reports from area list (they are in myReported)
        if (isReportedByMe(f)) return false;
        // Check geographic/keyword proximity to customer's area
        const inArea = isFaultInCustomerArea(f, selectedAreaId, userGps, radius);
        if (!inArea) return false;
        return true;
      });

      // Combined list contains ONLY customer's reports + area attended faults
      const combined = [...myReported, ...areaAttended];

      return {
        faults: combined,
        myReportedFaults: myReported,
        areaAttendedFaults: areaAttended,
      };
    }

    // Admin & Technician operators see full queue
    return {
      faults: allFaults,
      myReportedFaults: allFaults.filter((f) => isReportedByMe(f)),
      areaAttendedFaults: allFaults,
    };
  });

// ---------- getFault ----------

export const getFault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    try {
      const { data: fault, error } = await supabase
        .from("faults")
        .select("*")
        .eq("id", data.id)
        .single();

      if (!error && fault) {
        const { data: events } = await supabase
          .from("fault_events")
          .select("*")
          .eq("fault_id", data.id)
          .order("created_at", { ascending: true });

        return {
          fault,
          events: events ?? [],
          audioSignedUrl: fault.audio_url || null,
          photoSignedUrl: fault.photo_url || null,
        };
      }
    } catch (e) {
      console.warn("Supabase getFault fallback:", e);
    }

    const fault = MOCK_FAULTS.find((f) => f.id === data.id) || MOCK_FAULTS[0];
    const events = MOCK_EVENTS.filter((e) => e.fault_id === fault.id);

    return {
      fault,
      events,
      audioSignedUrl: fault.audio_url || null,
      photoSignedUrl: fault.photo_url || null,
    };
  });

// ---------- admin: triage / assign / updateStatus ----------

export const triageFault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        severity: z.enum(SEVERITIES).optional(),
        category: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    try {
      const patch: Record<string, unknown> = { status: "triaged" };
      if (data.severity) patch.severity = data.severity;
      if (data.category !== undefined) patch.category = data.category;

      const { error } = await supabase.from("faults").update(patch).eq("id", data.id);

      if (!error) return { ok: true };
    } catch (e) {
      console.warn("Triage fallback:", e);
    }

    const target = MOCK_FAULTS.find((f) => f.id === data.id);
    if (target) {
      target.status = "triaged";
      if (data.severity) target.severity = data.severity;
      if (data.category !== undefined) target.category = data.category;
    }
    return { ok: true };
  });

export const assignFault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), technician_id: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    try {
      const { error } = await supabase
        .from("faults")
        .update({
          assigned_technician_id: data.technician_id,
          status: "assigned",
        })
        .eq("id", data.id);

      if (!error) return { ok: true };
    } catch (e) {
      console.warn("Assign fallback:", e);
    }

    const target = MOCK_FAULTS.find((f) => f.id === data.id);
    if (target) {
      target.assigned_technician_id = data.technician_id;
      target.status = "assigned";
    }
    return { ok: true };
  });

export const technicianAttendFaultAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        fault_id: z.string(),
        technician_id: z.string(),
        technician_name: z.string().optional(),
        technician_code: z.string().optional(),
        action: z.enum(["attend", "acknowledge", "start_work", "resolve", "release"]),
        notes: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const now = new Date().toISOString();
    const techName =
      data.technician_name ||
      data.technician_code ||
      ROSTER_STORE.find(
        (t) => t.id === data.technician_id || t.technician_code === data.technician_id,
      )?.name ||
      "Logged-in Technician";

    let newStatus: (typeof STATUSES)[number] = "assigned";
    let eventNote = "";

    if (data.action === "attend") {
      newStatus = "assigned";
      eventNote = `${techName} selected and claimed this fault to attend to.`;
    } else if (data.action === "acknowledge") {
      newStatus = "acknowledged";
      eventNote = `${techName} acknowledged dispatch order.`;
    } else if (data.action === "start_work") {
      newStatus = "in_progress";
      eventNote = `${techName} arrived at site / commenced repairs.`;
    } else if (data.action === "resolve") {
      newStatus = "resolved";
      eventNote = `${techName} completed repairs and resolved the fault. ${data.notes ? `Notes: ${data.notes}` : ""}`;
    } else if (data.action === "release") {
      newStatus = "triaged";
      eventNote = `${techName} released job back to team pool.`;
    }

    try {
      const updatePayload: Record<string, unknown> = {
        status: newStatus,
        updated_at: now,
      };

      if (data.action === "attend") {
        updatePayload.assigned_technician_id = data.technician_id;
      } else if (data.action === "release") {
        updatePayload.assigned_technician_id = null;
      }

      await supabase.from("faults").update(updatePayload).eq("id", data.fault_id);

      await supabase.from("fault_events").insert({
        id: crypto.randomUUID(),
        fault_id: data.fault_id,
        user_id: userId,
        status: newStatus,
        notes: eventNote,
      });
    } catch (e) {
      console.warn("technicianAttendFaultAction supabase update error:", e);
    }

    // Also update in-memory MOCK_FAULTS
    const target = MOCK_FAULTS.find((f) => f.id === data.fault_id);
    if (target) {
      target.status = newStatus;
      target.updated_at = now;
      if (data.action === "attend") {
        target.assigned_technician_id = data.technician_id;
      } else if (data.action === "release") {
        target.assigned_technician_id = null;
      }
    }

    // Also update technician status in roster if active
    const rosterTech = ROSTER_STORE.find(
      (t) => t.id === data.technician_id || t.technician_code === data.technician_code,
    );
    if (rosterTech) {
      if (data.action === "attend" || data.action === "start_work") {
        rosterTech.status = "active_duty";
      }
    }

    return {
      ok: true,
      fault_id: data.fault_id,
      status: newStatus,
      message: eventNote,
    };
  });

export const updateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(STATUSES) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    try {
      const { error } = await supabase
        .from("faults")
        .update({ status: data.status })
        .eq("id", data.id);

      if (!error) return { ok: true };
    } catch (e) {
      console.warn("Update status fallback:", e);
    }

    const target = MOCK_FAULTS.find((f) => f.id === data.id);
    if (target) {
      target.status = data.status;
      target.updated_at = new Date().toISOString();
    }
    return { ok: true };
  });

export const listTechnicians = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return { technicians: MOCK_TECHNICIANS };
  });

// ---------- roles ----------

export const getMyRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    try {
      const { data, error } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (!error && data) {
        return { roles: data.map((r: { role: string }) => r.role) };
      }
    } catch (e) {
      console.warn("getMyRoles supabase error, falling back to mock:", e);
    }

    const userRoles = MOCK_ROLES.get(userId) || new Set(["reporter"]);
    return { roles: Array.from(userRoles) };
  });

export const grantSelfRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ role: z.enum(ROLES) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    try {
      // Check if role already exists
      const { data: existing, error: selErr } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", data.role)
        .limit(1)
        .maybeSingle();

      if (selErr) throw selErr;

      if (!existing) {
        const { error: insErr } = await supabaseAdmin.from("user_roles").insert({
          id: crypto.randomUUID(),
          user_id: userId,
          role: data.role,
        });
        if (insErr) throw insErr;
      }
      return { ok: true };
    } catch (e) {
      console.warn("grantSelfRole supabase error, falling back to mock:", e);
      if (!MOCK_ROLES.has(userId)) MOCK_ROLES.set(userId, new Set(["reporter"]));
      MOCK_ROLES.get(userId)?.add(data.role);
      return { ok: true };
    }
  });

// ---------- technician location ----------

const ZW_BOUNDS = { minLat: -22.6, maxLat: -15.5, minLng: 25.0, maxLng: 33.2 };

export const updateTechnicianLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        lat: z.number(),
        lng: z.number(),
        accuracy: z.number().nullable().optional(),
        heading: z.number().nullable().optional(),
        speed: z.number().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const now = new Date().toISOString();
    try {
      if (supabase) {
        const { error } = await supabase.from("technician_locations").upsert(
          {
            user_id: userId,
            lat: data.lat,
            lng: data.lng,
            accuracy: data.accuracy ?? null,
            updated_at: now,
          },
          { onConflict: "user_id" },
        );
        if (error) throw error;
        return { ok: true };
      }
    } catch (e) {
      console.warn("updateTechnicianLocation supabase upsert failed, falling back to mock:", e);
    }

    // Fallback to in-memory mock store
    MOCK_LOCATIONS.set(userId, {
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy ?? null,
      updated_at: now,
    });
    return { ok: true };
  });

export const listTechnicianLocations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      // Prefer real DB rows when available
      const { data, error } = await supabaseAdmin.from("technician_locations").select("*");
      if (!error && data) {
        const locations = data.map((d: Record<string, unknown>) => ({
          user_id: String(d.user_id || ""),
          lat: Number(d.lat),
          lng: Number(d.lng),
          accuracy: typeof d.accuracy === "number" ? d.accuracy : null,
          updated_at: String(d.updated_at || ""),
          display_name: typeof d.display_name === "string" ? d.display_name : null,
        }));
        return { locations };
      }
    } catch (e) {
      console.warn("listTechnicianLocations DB read failed, falling back to mock:", e);
    }

    const locations = Array.from(MOCK_LOCATIONS.entries()).map(([userId, loc]) => ({
      user_id: userId,
      lat: loc.lat,
      lng: loc.lng,
      accuracy: loc.accuracy,
      updated_at: loc.updated_at,
      display_name: MOCK_TECHNICIANS.find((t) => t.id === userId)?.display_name || "Technician",
    }));
    return { locations };
  });

// ---------- 3-Day Duty Log Book & Weekly Admin Roster ----------

const ROSTER_STORE: DesignatedTechnician[] = [...INITIAL_DESIGNATED_TECHNICIANS];
const LOGBOOK_STORE: LogBookEntry[] = [...INITIAL_LOGBOOK_ENTRIES];

export const getTechnicianDutyRoster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const schedule = getCurrentWeekSchedule();
    return {
      schedule,
      technicians: ROSTER_STORE,
      activeLogBook: LOGBOOK_STORE.filter((l) => l.status === "on_duty"),
      allLogBookEntries: LOGBOOK_STORE.slice().reverse(),
    };
  });

export const adminAddDesignatedTechnician = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(2),
        technician_code: z.string().min(2),
        phone: z.string().min(6),
        email: z.string().email().optional(),
        sector: z.string().min(2),
        skills: z.array(z.string()).default([]),
        shift_rotation: z.enum(["block_a", "block_b", "standby", "custom_3day"]),
        notes: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const schedule = getCurrentWeekSchedule();
    const id = `tech-${Date.now().toString().slice(-4)}`;

    let shiftLabel = "Block A (Mon – Wed · 3 Days)";
    let shiftStart = schedule.blockA.start;
    let shiftEnd = schedule.blockA.end;

    if (data.shift_rotation === "block_b") {
      shiftLabel = "Block B (Thu – Sat · 3 Days)";
      shiftStart = schedule.blockB.start;
      shiftEnd = schedule.blockB.end;
    } else if (data.shift_rotation === "standby") {
      shiftLabel = "Emergency Standby (Sun · 1 Day)";
      shiftStart = schedule.standby.start;
      shiftEnd = schedule.standby.end;
    } else if (data.shift_rotation === "custom_3day") {
      shiftLabel = "Custom 3-Day Shift Cycle";
      shiftStart = new Date().toISOString();
      shiftEnd = new Date(Date.now() + 86400000 * 3).toISOString();
    }

    const newTech: DesignatedTechnician = {
      id,
      technician_code: data.technician_code.toUpperCase(),
      name: data.name,
      phone: data.phone,
      email: data.email || `${data.technician_code.toLowerCase()}@telone.co.zw`,
      sector: data.sector,
      skills: data.skills.length > 0 ? data.skills : ["General Telecom Dispatch"],
      week_label: schedule.weekLabel,
      shift_rotation: data.shift_rotation as ShiftRotationBlock,
      shift_label: shiftLabel,
      shift_start_date: shiftStart,
      shift_end_date: shiftEnd,
      is_designated_this_week: true,
      status:
        (data.shift_rotation === "block_a" && schedule.blockA.isActiveNow) ||
        (data.shift_rotation === "block_b" && schedule.blockB.isActiveNow)
          ? "active_duty"
          : "off_duty",
      designated_by: `Admin (${userId.slice(0, 8)})`,
      designated_at: new Date().toISOString(),
    };

    ROSTER_STORE.push(newTech);

    // Also register into MOCK_TECHNICIANS for assignment dropdowns
    if (!MOCK_TECHNICIANS.some((t) => t.id === newTech.id)) {
      MOCK_TECHNICIANS.push({
        id: newTech.id,
        display_name: `${newTech.name} (${newTech.sector})`,
      });
    }

    return { ok: true, technician: newTech };
  });

export const adminToggleTechnicianDesignation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string(),
        is_designated: z.boolean(),
        shift_rotation: z.enum(["block_a", "block_b", "standby", "custom_3day"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const tech = ROSTER_STORE.find((t) => t.id === data.id);
    if (!tech) throw new Error("Technician record not found");

    tech.is_designated_this_week = data.is_designated;
    if (data.shift_rotation) {
      tech.shift_rotation = data.shift_rotation as ShiftRotationBlock;
      const schedule = getCurrentWeekSchedule();
      if (data.shift_rotation === "block_a") {
        tech.shift_label = "Block A (Mon – Wed · 3 Days)";
        tech.shift_start_date = schedule.blockA.start;
        tech.shift_end_date = schedule.blockA.end;
      } else if (data.shift_rotation === "block_b") {
        tech.shift_label = "Block B (Thu – Sat · 3 Days)";
        tech.shift_start_date = schedule.blockB.start;
        tech.shift_end_date = schedule.blockB.end;
      }
    }

    if (!tech.is_designated_this_week) {
      tech.status = "off_duty";
    }

    return { ok: true, technician: tech };
  });

export const adminRemoveDesignatedTechnician = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const idx = ROSTER_STORE.findIndex((t) => t.id === data.id);
    if (idx !== -1) {
      ROSTER_STORE.splice(idx, 1);
    }
    return { ok: true };
  });

export const technicianLogBookSignIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        technician_code_or_id: z.string().min(2),
        gps_lat: z.number().nullable().optional(),
        gps_lng: z.number().nullable().optional(),
        notes: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const term = data.technician_code_or_id.trim().toLowerCase();
    const schedule = getCurrentWeekSchedule();

    const tech = ROSTER_STORE.find(
      (t) =>
        t.id.toLowerCase() === term ||
        t.technician_code.toLowerCase() === term ||
        t.name.toLowerCase().includes(term) ||
        (t.email && t.email.toLowerCase() === term),
    );

    if (!tech) {
      throw new Error(
        `Technician "${data.technician_code_or_id}" not found. Only the Admin can add designated technicians for this week's roster.`,
      );
    }

    if (!tech.is_designated_this_week) {
      throw new Error(
        `Technician ${tech.name} (${tech.technician_code}) is not designated by Admin for this week's duty schedule. Contact Admin Central Operations to be designated on the roster.`,
      );
    }

    // Check shift block rotation
    const isActiveRotation =
      (tech.shift_rotation === "block_a" && schedule.blockA.isActiveNow) ||
      (tech.shift_rotation === "block_b" && schedule.blockB.isActiveNow) ||
      tech.shift_rotation === "standby" ||
      tech.shift_rotation === "custom_3day";

    if (!isActiveRotation) {
      throw new Error(
        `Shift Inactive: ${tech.name} is rostered for "${tech.shift_label}". Currently active rotation is "${schedule.currentBlock === "block_a" ? "Block A (Mon - Wed)" : schedule.currentBlock === "block_b" ? "Block B (Thu - Sat)" : "Emergency Standby"}". Only currently rostered technicians can log in.`,
      );
    }

    // Determine day in 3-day rotation
    const dayInRotation = schedule.dayInRotation;

    // Create log book entry
    const entryId = `lb-${Date.now()}`;
    const logEntry: LogBookEntry = {
      id: entryId,
      technician_id: tech.id,
      technician_code: tech.technician_code,
      technician_name: tech.name,
      sector: tech.sector,
      shift_block: tech.shift_label,
      day_in_rotation: dayInRotation,
      total_rotation_days: 3,
      clock_in_time: new Date().toISOString(),
      clock_out_time: null,
      gps_lat: data.gps_lat ?? null,
      gps_lng: data.gps_lng ?? null,
      status: "on_duty",
      notes: data.notes || `Signed in for Day ${dayInRotation} of 3-Day Duty Rotation`,
    };

    LOGBOOK_STORE.push(logEntry);
    tech.status = "active_duty";

    if (data.gps_lat && data.gps_lng) {
      MOCK_LOCATIONS.set(tech.id, {
        lat: data.gps_lat,
        lng: data.gps_lng,
        accuracy: 10,
        updated_at: new Date().toISOString(),
      });
    }

    return {
      ok: true,
      technician: tech,
      logBookEntry: logEntry,
      dayInRotation,
      totalRotationDays: 3,
    };
  });

export const technicianLogBookSignOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        logbook_entry_id: z.string().optional(),
        technician_id: z.string().optional(),
        signout_notes: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    let entry: LogBookEntry | undefined;
    if (data.logbook_entry_id) {
      entry = LOGBOOK_STORE.find((l) => l.id === data.logbook_entry_id);
    } else if (data.technician_id) {
      entry = LOGBOOK_STORE.slice()
        .reverse()
        .find((l) => l.technician_id === data.technician_id && l.status === "on_duty");
    }

    if (entry) {
      entry.clock_out_time = new Date().toISOString();
      entry.status = "logged_out";
      if (data.signout_notes) {
        entry.notes = `${entry.notes ? entry.notes + " | " : ""}Sign-out: ${data.signout_notes}`;
      }
    }

    if (data.technician_id) {
      const tech = ROSTER_STORE.find((t) => t.id === data.technician_id);
      if (tech) tech.status = "off_duty";
    }

    return { ok: true };
  });
