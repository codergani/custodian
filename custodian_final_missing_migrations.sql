-- ============================================================
-- CUSTODIAN — FINAL REMAINING SETUP (Run in Supabase SQL Editor)
-- ============================================================
-- Paste this script into:
-- Supabase Dashboard → SQL Editor → New query → Run
--
-- This script is 100% idempotent (safe to run multiple times).
-- It only adds the few remaining columns, storage bucket, and
-- admin function fix.
-- ============================================================

-- ---------- 1. CLIENTS COLUMNS (Client Status & Ghosting Radar) ----------
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS ghosted_at timestamptz DEFAULT null,
  ADD COLUMN IF NOT EXISTS ghost_notes text DEFAULT null;

-- ---------- 2. SHARED SECRETS ALIAS COLUMNS (Zero-Knowledge Sharing) ----------
ALTER TABLE public.shared_secrets
  ADD COLUMN IF NOT EXISTS secret_ciphertext text,
  ADD COLUMN IF NOT EXISTS sender_public_key_snapshot text;

-- ---------- 3. PROFILES PLAN CONSTRAINT (Support Founder VIP Tier) ----------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check 
  CHECK (plan IN ('free', 'pro', 'team', 'founder'));

-- ---------- 4. STORAGE BUCKET: workspace-files ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-files', 'workspace-files', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read their own workspace files' AND tablename = 'objects') THEN
    CREATE POLICY "Users can read their own workspace files" ON storage.objects 
      FOR SELECT USING (bucket_id = 'workspace-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own workspace files' AND tablename = 'objects') THEN
    CREATE POLICY "Users can upload their own workspace files" ON storage.objects 
      FOR INSERT WITH CHECK (bucket_id = 'workspace-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own workspace files' AND tablename = 'objects') THEN
    CREATE POLICY "Users can update their own workspace files" ON storage.objects 
      FOR UPDATE USING (bucket_id = 'workspace-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own workspace files' AND tablename = 'objects') THEN
    CREATE POLICY "Users can delete their own workspace files" ON storage.objects 
      FOR DELETE USING (bucket_id = 'workspace-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- ---------- 5. ADMIN GET ALL USERS (Fix Ambiguous Column Reference) ----------
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  plan text,
  role text,
  created_at timestamptz,
  storage_used_bytes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF (COALESCE(auth.jwt() ->> 'email', '') != 'ygpksr456@gmail.com') AND
     NOT EXISTS (
       SELECT 1 FROM public.profiles prof
       WHERE prof.id = auth.uid() AND (prof.plan = 'founder' OR prof.role = 'founder' OR prof.role = 'admin')
     ) THEN
    RAISE EXCEPTION 'Access Denied: Founder privileges required.';
  END IF;

  RETURN QUERY
  SELECT p.id, p.email, p.plan, p.role, p.created_at, p.storage_used_bytes
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;
