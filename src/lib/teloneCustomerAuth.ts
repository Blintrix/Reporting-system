export interface TelOneCustomerSession {
  accountNumber: string;
  landlineNumber: string;
  fullName: string;
  email: string;
  phone: string;
  areaId: string;
  areaName: string;
  serviceType: "Fiber Broadband" | "ADSL / LTE" | "Copper Voice Landline" | "Corporate Trunk";
  connectedAt: string;
  portalToken: string;
  isVerifiedViaPortal: boolean;
}

export const DEMO_TELONE_ACCOUNTS: TelOneCustomerSession[] = [
  {
    accountNumber: "ACC-789420",
    landlineNumber: "0242 700111",
    fullName: "Shelton Madaure",
    email: "sheltonmadaure@gmail.com",
    phone: "+263 77 123 4567",
    areaId: "hre-central",
    areaName: "Harare Central & Avenues",
    serviceType: "Fiber Broadband",
    connectedAt: new Date().toISOString(),
    portalToken: "TOL-SSO-TOKEN-HRE-99281",
    isVerifiedViaPortal: true,
  },
  {
    accountNumber: "ACC-441209",
    landlineNumber: "0242 334890",
    fullName: "Tariro Chiwenga",
    email: "tariro.chiwenga@zimtelecom.co.zw",
    phone: "+263 71 889 0123",
    areaId: "hre-north",
    areaName: "Harare North (Borrowdale / Avondale)",
    serviceType: "ADSL / LTE",
    connectedAt: new Date().toISOString(),
    portalToken: "TOL-SSO-TOKEN-HRE-44120",
    isVerifiedViaPortal: true,
  },
  {
    accountNumber: "ACC-512087",
    landlineNumber: "0292 881234",
    fullName: "Dumiso Ndlovu",
    email: "dumiso.ndlovu@byo.co.zw",
    phone: "+263 77 445 6789",
    areaId: "byo-central",
    areaName: "Bulawayo Central & Industrial",
    serviceType: "Copper Voice Landline",
    connectedAt: new Date().toISOString(),
    portalToken: "TOL-SSO-TOKEN-BYO-51208",
    isVerifiedViaPortal: true,
  },
  {
    accountNumber: "ACC-619033",
    landlineNumber: "0202 612450",
    fullName: "Farai Mutasa",
    email: "f.mutasa@mutare.co.zw",
    phone: "+263 73 334 5566",
    areaId: "mut-central",
    areaName: "Mutare & Eastern Highlands",
    serviceType: "Fiber Broadband",
    connectedAt: new Date().toISOString(),
    portalToken: "TOL-SSO-TOKEN-MUT-61903",
    isVerifiedViaPortal: true,
  },
];

const STORAGE_KEY = "voxtel_telone_customer_session";

export function getTelOneCustomerSession(): TelOneCustomerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as TelOneCustomerSession;
  } catch {
    return null;
  }
}

export function loginTelOneSubscriber(
  identifier: string,
  _password?: string,
  areaId?: string,
  customName?: string,
): TelOneCustomerSession {
  const clean = identifier.trim();
  // Check if matches any demo account by landline, account number, or email
  const matched = DEMO_TELONE_ACCOUNTS.find(
    (acc) =>
      acc.landlineNumber.replace(/\s+/g, "") === clean.replace(/\s+/g, "") ||
      acc.accountNumber.toLowerCase() === clean.toLowerCase() ||
      acc.email.toLowerCase() === clean.toLowerCase(),
  );

  if (matched) {
    setTelOneCustomerSession(matched);
    return matched;
  }

  // Create new verified subscriber session based on input
  const isLandline = /^[0-9+ -]+$/.test(clean);
  const formattedLandline = isLandline ? clean : "0242 700111";
  const accNum = isLandline
    ? `ACC-${Math.floor(100000 + Math.random() * 900000)}`
    : clean.toUpperCase();

  const newSession: TelOneCustomerSession = {
    accountNumber: accNum,
    landlineNumber: formattedLandline,
    fullName: customName || "TelOne Subscriber",
    email: `${clean.toLowerCase().replace(/[^a-z0-9]/g, "") || "subscriber"}@telone.subscriber.zw`,
    phone: "+263 77 123 4567",
    areaId: areaId || "hre-central",
    areaName: "Harare Central & Avenues",
    serviceType: "Fiber Broadband",
    connectedAt: new Date().toISOString(),
    portalToken: `TOL-PORTAL-SSO-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
    isVerifiedViaPortal: true,
  };

  setTelOneCustomerSession(newSession);
  return newSession;
}

export function setTelOneCustomerSession(session: TelOneCustomerSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  // Update customer area preference automatically
  if (session.areaId) {
    localStorage.setItem("voxtel_customer_area_id", session.areaId);
  }
  // Dispatch custom event for reactive UI updates
  window.dispatchEvent(new CustomEvent("voxtel_customer_session_change", { detail: session }));
}

export function clearTelOneCustomerSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("voxtel_customer_session_change", { detail: null }));
}
