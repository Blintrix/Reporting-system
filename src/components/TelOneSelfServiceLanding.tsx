import React, { useState } from "react";
import {
  TelOneCustomerSession,
  DEMO_TELONE_ACCOUNTS,
  loginTelOneSubscriber,
} from "@/lib/teloneCustomerAuth";
import { ZIMBABWE_AREAS } from "@/lib/zimbabweAreas";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  Eye,
  EyeOff,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageSquareWarning,
  MessageCircle,
  ShoppingCart,
  User,
  ShieldCheck,
  Zap,
  Phone,
  CheckCircle2,
  Lock,
  ArrowRight,
  Wifi,
  Sparkles,
} from "lucide-react";
import teloneLogo from "@/assets/images/telone_logo_1785336459233.jpg";

interface Props {
  onSignedIn: (session: TelOneCustomerSession) => void;
}

export default function TelOneSelfServiceLanding({ onSignedIn }: Props) {
  // Sign in form state
  const [landlineNumber, setLandlineNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Top bar location state
  const [selectedCity, setSelectedCity] = useState("Harare");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);

  // Right sidebar recharge states
  const [currencyTab, setCurrencyTab] = useState<"USD" | "ZWG">("USD");
  const [rechargeNumber, setRechargeNumber] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [voucherPhone, setVoucherPhone] = useState("0242 ");
  const [voucherPin, setVoucherPin] = useState("");
  const [isRecharging, setIsRecharging] = useState(false);

  // Sign up & Reset password modal triggers
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [resetEmailOrNumber, setResetEmailOrNumber] = useState("");
  const [newSubscriberName, setNewSubscriberName] = useState("");
  const [newSubscriberNumber, setNewSubscriberNumber] = useState("");
  const [newSubscriberPassword, setNewSubscriberPassword] = useState("");

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!landlineNumber.trim()) {
      toast.error("Please enter your TelOne/Landline number");
      return;
    }
    if (!password.trim()) {
      toast.error("Please enter your TelOne password");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const area =
        ZIMBABWE_AREAS.find((a) => a.name.toLowerCase().includes(selectedCity.toLowerCase())) ||
        ZIMBABWE_AREAS[0];

      const session = loginTelOneSubscriber(landlineNumber, password, area.id, "Shelton Madaure");

      setIsSubmitting(false);
      toast.success("Signed in successfully!", {
        description: `Welcome back, ${session.fullName} (Line: ${session.landlineNumber})`,
      });
      onSignedIn(session);
    }, 600);
  };

  const handleQuickLogin = (demoAcc: TelOneCustomerSession) => {
    setIsSubmitting(true);
    setTimeout(() => {
      const session = loginTelOneSubscriber(
        demoAcc.landlineNumber,
        "demo123",
        demoAcc.areaId,
        demoAcc.fullName,
      );
      setIsSubmitting(false);
      toast.success("Signed in successfully!", {
        description: `Logged in as ${session.fullName} · ${session.accountNumber}`,
      });
      onSignedIn(session);
    }, 400);
  };

  const handleRechargePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rechargeNumber.trim()) {
      toast.error("Please enter your TelOne number for recharge");
      return;
    }
    if (!selectedProduct) {
      toast.error("Please select a product package");
      return;
    }
    setIsRecharging(true);
    setTimeout(() => {
      setIsRecharging(false);
      toast.success(`Direct Recharge Initiated for ${rechargeNumber}`, {
        description: `Package: ${selectedProduct} (${currencyTab}). Processing payment...`,
      });
    }, 800);
  };

  const handleVoucherRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherPhone.trim() || !voucherPin.trim()) {
      toast.error("Please enter your phone number and recharge PIN");
      return;
    }
    setIsRecharging(true);
    setTimeout(() => {
      setIsRecharging(false);
      toast.success("Voucher Recharge Successful!", {
        description: `Account credited for line ${voucherPhone}`,
      });
      setVoucherPin("");
    }, 800);
  };

  return (
    <div className="min-h-[85vh] flex flex-col bg-[#f8fafc] text-foreground font-sans rounded-2xl overflow-hidden border border-border shadow-md">
      {/* Top TelOne Navigation Bar matching the image */}
      <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-2.5 flex items-center justify-between shadow-xs sticky top-0 z-20">
        <div className="flex items-center gap-4 lg:gap-7">
          {/* TelOne Logo */}
          <div className="flex items-center gap-2">
            <img
              src={teloneLogo}
              alt="TelOne"
              className="h-9 w-9 rounded-full object-cover shadow-xs"
              referrerPolicy="no-referrer"
            />
            <div className="font-extrabold text-2xl tracking-tight text-[#0066b3] flex items-center">
              Tel<span className="text-[#0088cc]">One</span>
            </div>
          </div>

          {/* Location Selector Pill */}
          <div className="relative">
            <button
              onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              <span>{selectedCity}</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>

            {isCityDropdownOpen && (
              <div className="absolute left-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-30 text-xs">
                {["Harare", "Bulawayo", "Mutare", "Gweru", "Chitungwiza", "Masvingo", "Kwekwe"].map(
                  (city) => (
                    <button
                      key={city}
                      onClick={() => {
                        setSelectedCity(city);
                        setIsCityDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-blue-50 transition-colors ${
                        selectedCity === city
                          ? "text-[#0066b3] font-bold bg-blue-50/50"
                          : "text-slate-700"
                      }`}
                    >
                      {city}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-700">
            <span className="cursor-pointer hover:text-[#0066b3] transition-colors">Home</span>
            <span className="cursor-pointer hover:text-[#0066b3] transition-colors">Store</span>
            <span className="cursor-pointer hover:text-[#0066b3] transition-colors">
              Categories
            </span>
            <span className="bg-[#1a73e8] text-white px-3.5 py-1 rounded-md font-semibold text-xs shadow-xs">
              Self Service
            </span>
            <span className="cursor-pointer hover:text-[#0066b3] transition-colors flex items-center gap-1">
              Starlink
            </span>
            <span className="cursor-pointer hover:text-[#0066b3] transition-colors">
              Service Check
            </span>
          </nav>
        </div>

        {/* Right side cart & profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => toast.info("TelOne Cart is currently empty (0 items)")}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors relative"
            title="Cart"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-[#1a73e8] text-white text-[10px] h-4 w-4 rounded-full flex items-center justify-center font-bold">
              0
            </span>
          </button>
          <button
            onClick={() => toast.info("Please enter your credentials below to sign in")}
            className="flex items-center gap-1.5 text-slate-700 hover:text-[#0066b3] text-xs font-semibold p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <User className="h-5 w-5 text-slate-600" />
          </button>
        </div>
      </header>

      {/* Main split grid: Left Hero & Center Sign-In Card, Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 relative">
        {/* Left Section (~7.5 cols): Blurred background container with centered Sign in card */}
        <div className="lg:col-span-8 relative flex items-center justify-center p-6 sm:p-10 min-h-[580px] overflow-hidden bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#0f172a]">
          {/* Subtle background graphics & TelOne watermark */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
            <span className="text-9xl font-black text-white tracking-widest uppercase">TelOne</span>
          </div>

          {/* Central Sign in Card exactly matching the image */}
          <div className="relative z-10 w-full max-w-[360px] bg-white rounded-2xl p-7 shadow-2xl border border-white/20 text-slate-800 animate-in fade-in zoom-in-95 duration-300">
            <h1 className="text-2xl font-bold text-slate-900 mb-5">Sign in</h1>

            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Field 1: TelOne/Landline Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  TelOne/Landline Number
                </label>
                <input
                  type="text"
                  placeholder="242 123 456"
                  value={landlineNumber}
                  onChange={(e) => setLandlineNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 focus:border-[#1a73e8] transition-all"
                  required
                />
              </div>

              {/* Field 2: TelOne Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">TelOne Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder=""
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 focus:border-[#1a73e8] transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#0d47a1] text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>

              {/* Links below button */}
              <div className="pt-2 text-center text-xs text-slate-600 space-y-1.5">
                <div>
                  Forgot password?{" "}
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="text-[#1a73e8] hover:underline font-medium cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
                <div>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setShowSignUpModal(true)}
                    className="text-[#1a73e8] hover:underline font-medium cursor-pointer"
                  >
                    Sign up
                  </button>
                </div>
              </div>
            </form>

            {/* 1-Click Quick Demo Sign In Chips */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center justify-between">
                <span>Quick Demo Accounts:</span>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                  1-Click
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {DEMO_TELONE_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.accountNumber}
                    onClick={() => handleQuickLogin(acc)}
                    className="text-left p-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-all text-[11px]"
                    title={`Sign in as ${acc.fullName}`}
                  >
                    <div className="font-semibold text-slate-800 truncate">{acc.fullName}</div>
                    <div className="text-[10px] font-mono text-slate-500">{acc.landlineNumber}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Floating Report a Complaint button on bottom left matching image */}
          <div className="absolute bottom-4 left-4 z-20">
            <Link
              to="/report"
              className="inline-flex items-center gap-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white px-4 py-2.5 rounded-lg shadow-lg font-bold text-xs transition-all hover:scale-105"
            >
              <MessageSquareWarning className="h-4 w-4" />
              Report a Complaint / Fault
            </Link>
          </div>

          {/* Floating Chat Support widget on bottom right matching image */}
          <div className="absolute bottom-4 right-4 z-20">
            <button
              onClick={() =>
                toast.info("TelOne Live Support Assistant", {
                  description:
                    "Contact toll-free 950 or WhatsApp +263 71 879 9999 for instant assistance.",
                })
              }
              className="h-10 w-10 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shadow-lg hover:bg-[#1557b0] transition-all hover:scale-110"
              title="Customer Support Chat"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Right Section (~4.5 cols): Direct Recharge USD & Voucher Recharge USD */}
        <div className="lg:col-span-4 bg-white border-l border-slate-200 p-5 sm:p-6 space-y-6 flex flex-col justify-start">
          {/* Tabs: < USD Recharge | ZWG Recharge > */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-xs font-semibold">
            <button
              onClick={() => setCurrencyTab("USD")}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-6">
              <button
                onClick={() => setCurrencyTab("USD")}
                className={`pb-1 transition-colors border-b-2 font-bold ${
                  currencyTab === "USD"
                    ? "border-[#1a73e8] text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                USD Recharge
              </button>
              <button
                onClick={() => setCurrencyTab("ZWG")}
                className={`pb-1 transition-colors border-b-2 font-bold ${
                  currencyTab === "ZWG"
                    ? "border-[#1a73e8] text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                ZWG Recharge
              </button>
            </div>

            <button
              onClick={() => setCurrencyTab("ZWG")}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Section 1: Direct Recharge USD */}
          <div className="space-y-3.5">
            <h2 className="text-base font-bold text-slate-900">Direct Recharge {currencyTab}</h2>

            {/* Let's Find the Right Package for You Box */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3.5 space-y-2.5 text-xs">
              <div className="font-semibold text-blue-800">
                Let's Find the Right Package for You
              </div>
              <p className="text-blue-900/80 leading-relaxed text-[11px]">
                Enter your TelOne number (ADSL, LTE, or Fiber) to view available {currencyTab}{" "}
                packages for your connection.
              </p>
              <input
                type="text"
                placeholder="Your TelOne number here"
                value={rechargeNumber}
                onChange={(e) => setRechargeNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-md border border-blue-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (!rechargeNumber) {
                    toast.error("Please enter your TelOne number first");
                  } else {
                    toast.success(`Checking compatible packages for ${rechargeNumber}`);
                    setSelectedProduct("Fiber Home Unlimited ($45)");
                  }
                }}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-600 font-semibold py-1.5 px-3 rounded-md text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                Next <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {/* Product selection */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Product</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100/70 rounded-md border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
              >
                <option value="">Select product package...</option>
                <option value="Blaze LTE Monthly 25GB ($15)">
                  Blaze LTE Monthly 25GB ($15.00)
                </option>
                <option value="Fiber Home Unlimited ($45)">Fiber Home Unlimited ($45.00)</option>
                <option value="Fiber Business Premium ($89)">
                  Fiber Business Premium 100Mbps ($89.00)
                </option>
                <option value="Voice Prepaid Bundle 100 Mins ($5)">
                  Voice Prepaid Landline 100 Mins ($5.00)
                </option>
                <option value="Voice Unlimited Local Calls ($12)">
                  Voice Unlimited Local Landline ($12.00)
                </option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleRechargePurchase}
              disabled={isRecharging}
              className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold py-2 px-4 rounded-md text-xs shadow-xs transition-colors cursor-pointer"
            >
              {isRecharging ? "Processing..." : "Purchase"}
            </button>
          </div>

          <hr className="border-slate-200" />

          {/* Section 2: Voucher Recharge USD */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Voucher Recharge {currencyTab}</h2>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                TelOne Phone Number
              </label>
              <input
                type="text"
                value={voucherPhone}
                onChange={(e) => setVoucherPhone(e.target.value)}
                placeholder="0242 123456"
                className="w-full px-3 py-2 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Recharge Pin</label>
              <input
                type="text"
                placeholder="Type here"
                value={voucherPin}
                onChange={(e) => setVoucherPin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
              />
            </div>

            <button
              type="button"
              onClick={handleVoucherRecharge}
              disabled={isRecharging}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-4 rounded-md text-xs shadow-xs transition-colors cursor-pointer"
            >
              Recharge Voucher
            </button>
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Reset TelOne Password</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Enter your TelOne account number or registered phone number to receive an SMS / email
              reset code.
            </p>
            <input
              type="text"
              placeholder="Landline / Phone / Account Number"
              value={resetEmailOrNumber}
              onChange={(e) => setResetEmailOrNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!resetEmailOrNumber) {
                    toast.error("Please enter your account or phone number");
                    return;
                  }
                  toast.success("Password reset instructions sent via SMS / Email");
                  setShowResetModal(false);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-md"
              >
                Send Reset Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Up Modal */}
      {showSignUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create TelOne Subscriber Account</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Register your landline or broadband line for voice fault self-service and recharge
              management.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Subscriber Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shelton Madaure"
                  value={newSubscriberName}
                  onChange={(e) => setNewSubscriberName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  TelOne Landline / Account Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0242 700111"
                  value={newSubscriberNumber}
                  onChange={(e) => setNewSubscriberNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Create Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newSubscriberPassword}
                  onChange={(e) => setNewSubscriberPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSignUpModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newSubscriberNumber || !newSubscriberName) {
                    toast.error("Please fill in your details");
                    return;
                  }
                  const session = loginTelOneSubscriber(
                    newSubscriberNumber,
                    newSubscriberPassword || "123456",
                    "hre-central",
                    newSubscriberName,
                  );
                  toast.success("Account created and connected!");
                  setShowSignUpModal(false);
                  onSignedIn(session);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-md"
              >
                Register & Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
