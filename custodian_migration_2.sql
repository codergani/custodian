-- ============================================================
-- CUSTODIAN — Migration 2: Optional Notification Preferences
-- Only run this if you want email renewal settings saved to Supabase profiles.
-- (The app already saves this in localStorage, so running this is purely optional.)
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_renewal_email boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_renewal_days int DEFAULT 7;
