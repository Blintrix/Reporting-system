import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TechnicianLocation = {
  user_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  updated_at: string;
  display_name?: string | null;
};

export default function useTechnicianRealtime() {
  const [techs, setTechs] = useState<TechnicianLocation[]>([]);

  useEffect(() => {
    let mounted = true;

    async function fetchInitial() {
      try {
        const { data, error } = await supabase.from("technician_locations").select("*");
        if (!error && mounted && data) {
          setTechs(
            data.map((d: Record<string, unknown>) => ({
              user_id: String(d.user_id || d.technician_id || d.id || ""),
              lat: Number(d.lat),
              lng: Number(d.lng),
              accuracy: typeof d.accuracy === "number" ? d.accuracy : null,
              updated_at: String(d.updated_at || ""),
              display_name: typeof d.display_name === "string" ? d.display_name : null,
            })),
          );
        }
      } catch (e) {
        console.warn("fetchInitial technician_locations failed", e);
      }
    }

    fetchInitial();

    const channel = supabase
      .channel("public:technician_locations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "technician_locations" },
        (payload) => {
          setTechs((prev) => {
            try {
              const newRec = payload.new as Record<string, unknown> | null;
              const oldRec = payload.old as Record<string, unknown> | null;

              if (payload.eventType === "DELETE") {
                const uid = String(oldRec?.user_id || oldRec?.technician_id || oldRec?.id || "");
                return prev.filter((p) => p.user_id !== uid);
              }

              const uid = String(newRec?.user_id || newRec?.technician_id || newRec?.id || "");
              const idx = prev.findIndex((p) => p.user_id === uid);
              const mapped = {
                user_id: uid,
                lat: Number(newRec?.lat),
                lng: Number(newRec?.lng),
                accuracy: typeof newRec?.accuracy === "number" ? newRec.accuracy : null,
                updated_at: String(newRec?.updated_at || ""),
                display_name: typeof newRec?.display_name === "string" ? newRec.display_name : null,
              };
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = mapped;
                return copy;
              }
              return [...prev, mapped];
            } catch (e) {
              console.warn("Error handling technician_locations payload", e);
              return prev;
            }
          });
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // ignore
      }
    };
  }, []);

  return techs;
}
