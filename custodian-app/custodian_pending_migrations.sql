-- ============================================================
-- CUSTODIAN — SAFE PENDING MIGRATIONS (For Existing Databases)
-- ============================================================
-- Paste this into: Supabase Dashboard → SQL Editor → New query → Run
-- Uses 'IF NOT EXISTS' and 'ON CONFLICT DO NOTHING' everywhere,
-- so it will NEVER throw "already exists" errors.
-- ============================================================

-- ---------- 1. PROFILES COLUMNS & CONSTRAINTS (Vault, Notifications, Billing) ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS vault_salt text,
  ADD COLUMN IF NOT EXISTS vault_check text,
  ADD COLUMN IF NOT EXISTS notify_renewal_email boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_renewal_days int DEFAULT 7,
  ADD COLUMN IF NOT EXISTS lemonsqueezy_customer_id text,
  ADD COLUMN IF NOT EXISTS lemonsqueezy_subscription_id text,
  ADD COLUMN IF NOT EXISTS revenuecat_customer_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS storage_used_bytes bigint NOT NULL DEFAULT 0;

-- Update plan check constraint to permit 'founder' tier
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro', 'team', 'founder'));

-- ---------- 2. SOFT DELETES & RECYCLE BIN ----------
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null,
  ADD COLUMN IF NOT EXISTS details_blob text DEFAULT null;

ALTER TABLE public.credentials
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;

-- ---------- 3. WORKSPACE / STORE ROOM ITEMS TABLE ----------
CREATE TABLE IF NOT EXISTS public.workspace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'note' CHECK (type IN ('template', 'guideline', 'workflow', 'note')),
  title text NOT NULL,
  tags text[] DEFAULT '{}',
  text_content text,
  file_path text,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own workspace items' AND tablename = 'workspace_items') THEN
    CREATE POLICY "Users can view their own workspace items" ON public.workspace_items FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own workspace items' AND tablename = 'workspace_items') THEN
    CREATE POLICY "Users can create their own workspace items" ON public.workspace_items FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own workspace items' AND tablename = 'workspace_items') THEN
    CREATE POLICY "Users can update their own workspace items" ON public.workspace_items FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own workspace items' AND tablename = 'workspace_items') THEN
    CREATE POLICY "Users can delete their own workspace items" ON public.workspace_items FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- ---------- 4. STORAGE BUCKET: workspace-files ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-files', 'workspace-files', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read their own workspace files' AND tablename = 'objects') THEN
    CREATE POLICY "Users can read their own workspace files" ON storage.objects FOR SELECT USING (bucket_id = 'workspace-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own workspace files' AND tablename = 'objects') THEN
    CREATE POLICY "Users can upload their own workspace files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'workspace-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own workspace files' AND tablename = 'objects') THEN
    CREATE POLICY "Users can update their own workspace files" ON storage.objects FOR UPDATE USING (bucket_id = 'workspace-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own workspace files' AND tablename = 'objects') THEN
    CREATE POLICY "Users can delete their own workspace files" ON storage.objects FOR DELETE USING (bucket_id = 'workspace-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- ---------- 5. USER ACCOUNT DELETION (SECURITY DEFINER) ----------
-- Allows an authenticated user to permanently delete their own record in auth.users
-- This automatically cascades to delete their profile, clients, projects, credentials, and workspace items.
-- 🛡️ Includes Founder Immunity Shield to prevent deletion of the Founder VIP account.
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  current_user_id uuid;
  user_email text;
  user_plan text;
  user_role text;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 🛡️ FOUNDER IMMUNITY SHIELD (Dual Check: Email & Profile Tier)
  SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
  SELECT plan, role INTO user_plan, user_role FROM public.profiles WHERE id = current_user_id;
  
  IF LOWER(COALESCE(user_email, '')) = 'ygpksr456@gmail.com' 
     OR user_plan = 'founder' 
     OR user_role = 'founder' THEN
    RAISE EXCEPTION 'Action Forbidden: Founder VIP account is protected and cannot be deleted.';
  END IF;

  -- 1. Clean up user storage files to prevent orphan storage costs
  DELETE FROM storage.objects 
  WHERE bucket_id = 'workspace-files' 
    AND (owner = current_user_id OR (storage.foldername(name))[1] = current_user_id::text);

  -- 2. Delete user from auth.users (cascades to profiles, clients, secrets, projects, workspace_items)
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- ---------- 6. ADMIN AUDIT LOGS TABLE ----------
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'member';

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email text NOT NULL,
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_email text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Founders can view audit logs' AND tablename = 'admin_audit_logs') THEN
    CREATE POLICY "Founders can view audit logs" ON public.admin_audit_logs 
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.profiles p 
          WHERE p.id = auth.uid() AND (p.plan = 'founder' OR p.email = 'ygpksr456@gmail.com')
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Founders can create audit logs' AND tablename = 'admin_audit_logs') THEN
    CREATE POLICY "Founders can create audit logs" ON public.admin_audit_logs 
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p 
          WHERE p.id = auth.uid() AND (p.plan = 'founder' OR p.email = 'ygpksr456@gmail.com')
        )
      );
  END IF;
END $$;


