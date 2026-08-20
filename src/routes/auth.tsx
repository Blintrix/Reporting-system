import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { grantSelfRole } from "@/lib/voxtel.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import teloneLogo from "@/assets/images/telone_logo_1785336459233.jpg";

export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Sign in — VoXtEl" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const grantRoleFn = useServerFn(grantSelfRole);
  const [email, setEmail] = useState("");
  const [useTechId, setUseTechId] = useState(false);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"reporter" | "technician" | "admin">("reporter");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      const authEmail = useTechId ? `${email}@telone.co.zw` : email;
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password,
          options: {
            data: { display_name: name || authEmail.split("@")[0], role },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        // Persist role in app table as well
        try {
          await grantRoleFn({ data: { role } });
        } catch (e) {
          // non-fatal: role persistence failed
          console.warn("grantRole failed:", e);
        }
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err) {
      const msg = (err as Error).message;
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  // demo sign-in removed — users must provide their own credentials

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: "var(--gradient-hero)" }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-7 shadow-xl"
      >
        <div className="text-center space-y-1">
          <img
            src={teloneLogo}
            alt="TelOne Logo"
            className="mx-auto mb-2 h-16 w-16 rounded-full object-cover shadow-md border-2 border-white/20"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-2xl font-extrabold text-primary tracking-tight">
            Tel<span className="text-accent">One</span> VoXtEl
          </h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Voice Fault Reporting Portal
          </p>
          <p className="pt-2 text-sm text-foreground font-medium">
            {mode === "signin" ? "Sign in to access portal" : "Create your user account"}
          </p>
        </div>

        {mode === "signup" && (
          <div className="space-y-1">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tendai Moyo"
            />
          </div>
        )}

        {mode === "signup" && (
          <div className="space-y-1">
            <Label htmlFor="role">Account Type</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "reporter" | "technician" | "admin")}
              className="w-full rounded-md border border-input bg-transparent px-2 py-2 text-sm"
            >
              <option value="reporter">Customer / Reporter</option>
              <option value="technician">Technician</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="email">{useTechId ? "Technician Code / ID" : "Email Address"}</Label>
            <div className="text-xs">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useTechId}
                  onChange={(e) => setUseTechId(e.target.checked)}
                />
                <span className="text-muted-foreground">Technician Sign-in</span>
              </label>
            </div>
          </div>
          <Input
            id="email"
            type={useTechId ? "text" : "email"}
            required
            placeholder={useTechId ? "e.g. TECH-HRE-01" : "name@telone.co.zw"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {useTechId && (
            <p className="text-[11px] text-muted-foreground">
              Technicians must be designated on the Admin 3-day duty logbook roster for the active
              week.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "signup" && (
            <p className="text-[11px] text-muted-foreground">Must be at least 6 characters long.</p>
          )}
        </div>

        {errorMsg && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
            {errorMsg}
          </div>
        )}

        <Button type="submit" className="w-full font-bold shadow-md" disabled={busy}>
          {busy ? "Authenticating…" : mode === "signin" ? "Sign In" : "Create Account"}
        </Button>

        {/* Demo presets removed; users must enter credentials */}

        <button
          type="button"
          className="w-full text-center text-xs text-muted-foreground hover:underline pt-1"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
