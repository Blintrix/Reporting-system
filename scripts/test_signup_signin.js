#!/usr/bin/env node
// Test script to sign up and sign in a user using the anon key.
// Requires SUPABASE_URL and SUPABASE_ANON_KEY env vars.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment. Aborting.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const email = `test-${Date.now()}@example.com`;
  const password = "Test#12345";

  try {
    console.log("Signing up", email);
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr) {
      console.error("Sign up error:", signUpErr.message);
    } else {
      console.log("Sign up response:", signUpData);
    }

    console.log("Signing in", email);
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) {
      console.error("Sign in error:", signInErr.message);
    } else {
      console.log("Sign in success. User id:", signInData.user?.id);
    }
  } catch (e) {
    console.error("Test script error:", e.message || e);
  }

  process.exit(0);
}

main();
