#!/usr/bin/env node
// Creates example users in Supabase using the service role key.
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. Aborting.");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const examples = [
  {
    id: "tech-001",
    email: "tech-001@telone.co.zw",
    password: "Tech#001Pass",
    role: "technician",
    display_name: "Tech One",
  },
  {
    id: "tech-002",
    email: "tech-002@telone.co.zw",
    password: "Tech#002Pass",
    role: "technician",
    display_name: "Tech Two",
  },
  {
    id: "admin-001",
    email: "admin-001@telone.co.zw",
    password: "Admin#001Pass",
    role: "admin",
    display_name: "Admin One",
  },
  {
    id: "customer-001",
    email: "customer-001@telone.co.zw",
    password: "Cust#001Pass",
    role: "reporter",
    display_name: "Customer One",
  },
];

async function main() {
  for (const u of examples) {
    try {
      console.log("Creating user:", u.email);
      const res = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { display_name: u.display_name },
      });

      if (res.error) {
        // If user already exists, continue
        console.warn("createUser error:", res.error.message);
      } else {
        console.log("Created user id:", res.data.id);
      }

      // Insert into user_roles table
      const roleInsert = await supabaseAdmin.from("user_roles").insert({
        id: crypto.randomUUID(),
        user_id: res.data?.id || u.id,
        role: u.role,
      });

      if (roleInsert.error) {
        console.warn("user_roles insert error:", roleInsert.error.message);
      } else {
        console.log("Inserted role for", u.email);
      }
    } catch (e) {
      console.error("Error creating user", u.email, e.message || e);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
