import React, { useState, useEffect, useRef } from "react";
import {
  FaultTypeDefinition,
  getFaultTypeFromRecord,
  TELONE_SERVICES,
  TelOneServiceKey,
} from "@/lib/faultTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Wrench,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  CheckSquare,
  Square,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Radio,
  Cpu,
  Zap,
  PhoneCall,
  Wifi,
  Sparkles,
  Layers,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

interface Props {
  fault: {
    id?: string;
    raw_transcript?: string;
    technical_summary?: string;
    category?: string | null;
    severity?: string;
    status?: string;
    detected_language?: string;
    audio_url?: string | null;
    fault_type_key?: string | null;
  };
  audioSignedUrl?: string | null;
  className?: string;
  showChecklistPersistence?: boolean;
}

export default function FaultTroubleshootingGuide({
  fault,
  audioSignedUrl,
  className = "",
  showChecklistPersistence = true,
}: Props) {
  const ft: FaultTypeDefinition = getFaultTypeFromRecord(fault);
  const serviceInfo = TELONE_SERVICES[ft.serviceKey as TelOneServiceKey] || TELONE_SERVICES.ftth;

  // Spoken voice playback states
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Step completion checklist state
  const checklistStorageKey = fault.id ? `voxtel_repair_steps_${fault.id}` : null;
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>(() => {
    if (typeof window !== "undefined" && checklistStorageKey && showChecklistPersistence) {
      try {
        const saved = localStorage.getItem(checklistStorageKey);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {};
  });

  const toggleStep = (stepNum: number) => {
    setCompletedSteps((prev) => {
      const next = { ...prev, [stepNum]: !prev[stepNum] };
      if (typeof window !== "undefined" && checklistStorageKey && showChecklistPersistence) {
        localStorage.setItem(checklistStorageKey, JSON.stringify(next));
      }
      return next;
    });
  };

  const markAllCompleted = () => {
    const next: Record<number, boolean> = {};
    ft.bestWayToFix.forEach((s) => {
      next[s.step] = true;
    });
    setCompletedSteps(next);
    if (typeof window !== "undefined" && checklistStorageKey && showChecklistPersistence) {
      localStorage.setItem(checklistStorageKey, JSON.stringify(next));
    }
    toast.success("All repair steps marked completed!");
  };

  const resetAllSteps = () => {
    setCompletedSteps({});
    if (typeof window !== "undefined" && checklistStorageKey && showChecklistPersistence) {
      localStorage.removeItem(checklistStorageKey);
    }
    toast.info("Repair checklist reset.");
  };

  // Web Speech Synthesis (TTS) for voice transcript playback
  const handlePlayTTS = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Text-to-Speech is not supported in this browser.");
      return;
    }

    if (isPlayingTTS) {
      window.speechSynthesis.cancel();
      setIsPlayingTTS(false);
      return;
    }

    const textToSpeak = fault.raw_transcript || fault.technical_summary || "";
    if (!textToSpeak.trim()) {
      toast.error("No voice message text found to play.");
      return;
    }

    window.speechSynthesis.cancel(); // Stop any pending utterances
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Map language
    const lang = fault.detected_language || "en";
    if (lang === "sn") {
      utterance.lang = "sn-ZW";
    } else if (lang === "nd") {
      utterance.lang = "nd-ZW";
    } else {
      utterance.lang = "en-ZW";
    }

    utterance.rate = ttsSpeed;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlayingTTS(true);
    };

    utterance.onend = () => {
      setIsPlayingTTS(false);
    };

    utterance.onerror = () => {
      setIsPlayingTTS(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const totalSteps = ft.bestWayToFix.length;
  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const completionPercentage = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  const effectiveAudioUrl = audioSignedUrl || fault.audio_url;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. TelOne Service & Identified Fault Type Banner */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={`font-bold text-xs uppercase px-2.5 py-0.5 shadow-xs ${serviceInfo.badgeClass}`}
              >
                {serviceInfo.shortCode} · {serviceInfo.label}
              </Badge>
              <Badge variant="outline" className={`font-semibold text-xs ${ft.color}`}>
                {ft.label}
              </Badge>
              <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                {ft.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-medium pt-0.5">
              <strong className="text-foreground">Technology Standard:</strong>{" "}
              {serviceInfo.technology}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/80 text-xs font-semibold text-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>Est. Fix Time: ~{ft.estimatedRepairTimeMinutes} mins</span>
            </div>
          </div>
        </div>

        {/* Fault Description & Diagnostics */}
        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/60">
          {ft.description}
        </p>

        {/* Diagnostic Key Indicators */}
        {ft.keywords && ft.keywords.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" /> Diagnostic Indicators:
            </span>
            {ft.keywords.slice(0, 6).map((kw, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-secondary/80 text-secondary-foreground text-[11px] font-mono"
              >
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2. Spoken Voice Reported Message Section (Crucial for Field Technicians) */}
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Volume2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                Customer Voice Reported Message & Audio
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Original spoken report from customer to clarify nuances before on-site dispatch.
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className="text-[10px] font-mono uppercase bg-background font-bold"
          >
            Spoken Lang:{" "}
            {fault.detected_language === "sn"
              ? "ChiShona"
              : fault.detected_language === "nd"
                ? "isiNdebele"
                : "English"}{" "}
            ({fault.detected_language || "en"})
          </Badge>
        </div>

        {/* Spoken Transcript Bubble */}
        <div className="rounded-lg bg-background p-3.5 border border-border shadow-2xs space-y-1.5">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Spoken Transcript
          </div>
          <p className="text-sm font-medium text-foreground italic leading-relaxed font-mono">
            "{fault.raw_transcript || "No raw voice transcript provided."}"
          </p>
        </div>

        {/* Audio Player Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Recorded Audio file player if available */}
          {effectiveAudioUrl ? (
            <div className="flex-1 min-w-[240px]">
              <audio
                ref={audioRef}
                src={effectiveAudioUrl}
                controls
                className="w-full h-8"
                onPlay={() => setIsPlayingAudio(true)}
                onPause={() => setIsPlayingAudio(false)}
                onEnded={() => setIsPlayingAudio(false)}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Direct Speech Synthesis Voice Reader Ready</span>
            </div>
          )}

          {/* Web Speech TTS Audio Playback Button */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isPlayingTTS ? "destructive" : "default"}
              size="sm"
              onClick={handlePlayTTS}
              className="text-xs font-bold h-8 gap-1.5 shadow-xs"
            >
              {isPlayingTTS ? (
                <>
                  <Pause className="h-3.5 w-3.5" /> Stop Voice Playback
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" /> 🔊 Listen to Voice Message
                </>
              )}
            </Button>

            {isPlayingTTS && (
              <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-md border border-primary/20">
                <span
                  className="inline-block h-2 w-1 bg-primary animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="inline-block h-3.5 w-1 bg-primary animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="inline-block h-2.5 w-1 bg-primary animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
                <span className="text-[10px] font-bold text-primary ml-1">PLAYING</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. The Best Way To Fix It (Technician SOP Field Guide) */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                The Best Way to Fix It (Field SOP)
              </h3>
              <p className="text-xs text-muted-foreground">
                Step-by-step restoration procedure certified for TelOne {serviceInfo.label}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {completedCount > 0 && (
              <button
                type="button"
                onClick={resetAllSteps}
                className="text-[11px] text-muted-foreground hover:text-foreground underline flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={markAllCompleted}
              className="text-xs h-7 font-semibold gap-1"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Complete All
            </Button>
          </div>
        </div>

        {/* Checklist Progress Bar */}
        <div className="space-y-1.5 bg-muted/40 p-3 rounded-lg border border-border/60">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-foreground">Field Repair Progress</span>
            <span className="text-primary font-mono font-bold">
              {completedCount} of {totalSteps} steps completed ({completionPercentage}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                completionPercentage === 100 ? "bg-emerald-500" : "bg-primary"
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Step-by-Step Procedure List */}
        <div className="space-y-2.5">
          {ft.bestWayToFix.map((s) => {
            const isDone = !!completedSteps[s.step];
            return (
              <div
                key={s.step}
                onClick={() => toggleStep(s.step)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all select-none space-y-1 ${
                  isDone
                    ? "border-emerald-500/40 bg-emerald-500/5 text-muted-foreground"
                    : "border-border bg-background hover:border-primary/50 hover:bg-muted/20"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="pt-0.5 text-primary shrink-0">
                    {isDone ? (
                      <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-foreground">
                        Step {s.step}
                      </span>
                      <h4
                        className={`text-xs sm:text-sm font-bold ${
                          isDone ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {s.action}
                      </h4>
                    </div>
                    <p
                      className={`text-xs leading-relaxed ${isDone ? "text-muted-foreground" : "text-foreground/80 font-medium"}`}
                    >
                      {s.detail}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Equipment & Safety Matrix */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          {/* Required Tools */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
            <div className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-primary" /> Required Field Equipment
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ft.requiredTools.map((tool, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-card border border-border text-[11px] font-semibold text-foreground"
                >
                  🛠️ {tool}
                </span>
              ))}
            </div>
          </div>

          {/* Safety Hazard Warning */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
            <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> Field
              Safety Hazard
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
              {ft.safetyPrecautions}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
