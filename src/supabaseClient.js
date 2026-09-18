import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    "Missing Supabase config. Copy .env.example to .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project's Settings → API page."
  );
}

const isNativePlatform = typeof window !== "undefined" && Capacitor.isNativePlatform();

export const supabase = createClient(url, anonKey, {
  auth: {
    // On native mobile, deep links are handled via @capacitor/app listener to avoid URL parsing conflicts
    detectSessionInUrl: !isNativePlatform,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Detect whether this build is running inside Capacitor (mobile) or a plain browser (web).
// Used to tag signups with the right platform for your dashboard.
export function detectPlatform() {
  return isNativePlatform ? "mobile" : "web";
}
