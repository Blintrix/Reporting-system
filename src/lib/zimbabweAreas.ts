export interface ZimbabweArea {
  id: string;
  name: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  radiusKm: number;
  description: string;
  keywords: string[];
}

export const ZIMBABWE_AREAS: ZimbabweArea[] = [
  {
    id: "hre-central",
    name: "Harare Central & Avenues",
    city: "Harare",
    province: "Harare Metro",
    lat: -17.8252,
    lng: 31.0335,
    radiusKm: 12,
    description: "CBD, Avenues, Belvedere, Southerton & Central Exchange zone.",
    keywords: [
      "harare",
      "central",
      "cbd",
      "avenues",
      "southerton",
      "belvedere",
      "kopje",
      "exchange",
    ],
  },
  {
    id: "hre-north",
    name: "Harare North (Borrowdale / Avondale / Highlands)",
    city: "Harare",
    province: "Harare Metro",
    lat: -17.765,
    lng: 31.085,
    radiusKm: 18,
    description: "Borrowdale, Avondale, Mount Pleasant, Highlands, Chisipite, Pomona.",
    keywords: [
      "borrowdale",
      "avondale",
      "pleasant",
      "highlands",
      "chisipite",
      "pomona",
      "hatfield",
      "greendale",
    ],
  },
  {
    id: "hre-chitungwiza",
    name: "Chitungwiza & South Metro",
    city: "Chitungwiza",
    province: "Harare Metro",
    lat: -18.0125,
    lng: 31.0755,
    radiusKm: 16,
    description: "Seke, Zengeza, St Marys, Unit L, Makoni, Tilcor industrial area.",
    keywords: ["chitungwiza", "seke", "zengeza", "marys", "makoni", "tilcor"],
  },
  {
    id: "byo-central",
    name: "Bulawayo Central & Industrial",
    city: "Bulawayo",
    province: "Bulawayo Metro",
    lat: -20.1569,
    lng: 28.5828,
    radiusKm: 15,
    description: "Bulawayo CBD, Belmont industrial, Famona, Suburbs, Hillside.",
    keywords: ["bulawayo", "byo", "belmont", "famona", "substation", "hillside", "suburbs"],
  },
  {
    id: "byo-west",
    name: "Bulawayo West (Cowdray Park / Luveve)",
    city: "Bulawayo",
    province: "Bulawayo Metro",
    lat: -20.115,
    lng: 28.52,
    radiusKm: 16,
    description: "Cowdray Park, Luveve, Magwegwe, Lobengula, Nkulumane.",
    keywords: ["cowdray", "luveve", "magwegwe", "lobengula", "nkulumane", "emganwini", "pumula"],
  },
  {
    id: "mut-central",
    name: "Mutare & Eastern Highlands",
    city: "Mutare",
    province: "Manicaland",
    lat: -18.9728,
    lng: 32.6694,
    radiusKm: 20,
    description: "Mutare CBD, Chikanga, Sakubva, Dangamvura, Nyakamete industrial.",
    keywords: ["mutare", "chikanga", "sakubva", "dangamvura", "nyakamete", "penhalonga"],
  },
  {
    id: "gwr-central",
    name: "Gweru & Midlands Hub",
    city: "Gweru",
    province: "Midlands",
    lat: -19.4587,
    lng: 29.8149,
    radiusKm: 20,
    description: "Gweru CBD, Mkoba, Ascot, Lundi Park, Heavy Industrial.",
    keywords: ["gweru", "mkoba", "ascot", "lundi", "midlands"],
  },
  {
    id: "kwk-central",
    name: "Kwekwe & Redcliff Zone",
    city: "Kwekwe",
    province: "Midlands",
    lat: -18.9281,
    lng: 29.8149,
    radiusKm: 18,
    description: "Kwekwe CBD, Mbizo, Amaveni, Redcliff steelworks belt.",
    keywords: ["kwekwe", "mbizo", "amaveni", "redcliff", "torwood"],
  },
  {
    id: "msv-central",
    name: "Masvingo & Southern District",
    city: "Masvingo",
    province: "Masvingo",
    lat: -20.0744,
    lng: 30.8328,
    radiusKm: 20,
    description: "Masvingo CBD, Mucheke, Rujeko, Target Kopje.",
    keywords: ["masvingo", "mucheke", "rujeko", "flamboyant"],
  },
  {
    id: "chn-central",
    name: "Chinhoyi & Mashonaland West",
    city: "Chinhoyi",
    province: "Mashonaland West",
    lat: -17.3667,
    lng: 30.2,
    radiusKm: 20,
    description: "Chinhoyi CBD, Ruvimbo, Cold Stream, Orange Grove.",
    keywords: ["chinhoyi", "ruvimbo", "chegutu", "karoi"],
  },
];

/**
 * Calculates distance in kilometers between two GPS coordinates using the Haversine formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds the closest Zimbabwe coverage area to a given GPS coordinate
 */
export function findClosestArea(lat: number, lng: number): ZimbabweArea {
  let closest = ZIMBABWE_AREAS[0];
  let minDistance = Infinity;

  for (const area of ZIMBABWE_AREAS) {
    const dist = calculateDistanceKm(lat, lng, area.lat, area.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = area;
    }
  }

  return closest;
}

/**
 * Checks if a fault is within a specified area or radius
 */
export function isFaultInCustomerArea(
  fault: {
    lat?: number | null;
    lng?: number | null;
    technical_summary?: string | null;
    raw_transcript?: string | null;
    category?: string | null;
  },
  selectedAreaId: string,
  userGps?: { lat: number; lng: number } | null,
  customRadiusKm = 25,
): boolean {
  const targetArea = ZIMBABWE_AREAS.find((a) => a.id === selectedAreaId) || ZIMBABWE_AREAS[0];

  // 1. If fault has GPS coordinates, calculate distance from area center or user GPS
  if (fault.lat != null && fault.lng != null) {
    if (userGps?.lat != null && userGps?.lng != null) {
      const distFromUser = calculateDistanceKm(userGps.lat, userGps.lng, fault.lat, fault.lng);
      if (distFromUser <= customRadiusKm) return true;
    }

    const distFromAreaCenter = calculateDistanceKm(
      targetArea.lat,
      targetArea.lng,
      fault.lat,
      fault.lng,
    );
    if (distFromAreaCenter <= Math.max(targetArea.radiusKm, customRadiusKm)) {
      return true;
    }
  }

  // 2. Keyword fallback for faults without precise GPS
  const text =
    `${fault.technical_summary ?? ""} ${fault.raw_transcript ?? ""} ${fault.category ?? ""}`.toLowerCase();
  return targetArea.keywords.some((k) => text.includes(k));
}
