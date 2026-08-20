import { MapContainer, TileLayer, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

export type MapFault = {
  id: string;
  lat: number | null;
  lng: number | null;
  status: string;
  severity: string;
  technical_summary: string;
  raw_transcript: string;
};

export type TechnicianLocation = {
  user_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  updated_at: string;
  display_name?: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  assigned: "#f59e0b",
  acknowledged: "#3b82f6",
  in_progress: "#8b5cf6",
  resolved: "#10b981",
  new: "#6b7280",
  triaged: "#6b7280",
};

// Zimbabwe bounding box
const ZW_BOUNDS: L.LatLngBoundsLiteral = [
  [-22.5, 25.2],
  [-15.6, 33.1],
];
const ZW_CENTER: [number, number] = [-19.0154, 29.1549];

// Fix default marker icon paths
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function FitToZimbabwe() {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(ZW_BOUNDS);
    map.setMinZoom(6);
  }, [map]);
  return null;
}

export default function FaultsMap({
  faults,
  technicians = [],
}: {
  faults: MapFault[];
  technicians?: TechnicianLocation[];
}) {
  const geo = faults.filter(
    (f): f is MapFault & { lat: number; lng: number } => f.lat != null && f.lng != null,
  );

  return (
    <div className="h-[460px] w-full overflow-hidden rounded-lg border border-border">
      <MapContainer
        center={ZW_CENTER}
        zoom={7}
        maxBounds={ZW_BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={6}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <FitToZimbabwe />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          bounds={ZW_BOUNDS}
        />
        {geo.map((f) => {
          const color = STATUS_COLOR[f.status] ?? "#6b7280";
          return (
            <CircleMarker
              key={f.id}
              center={[f.lat, f.lng]}
              radius={10}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.75,
                weight: 2,
              }}
            >
              <Popup>
                <div className="space-y-1 text-xs">
                  <div className="font-semibold">
                    {f.technical_summary || f.raw_transcript.slice(0, 60) || "Fault"}
                  </div>
                  <div>
                    Status: <span style={{ color }}>{f.status}</span> · Severity: {f.severity}
                  </div>
                  <Link to="/faults/$id" params={{ id: f.id }} className="text-primary underline">
                    Open ticket
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {technicians.map((t) => (
          <CircleMarker
            key={t.user_id}
            center={[t.lat, t.lng]}
            radius={8}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#dc2626",
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Popup>
              <div className="space-y-1 text-xs">
                <div className="font-semibold">🔧 {t.display_name || "Technician"}</div>
                <div className="text-muted-foreground">
                  Updated {new Date(t.updated_at).toLocaleTimeString()}
                </div>
                {t.accuracy != null && <div>±{Math.round(t.accuracy)}m</div>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
