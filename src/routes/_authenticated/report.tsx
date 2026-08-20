import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState, useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { transcribeAndNormalize, createFault, getMyRoles } from "@/lib/voxtel.functions";
import { getTelOneCustomerSession, TelOneCustomerSession } from "@/lib/teloneCustomerAuth";
import {
  analyzeFaultSpeech,
  FAULT_TYPE_DEFINITIONS,
  FaultAnalysisResult,
  FaultTypeKey,
} from "@/lib/faultTypes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  Square,
  Upload,
  Sparkles,
  MapPin,
  AlertCircle,
  FileAudio,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Phone,
  ShieldCheck,
  Building2,
  Wrench,
  ArrowRight,
  Radio,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({ meta: [{ title: "Report TelOne Fault — VoXtEl Self-Service" }] }),
  component: ReportPage,
});

type Lang = "en" | "sn" | "nd";
type Severity = "low" | "medium" | "high" | "critical";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(r.error);
    r.onload = () => {
      const s = r.result as string;
      res(s.split(",")[1] ?? "");
    };
    r.readAsDataURL(blob);
  });
}

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") return undefined;
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/ogg",
    "audio/wav",
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

function getMicErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "name" in error && typeof error.name === "string") {
    const name = error.name;
    if (name === "NotAllowedError") {
      return "Microphone access was blocked. Please allow microphone permission in your browser and try again.";
    }
    if (name === "NotFoundError") {
      return "No microphone was found on this device. Please connect a mic or use an uploaded audio file.";
    }
    if (name === "NotReadableError") {
      return "The microphone is already in use by another app or browser tab.";
    }
    if (name === "TypeError") {
      return "This browser could not start microphone capture. Please try a secure HTTPS connection or a different browser.";
    }
    return name;
  }
  return "Microphone access denied or device not found.";
}

async function requestMicrophoneStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone hardware API is not supported on this device/browser.");
  }

  const isSecureContext = window.isSecureContext;
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  if (!isSecureContext && !isLocalHost) {
    throw new Error(
      "Microphone access requires a secure connection. Please open this portal over HTTPS or localhost and try again.",
    );
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasAudioInput = devices.some((device) => device.kind === "audioinput");
    if (!hasAudioInput) {
      throw new Error(
        "No microphone device was detected. Please connect a mic or use an uploaded audio file.",
      );
    }
  } catch {
    // Ignore enumeration issues and continue with the fallback request path.
  }

  const attempts: MediaStreamConstraints[] = [
    { audio: true },
    { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } },
    {
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    },
    { audio: { channelCount: 1 } },
  ];

  const errors: string[] = [];

  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      const message = getMicErrorMessage(error);
      errors.push(message);

      const name = error instanceof Error ? error.name : undefined;
      if (name === "NotAllowedError" || name === "NotFoundError") {
        break;
      }
    }
  }

  throw new Error(errors.at(-1) ?? "Microphone access denied or device not found.");
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getRecognitionLanguage(lang: Lang): string {
  switch (lang) {
    case "sn":
      return "en-ZW";
    case "nd":
      return "en-ZW";
    default:
      return "en-US";
  }
}

function buildSpeechTranscript(text: string, lang: Lang) {
  const analysis = analyzeFaultSpeech(text, lang);
  return {
    raw: text.trim(),
    technical: analysis.technical_summary,
    detected: lang,
    category: analysis.category,
    fault_type: analysis.fault_type,
    fault_type_label: analysis.fault_type_label,
    recommended_action: analysis.recommended_action,
    diagnostic_indicators: analysis.diagnostic_indicators,
    suggested_severity: analysis.suggested_severity,
  };
}

