import { createClient } from "@supabase/supabase-js";

// Browser/anon client. Reads/writes go through Postgres Row Level Security
// (see supabase/schema.sql). Server-side mutations that need elevated rights
// should use a separate service-role client, never this one.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Don't throw at import time so the app still builds/runs with seed data only.
  console.warn(
    "Supabase env vars missing — falling back to local seed data. " +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
  );
}

export const supabase =
  url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = Boolean(url && anonKey);
