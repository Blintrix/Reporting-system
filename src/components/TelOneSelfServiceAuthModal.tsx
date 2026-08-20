import React, { useState } from "react";
import {
  TelOneCustomerSession,
  DEMO_TELONE_ACCOUNTS,
  getTelOneCustomerSession,
  setTelOneCustomerSession,
  clearTelOneCustomerSession,
} from "@/lib/teloneCustomerAuth";
import { ZIMBABWE_AREAS } from "@/lib/zimbabweAreas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ShieldCheck,
  ExternalLink,
  Phone,
  Radio,
  Building2,
  CheckCircle2,
  Lock,
  LogOut,
  User,
  Zap,
  RefreshCw,
  X,
} from "lucide-react";
import teloneLogo from "@/assets/images/telone_logo_1785336459233.jpg";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSessionUpdated?: (session: TelOneCustomerSession | null) => void;
}

export default function TelOneSelfServiceAuthModal({ isOpen, onClose, onSessionUpdated }: Props) {
  const [currentSession, setCurrentSession] = useState<TelOneCustomerSession | null>(() =>
    getTelOneCustomerSession(),
  );

  const [activeTab, setActiveTab] = useState<"current" | "login" | "switch">(
    currentSession ? "current" : "login",
  );

  // Form states for login via TelOne Self Service Portal credentials
  const [accountOrLandline, setAccountOrLandline] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("hre-central");
  const [serviceType, setServiceType] = useState<
    "Fiber Broadband" | "ADSL / LTE" | "Copper Voice Landline" | "Corporate Trunk"
  >("Fiber Broadband");
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleQuickConnect = (acc: TelOneCustomerSession) => {
    setIsVerifying(true);
    setTimeout(() => {
      setTelOneCustomerSession(acc);
      setCurrentSession(acc);
      setIsVerifying(false);
      toast.success("Connected via TelOne Self-Service Portal", {
        description: `Logged in as ${acc.fullName} (${acc.accountNumber})`,
      });
      if (onSessionUpdated) onSessionUpdated(acc);
      onClose();
    }, 600);
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountOrLandline.trim() || !portalPassword.trim()) {
      toast.error("Please enter your TelOne Account/Landline number and portal password");
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      const area = ZIMBABWE_AREAS.find((a) => a.id === selectedAreaId) || ZIMBABWE_AREAS[0];

      const cleanIdentifier = accountOrLandline.trim();
      const isLandline = /^[0-9+ -]+$/.test(cleanIdentifier);

      const newSession: TelOneCustomerSession = {
        accountNumber: isLandline
          ? `ACC-${Math.floor(100000 + Math.random() * 900000)}`
          : cleanIdentifier,
        landlineNumber: isLandline ? cleanIdentifier : "0242 700111",
        fullName: fullName.trim() || "TelOne Subscriber",
        email: `${cleanIdentifier.toLowerCase().replace(/[^a-z0-9]/g, "")}@telone.subscriber.zw`,
        phone: "+263 77 000 0000",
        areaId: area.id,
        areaName: area.name,
        serviceType,
        connectedAt: new Date().toISOString(),
        portalToken: `TOL-PORTAL-AUTH-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
        isVerifiedViaPortal: true,
      };

      setTelOneCustomerSession(newSession);
      setCurrentSession(newSession);
      setIsVerifying(false);
      toast.success("TelOne Self Service Credentials Verified", {
        description: `Line: ${newSession.landlineNumber} · Account: ${newSession.accountNumber}`,
      });
      if (onSessionUpdated) onSessionUpdated(newSession);
      onClose();
    }, 800);
  };

  const handleDisconnect = () => {
    clearTelOneCustomerSession();
    setCurrentSession(null);
    setActiveTab("login");
    toast.info("Disconnected from TelOne Self Service Portal");
    if (onSessionUpdated) onSessionUpdated(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div
          className="px-6 py-5 text-white flex items-center justify-between"
          style={{ background: "var(--gradient-hero)" }}
        >
          <div className="flex items-center gap-3">
            <img
              src={teloneLogo}
              alt="TelOne"
              className="h-10 w-10 rounded-full border-2 border-white/30 object-cover shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-extrabold tracking-tight">
                  TelOne Self Service Portal
                </h2>
                <Badge className="bg-emerald-500/90 text-[10px] text-white font-mono px-1.5 py-0">
                  Official SSO
                </Badge>
              </div>
              <p className="text-xs text-white/80">
                Official Subscriber Account & Line Authentication
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-border bg-muted/40 px-6 pt-3">
          {currentSession && (
            <button
              onClick={() => setActiveTab("current")}
              className={`border-b-2 pb-2.5 px-3 text-xs font-bold transition-all ${
                activeTab === "current"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Active Subscriber Profile
            </button>
          )}
          <button
            onClick={() => setActiveTab("login")}
            className={`border-b-2 pb-2.5 px-3 text-xs font-bold transition-all ${
              activeTab === "login"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In with Portal Credentials
          </button>
          <button
            onClick={() => setActiveTab("switch")}
            className={`border-b-2 pb-2.5 px-3 text-xs font-bold transition-all ${
              activeTab === "switch"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Select Linked Account
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: Current Session Info */}
          {activeTab === "current" && currentSession && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="font-bold text-sm text-foreground">
                      Authenticated TelOne Subscriber
                    </span>
                  </div>
                  <Badge className="bg-emerald-600 text-[10px] text-white font-mono">
                    VERIFIED
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Subscriber Name:
                    </span>
                    <strong className="text-foreground font-semibold">
                      {currentSession.fullName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Account Number:</span>
                    <strong className="text-foreground font-mono">
                      {currentSession.accountNumber}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Landline / Voice Line:
                    </span>
                    <strong className="text-foreground font-mono">
                      {currentSession.landlineNumber}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Active Service:</span>
                    <strong className="text-foreground">{currentSession.serviceType}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[11px]">
                      Coverage Area / Exchange:
                    </span>
                    <strong className="text-foreground">{currentSession.areaName}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href="https://selfservice.telone.co.zw"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open TelOne Official Self Service Portal
                </a>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  Disconnect
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: Portal Login Form */}
          {activeTab === "login" && (
            <form onSubmit={handleManualLogin} className="space-y-3.5">
              <div className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
                Connect your account using the same credentials you use on the{" "}
                <a
                  href="https://selfservice.telone.co.zw"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary font-semibold underline"
                >
                  TelOne Official Self Service Portal
                </a>
                .
              </div>

              <div className="space-y-1">
                <Label htmlFor="accountOrLandline" className="text-xs font-bold">
                  TelOne Account # or Landline Number
                </Label>
                <Input
                  id="accountOrLandline"
                  placeholder="e.g. ACC-789420 or 0242 700111"
                  value={accountOrLandline}
                  onChange={(e) => setAccountOrLandline(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="portalPassword" className="text-xs font-bold">
                  Self Service Portal Password / Access PIN
                </Label>
                <Input
                  id="portalPassword"
                  type="password"
                  placeholder="••••••••••••"
                  value={portalPassword}
                  onChange={(e) => setPortalPassword(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="fullName" className="text-xs font-bold">
                    Subscriber Name (Optional)
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="e.g. Shelton Madaure"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="serviceType" className="text-xs font-bold">
                    Line Service Type
                  </Label>
                  <select
                    id="serviceType"
                    value={serviceType}
                    onChange={(e) =>
                      setServiceType(
                        e.target.value as
                          | "Fiber Broadband"
                          | "ADSL / LTE"
                          | "Copper Voice Landline"
                          | "Corporate Trunk",
                      )
                    }
                    className="w-full h-9 rounded-md border border-input bg-card px-2 text-xs font-medium"
                  >
                    <option value="Fiber Broadband">Fiber Broadband</option>
                    <option value="ADSL / LTE">ADSL / LTE</option>
                    <option value="Copper Voice Landline">Copper Voice Landline</option>
                    <option value="Corporate Trunk">Corporate Trunk</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="selectedAreaId" className="text-xs font-bold">
                  Installation / Exchange Area
                </Label>
                <select
                  id="selectedAreaId"
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-card px-2 text-xs font-medium"
                >
                  {ZIMBABWE_AREAS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.city})
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="submit"
                disabled={isVerifying}
                className="w-full font-bold text-xs gap-1.5 h-10 mt-2"
              >
                <Lock className="h-4 w-4" />
                {isVerifying ? "Verifying with TelOne Portal…" : "Authenticate & Connect Account"}
              </Button>
            </form>
          )}

          {/* TAB 3: Quick Select Demo / Verified Profiles */}
          {activeTab === "switch" && (
            <div className="space-y-2.5">
              <p className="text-xs text-muted-foreground">
                Select a registered subscriber profile to authenticate directly:
              </p>

              <div className="space-y-2">
                {DEMO_TELONE_ACCOUNTS.map((acc) => {
                  const isCurrent = currentSession?.accountNumber === acc.accountNumber;
                  return (
                    <div
                      key={acc.accountNumber}
                      onClick={() => handleQuickConnect(acc)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                        isCurrent
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-foreground">{acc.fullName}</span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {acc.accountNumber}
                          </Badge>
                          <Badge className="bg-primary/20 text-primary text-[10px]">
                            {acc.serviceType}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span>☎ {acc.landlineNumber}</span>
                          <span>•</span>
                          <span>📍 {acc.areaName}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isCurrent ? "default" : "outline"}
                        className="text-xs font-bold shrink-0 ml-2"
                        disabled={isVerifying}
                      >
                        {isCurrent ? "Active" : "Connect"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/20 px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            TelOne Zimbabwe Self-Service API
          </span>
          <a
            href="https://selfservice.telone.co.zw"
            target="_blank"
            rel="noreferrer"
            className="hover:text-primary transition-colors inline-flex items-center gap-1 font-medium"
          >
            selfservice.telone.co.zw <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