function ReportPage() {
  const navigate = useNavigate();
  const transcribe = useServerFn(transcribeAndNormalize);
  const submit = useServerFn(createFault);
  const rolesFn = useServerFn(getMyRoles);

  const rolesQ = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => rolesFn(),
  });

  const isTechnician = rolesQ.data?.roles?.includes("technician");

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

  // Form Fields & Validation state
  const [phoneNumber, setPhoneNumber] = useState(
    () => customerSession?.landlineNumber || "0242 700111",
  );
  const [exchangeSector, setExchangeSector] = useState("harare_central");
  const [inputMode, setInputMode] = useState<"mic" | "file" | "text">("mic");
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [micError, setMicError] = useState<string | null>(null);
  const [directText, setDirectText] = useState("");
  const [liveSpeechText, setLiveSpeechText] = useState("");
  const [isSpeechListening, setIsSpeechListening] = useState(false);

  const [transcript, setTranscript] = useState<{
    raw: string;
    technical: string;
    detected: Lang;
    category: string | null;
    fault_type?: FaultTypeKey;
    fault_type_label?: string;
    recommended_action?: string;
    diagnostic_indicators?: string[];
    suggested_severity?: Severity;
  } | null>(null);

  const [busy, setBusy] = useState<null | "transcribe" | "submit">(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number; acc: number } | null>({
    lat: -17.8252,
    lng: 31.0335,
    acc: 10,
  });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recognitionTextRef = useRef<string>("");

  // Validation Check Rules
  const phoneValid = useMemo(() => {
    const cleaned = phoneNumber.replace(/[\s-]/g, "");
    return (
      /^(\+?263|0)(242|292|77|78|71|73|20|55)\d{6,7}$/.test(cleaned) ||
      /^ACC-\d{5,8}$/i.test(cleaned)
    );
  }, [phoneNumber]);

  const audioValid = useMemo(() => {
    if (audioBlob) return audioBlob.size > 100;
    if (directText.trim()) return directText.trim().length >= 10;
    if (liveSpeechText.trim().length >= 5) return true;
    return false;
  }, [audioBlob, directText, liveSpeechText]);

  const geoValid = useMemo(() => {
    if (!geo) return false;
    return geo.lat >= -23.0 && geo.lat <= -15.0 && geo.lng >= 25.0 && geo.lng <= 34.0;
  }, [geo]);

  const formValid = phoneValid && audioValid && geoValid && transcript !== null;

  // Timer ticker for microphone recording
  useEffect(() => {
    if (recording) {
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      recognitionRef.current?.stop();
    };
  }, []);

  function initializeSpeechRecognition() {
    if (typeof window === "undefined") return null;
    if (recognitionRef.current) return recognitionRef.current;

    const ctor =
      (
        window as Window &
          typeof globalThis & {
            SpeechRecognition?: SpeechRecognitionConstructor;
            webkitSpeechRecognition?: SpeechRecognitionConstructor;
          }
      ).SpeechRecognition ??
      (
        window as Window &
          typeof globalThis & {
            SpeechRecognition?: SpeechRecognitionConstructor;
            webkitSpeechRecognition?: SpeechRecognitionConstructor;
          }
      ).webkitSpeechRecognition;

    if (!ctor) return null;

    const recognition = new ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = getRecognitionLanguage(lang);

    recognition.onstart = () => {
      setIsSpeechListening(true);
    };

    recognition.onresult = (event) => {
      let combined = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result[0]) {
          combined += (i > 0 ? " " : "") + result[0].transcript;
        }
      }
      const trimmed = combined.trim();
      if (trimmed) {
        recognitionTextRef.current = trimmed;
        setLiveSpeechText(trimmed);

        // Real-time analysis and writing down results as report is made
        const localTranscript = buildSpeechTranscript(trimmed, lang);
        setTranscript(localTranscript);
        if (localTranscript.suggested_severity) {
          setSeverity(localTranscript.suggested_severity);
        }
      }
    };

    recognition.onerror = () => {
      setIsSpeechListening(false);
    };

    recognition.onend = () => {
      setIsSpeechListening(false);
      const recognizedText = recognitionTextRef.current.trim();
      if (recognizedText) {
        const localTranscript = buildSpeechTranscript(recognizedText, lang);
        setTranscript(localTranscript);
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }

  function startLiveSpeechDictation() {
    const recognition = initializeSpeechRecognition();
    if (!recognition) {
      toast.error("Google Web Speech API is not supported in this browser environment.");
      return;
    }
    try {
      recognitionTextRef.current = "";
      setLiveSpeechText("");
      recognition.lang = getRecognitionLanguage(lang);
      recognition.start();
      setIsSpeechListening(true);
      toast.info("Google Web Speech API listening... Speak your fault note.");
    } catch {
      // already started
    }
  }

  function stopLiveSpeechDictation() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsSpeechListening(false);
    }
  }

  async function startRecording() {
    setMicError(null);
    setLiveSpeechText("");

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await requestMicrophoneStream();
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const finalMime = mr.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        const recognizedText = recognitionTextRef.current.trim();
        if (recognizedText) {
          const localTranscript = buildSpeechTranscript(recognizedText, lang);
          setTranscript(localTranscript);
          toast.success("Live speech transcribed via Google Web Speech API.");
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      mr.start(250);
      recorderRef.current = mr;

      const recognition = initializeSpeechRecognition();
      if (recognition) {
        recognitionTextRef.current = "";
        recognition.lang = getRecognitionLanguage(lang);
        try {
          recognition.start();
        } catch {
          // Fallback if recognition is already running
        }
      }

      setRecording(true);
      setTranscript(null);
      toast.info("Recording voice report & streaming Google Web Speech API...");
    } catch (e) {
      const err = getMicErrorMessage(e);
      setMicError(err);
      toast.error(`Microphone unavailable: ${err}`);
    }
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setIsSpeechListening(false);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  }

  function handleAudioFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error("Validation error: Audio file size exceeds 15MB limit.");
        return;
      }
      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
      setTranscript(null);
      setMicError(null);
      toast.success(`Loaded audio file: ${file.name}`);
    }
  }

  async function captureLocation() {
    if (!navigator.geolocation) {
      toast.error("Validation Error: Geolocation API unavailable");
      return;
    }
    toast.info("Validating GPS coordinates...");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        if (lat < -23.0 || lat > -15.0 || lng < 25.0 || lng > 34.0) {
          toast.warning(
            "GPS coordinates outside standard Zimbabwe region bounds. Defaulting to exchange coordinates.",
          );
        }
        setGeo({
          lat,
          lng,
          acc: p.coords.accuracy,
        });
        toast.success("GPS Location verified and attached.");
      },
      (e) => toast.error(`GPS Error: ${e.message}`),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function runTranscribe() {
    if (!audioValid) {
      toast.error(
        "Validation failed: Please record audio or enter a speech note of at least 10 characters.",
      );
      return;
    }

    setBusy("transcribe");
    try {
      const recognizedText = recognitionTextRef.current.trim();
      if (recognizedText) {
        const localTranscript = buildSpeechTranscript(recognizedText, lang);
        setTranscript(localTranscript);
        if (localTranscript.suggested_severity) {
          setSeverity(localTranscript.suggested_severity);
        }
        toast.success("Speech transcribed and analyzed via Google Web Speech API.");
        return;
      }

      if (audioBlob) {
        const b64 = await blobToBase64(audioBlob);
        const res = await transcribe({
          data: {
            audioBase64: b64,
            mimeType: audioBlob.type || "audio/webm",
            languageHint: lang,
          },
        });
        setTranscript({
          raw: res.raw_transcript,
          technical: res.technical_summary,
          detected: res.detected_language,
          category: res.category,
          fault_type: res.fault_type as FaultTypeKey | undefined,
          fault_type_label: res.fault_type_label,
          recommended_action: res.recommended_action,
          diagnostic_indicators: res.diagnostic_indicators,
          suggested_severity: res.suggested_severity as Severity,
        });
        if (res.suggested_severity) {
          setSeverity(res.suggested_severity as Severity);
        }
        toast.success(`Speech Analyzed: ${res.fault_type_label || "Fault Classified"}`);
      } else if (directText.trim()) {
        const analysis = analyzeFaultSpeech(directText.trim(), lang);
        setTranscript({
          raw: directText.trim(),
          technical: analysis.technical_summary,
          detected: lang,
          category: analysis.category,
          fault_type: analysis.fault_type,
          fault_type_label: analysis.fault_type_label,
          recommended_action: analysis.recommended_action,
          diagnostic_indicators: analysis.diagnostic_indicators,
          suggested_severity: analysis.suggested_severity,
        });
        if (analysis.suggested_severity) {
          setSeverity(analysis.suggested_severity);
        }
        toast.success(`Voice text analyzed: ${analysis.fault_type_label}`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function submitFault() {
    if (!phoneValid) {
      toast.error("Validation Error: Invalid subscriber phone or account number format.");
      return;
    }
    if (!transcript) {
      toast.error(
        "Validation Error: Speech normalization must be executed prior to ticket creation.",
      );
      return;
    }
    if (!geoValid) {
      toast.error("Validation Error: Geolocation coordinates failed validity checks.");
      return;
    }

    setBusy("submit");
    try {
      const audioB64 = audioBlob ? await blobToBase64(audioBlob) : undefined;
      const photoB64 = photoFile ? await blobToBase64(photoFile) : undefined;

      const res = await submit({
        data: {
          client_uuid: crypto.randomUUID(),
          raw_transcript: transcript.raw,
          technical_summary: `[Subscriber: ${customerSession?.fullName || "TelOne Subscriber"} · Acc: ${customerSession?.accountNumber || "ACC-VERIFIED"} · Line: ${phoneNumber}] [Sector: ${exchangeSector.toUpperCase()}] ${transcript.technical}`,
          detected_language: transcript.detected,
          category: transcript.category,
          severity,
          lat: geo?.lat ?? -17.8252,
          lng: geo?.lng ?? 31.0335,
          location_accuracy: geo?.acc ?? 10,
          audioBase64: audioB64,
          audioMime: audioBlob?.type || "audio/webm",
          photoBase64: photoB64,
          photoMime: photoFile?.type,
        },
      });

      if (typeof window !== "undefined" && res.fault?.id) {
        try {
          const existing = JSON.parse(localStorage.getItem("voxtel_my_reported_fault_ids") || "[]");
          if (!existing.includes(res.fault.id)) {
            existing.unshift(res.fault.id);
            localStorage.setItem("voxtel_my_reported_fault_ids", JSON.stringify(existing));
          }
        } catch {
          // ignore
        }
      }

      toast.success("TelOne fault ticket created & verified!");
      navigate({ to: "/faults/$id", params: { id: res.fault!.id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Title Banner */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-mono">
            TelOne Self-Service
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">
            Multilingual Voice Processing Portal · Google Web Speech API
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Report a Network Fault
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Record or dictate your voice note in English, Shona, or Ndebele. The VoXtEl Google Web
          Speech Normalizer transcribes speech in real time, categorizes severity, and dispatches
          assigned technicians.
        </p>
      </div>

      {/* Connected TelOne Subscriber Banner */}
      {customerSession && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shrink-0 shadow-xs font-bold text-xs">
              TOL
            </div>
            <div className="space-y-0.5 text-xs">
              <div className="font-bold text-foreground flex items-center gap-2">
                <span>{customerSession.fullName}</span>
                <Badge className="bg-emerald-600 text-[10px] text-white">
                  Verified via Self Service Portal
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
                  Line:{" "}
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
          <a
            href="https://selfservice.telone.co.zw"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            selfservice.telone.co.zw
          </a>
        </div>
      )}

      {/* Hardware Warning Alert if Workstation has no Mic */}
      {micError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Microphone Hardware Not Detected</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">{micError}</p>
          <div className="pt-1 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => setInputMode("file")}
            >
              <Upload className="h-3 w-3" /> Upload Audio File
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => setInputMode("text")}
            >
              Type Spoken Note
            </Button>
          </div>
        </div>
      )}

      {/* Language & Input Mode Selector */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Spoken Language (Google Web Speech AI)
            </Label>
            <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <SelectTrigger className="w-48 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en" className="text-xs">
                  English (Zimbabwe / US)
                </SelectItem>
                <SelectItem value="sn" className="text-xs">
                  Shona (ChiShona)
                </SelectItem>
                <SelectItem value="nd" className="text-xs">
                  Ndebele (IsiNdebele)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg border border-border text-xs">
            <button
              type="button"
              onClick={() => setInputMode("mic")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                inputMode === "mic"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mic className="h-3.5 w-3.5" /> Voice Mic
            </button>
            <button
              type="button"
              onClick={() => setInputMode("file")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                inputMode === "file"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Upload className="h-3.5 w-3.5" /> Audio File
            </button>
            <button
              type="button"
              onClick={() => setInputMode("text")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                inputMode === "text"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Type Note
            </button>
          </div>
        </div>

        {/* Input Option 1: Live Microphone Recording with Google Web Speech AI */}
        {inputMode === "mic" && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/30 p-8 text-center space-y-4">
              {!recording ? (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner">
                    <Mic className="h-8 w-8 animate-pulse" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <div className="font-bold text-foreground text-sm">
                      Start Voice Recording with Google Web Speech AI
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Speak clearly about your service fault in{" "}
                      {lang === "sn" ? "Shona" : lang === "nd" ? "Ndebele" : "English"}. Transcribed
                      live in real time as the report is being made.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button
                      type="button"
                      size="lg"
                      onClick={startRecording}
                      className="gap-2 bg-primary text-primary-foreground font-bold shadow-md hover:scale-105 transition-all"
                    >
                      <Mic className="h-4 w-4" /> Start Voice Recording & Live AI Transcription
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 text-red-600 dark:text-red-400">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-30"></span>
                    <Mic className="h-10 w-10 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest flex items-center justify-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                      Recording Live Audio · Google Web Speech AI Transcribing Live
                    </div>
                    <div className="text-3xl font-mono font-extrabold text-foreground">
                      {formatTime(recordSeconds)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="lg"
                    variant="destructive"
                    onClick={stopRecording}
                    className="gap-2 font-bold shadow-md"
                  >
                    <Square className="h-4 w-4 fill-current" /> Stop & Finalize Voice Report
                  </Button>
                </>
              )}
            </div>

            {/* Live Streaming Speech Preview Box */}
            {(isSpeechListening || liveSpeechText) && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                    </span>
                    <span>Google Web Speech API Live Recognition</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono text-primary border-primary/30"
                  >
                    {lang === "sn" ? "ChiShona" : lang === "nd" ? "IsiNdebele" : "English"} Engine
                  </Badge>
                </div>
                <div className="rounded-lg border border-border bg-background p-3 text-xs font-mono text-foreground leading-relaxed italic shadow-xs">
                  {liveSpeechText
                    ? `"${liveSpeechText}"`
                    : "Listening... Start speaking to transcribe in real-time."}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Option 2: Upload Audio File */}
        {inputMode === "file" && (
          <div className="space-y-3 pt-2">
            <Label className="text-xs font-semibold text-foreground">
              Upload Audio Recording File
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioFileUpload}
                className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Supports .mp3, .m4a, .wav, .ogg, .webm recordings from any device (max 15MB).
            </p>
          </div>
        )}

        {/* Input Option 3: Direct Text */}
        {inputMode === "text" && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Type or Paste Spoken Fault Note
              </Label>
              <span
                className={`text-[10px] font-mono font-bold ${directText.trim().length >= 10 ? "text-emerald-600" : "text-amber-600"}`}
              >
                Length: {directText.trim().length}/10 min chars
              </span>
            </div>
            <textarea
              value={directText}
              onChange={(e) => setDirectText(e.target.value)}
              placeholder="e.g. Fiber cable is damaged at Harare Central Exchange causing complete broadband outage..."
              rows={3}
              className={`w-full rounded-md border bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                directText.trim() && directText.trim().length < 10
                  ? "border-amber-500"
                  : "border-input"
              }`}
            />
          </div>
        )}

        {/* Audio Player and Transcribe Action */}
        {audioUrl && (
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <FileAudio className="h-4 w-4 text-primary" /> Audio Waveform Ready
              </span>
              <span className="text-muted-foreground text-[11px] font-mono">
                {audioBlob ? `${Math.round(audioBlob.size / 1024)} KB` : ""}
              </span>
            </div>
            <audio src={audioUrl} controls className="w-full h-10 rounded-md" />

            {!transcript && (
              <Button
                type="button"
                onClick={runTranscribe}
                disabled={busy === "transcribe" || !audioValid}
                className="w-full font-bold gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-md"
              >
                {busy === "transcribe" ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Normalizing Speech Signal…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Process & Categorize Voice Recording
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Direct Text Transcribe trigger */}
        {inputMode === "text" && !audioBlob && (
          <Button
            type="button"
            onClick={runTranscribe}
            disabled={busy === "transcribe" || !audioValid}
            className="w-full font-bold gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-md"
          >
            {busy === "transcribe" ? "Processing..." : "Normalize Speech Text"}
          </Button>
        )}
      </section>

      {/* Speech Normalization & Fault Classification Output */}
      {transcript && (
        <section className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4 shadow-xs animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">
                AI Speech Analysis & Fault Classification
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {transcript.fault_type_label && (
                <Badge className="bg-primary text-primary-foreground font-semibold">
                  {transcript.fault_type_label}
                </Badge>
              )}
              <Badge variant="secondary" className="uppercase font-mono text-[10px]">
                Language: {transcript.detected}
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="sm:col-span-2">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase">
                Raw Audio Speech Transcript
              </Label>
              <div className="mt-1 rounded-lg border border-border bg-background p-3 text-foreground italic font-mono">
                "{transcript.raw || "No transcript text."}"
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase">
                Technical Operational Summary
              </Label>
              <div className="mt-1 rounded-lg border border-border bg-background p-3 text-foreground font-medium leading-relaxed">
                {transcript.technical}
              </div>
            </div>

            {transcript.recommended_action && (
              <div className="sm:col-span-2 rounded-lg border border-border bg-background p-3 space-y-1">
                <Label className="text-[11px] font-bold text-primary uppercase flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5" /> Recommended Technician Field Action
                </Label>
                <p className="text-xs text-muted-foreground font-medium">
                  {transcript.recommended_action}
                </p>
              </div>
            )}

            {transcript.category && (
              <div className="text-xs text-muted-foreground">
                Infrastructure Category:{" "}
                <span className="font-bold text-foreground capitalize">
                  {transcript.category.replace("-", " ")}
                </span>
              </div>
            )}

            {transcript.diagnostic_indicators && transcript.diagnostic_indicators.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Diagnostic Indicators:{" "}
                <span className="font-medium text-foreground">
                  {transcript.diagnostic_indicators.join(", ")}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Secondary Details: Severity, Photo & GPS */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
        <h2 className="text-sm font-bold text-foreground">Additional Location & Field Telemetry</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Severity Classification</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
              <SelectTrigger className="text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low" className="text-xs">
                  Low (Minor noise / line crackle)
                </SelectItem>
                <SelectItem value="medium" className="text-xs">
                  Medium (Single subscriber outage)
                </SelectItem>
                <SelectItem value="high" className="text-xs">
                  High (Neighborhood exchange issue)
                </SelectItem>
                <SelectItem value="critical" className="text-xs">
                  Critical (Major backbone fiber break)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Attach Site Photo (Optional)</Label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-muted-foreground file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-secondary file:text-secondary-foreground"
              />
            </div>
          </div>

          <div className="sm:col-span-2 space-y-1.5 pt-1">
            <Label className="text-xs font-semibold">GPS Field Coordinates</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={captureLocation}
                className="text-xs gap-1.5"
              >
                <MapPin className="h-3.5 w-3.5 text-primary" /> Capture Location
              </Button>
              <span className="text-xs text-muted-foreground font-mono">
                {geo
                  ? `${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)} (Accuracy: ±${Math.round(geo.acc)}m)`
                  : "Harare Central Exchange (-17.8252, 31.0335)"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* System Validation Check Protocol Matrix */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs">
        <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between border-b border-border pb-2">
          <span>System Pre-Submission Validation Checklist</span>
          <span className="font-mono text-[10px] text-muted-foreground">ISO-9001 Protocol</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div
            className={`flex items-center gap-2 p-2 rounded-md border ${phoneValid ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 border-destructive/30 text-destructive"}`}
          >
            {phoneValid ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">Subscriber Contact Format</span>
          </div>

          <div
            className={`flex items-center gap-2 p-2 rounded-md border ${audioValid ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 border-destructive/30 text-destructive"}`}
          >
            {audioValid ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">Speech Recording / Text Payload</span>
          </div>

          <div
            className={`flex items-center gap-2 p-2 rounded-md border ${geoValid ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 border-destructive/30 text-destructive"}`}
          >
            {geoValid ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">GPS Geographic Boundary Check</span>
          </div>

          <div
            className={`flex items-center gap-2 p-2 rounded-md border ${transcript !== null ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"}`}
          >
            {transcript !== null ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">Speech Normalization Execution</span>
          </div>
        </div>
      </section>

      {/* Final Submit Button */}
      <div className="pt-2">
        <Button
          type="button"
          size="lg"
          onClick={submitFault}
          disabled={!formValid || busy === "submit"}
          className="w-full text-base font-bold shadow-lg py-6 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy === "submit" ? "Submitting Fault Ticket…" : "Submit Fault Ticket to TelOne"}
        </Button>
        {!formValid && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Complete all validation checks above to submit the fault ticket.
          </p>
        )}
      </div>
    </div>
  );
}
