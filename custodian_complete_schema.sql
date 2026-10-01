-- ============================================================
-- CUSTODIAN — COMPLETE MASTER SCHEMA (Migrations 1 to 4)
-- Consolidated full database setup for new environments & reference.
-- Includes: Base Schema, Vault Salt/Check, Trash & Soft Deletes,
-- Team Invites, Project Deadlines & Specs, Workspace Items,
-- Supabase Storage Bucket ('workspace-files'), and Storage Quotas.
-- ============================================================


-- ============================================================
-- PART 1: BASE SCHEMA (Migration 1)
-- ============================================================

-- ============================================================
-- CUSTODIAN — Supabase schema
-- Paste this into: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ---------- 1. PROFILES ----------
-- One row per signed-up user. platform tells us web vs mobile for your dashboard.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  platform text not null default 'web' check (platform in ('web', 'mobile')),
  plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
  revenuecat_customer_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, platform)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'platform', 'web'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------- 2. CLIENTS ----------
-- "Client" here means the user's own Client entities (companies/people they manage credentials for),
-- not a Supabase "client app". owner_id = the user who created it.
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  pin_hash text, -- hashed PIN for reveal-gating, never store PIN plaintext
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

-- ---------- 3. CLIENT_MEMBERS (Team tier: shared vault access) ----------
create table public.client_members (
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  added_at timestamptz not null default now(),
  primary key (client_id, user_id)
);

alter table public.client_members enable row level security;

-- Helper function: can this user access this client (owner or invited member)?
create or replace function public.can_access_client(target_client_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.clients c
    where c.id = target_client_id and c.owner_id = auth.uid()
  ) or exists (
    select 1 from public.client_members cm
    where cm.client_id = target_client_id and cm.user_id = auth.uid()
  );
$$ language sql security definer stable;

-- Clients policies (now that the helper function exists)
create policy "Access own or shared clients"
  on public.clients for select
  using (public.can_access_client(id));

create policy "Create own clients"
  on public.clients for insert
  with check (owner_id = auth.uid());

create policy "Only owner can update client"
  on public.clients for update
  using (owner_id = auth.uid());

create policy "Only owner can delete client"
  on public.clients for delete
  using (owner_id = auth.uid());

-- client_members policies
create policy "View members of accessible clients"
  on public.client_members for select
  using (public.can_access_client(client_id));

create policy "Only client owner can add members"
  on public.client_members for insert
  with check (
    exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.plan = 'team') -- Team tier only
  );

create policy "Only client owner can remove members"
  on public.client_members for delete
  using (exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid()));


-- ---------- 4. PROJECTS ----------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Access projects under accessible clients"
  on public.projects for select
  using (public.can_access_client(client_id));

create policy "Create projects under own/shared clients"
  on public.projects for insert
  with check (public.can_access_client(client_id));

create policy "Update projects under own/shared clients"
  on public.projects for update
  using (public.can_access_client(client_id));

create policy "Delete projects under own/shared clients"
  on public.projects for delete
  using (public.can_access_client(client_id));


-- ---------- 5. CREDENTIALS ----------
-- encrypted_blob holds the AES-GCM ciphertext (iv + ct), same format your app already produces.
-- Supabase never sees plaintext — encryption/decryption happens entirely client-side.
create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  encrypted_blob text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.credentials enable row level security;

create policy "Access credentials under accessible projects"
  on public.credentials for select
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id and public.can_access_client(pr.client_id)
    )
  );

create policy "Create credentials under accessible projects"
  on public.credentials for insert
  with check (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id and public.can_access_client(pr.client_id)
    )
  );

create policy "Update credentials under accessible projects"
  on public.credentials for update
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id and public.can_access_client(pr.client_id)
    )
  );

create policy "Delete credentials under accessible projects"
  on public.credentials for delete
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id and public.can_access_client(pr.client_id)
    )
  );


-- ---------- 6. FREE TIER ENFORCEMENT (server-side, not just UI) ----------
-- Blocks a 3rd client from being created if the owner is still on the free plan.
-- This matters because client-side checks alone can always be bypassed.
create or replace function public.enforce_free_client_limit()
returns trigger as $$
declare
  user_plan text;
  client_count int;
begin
  select plan into user_plan from public.profiles where id = new.owner_id;
  if user_plan = 'free' then
    select count(*) into client_count from public.clients where owner_id = new.owner_id;
    if client_count >= 2 then
      raise exception 'Free plan is limited to 2 clients. Upgrade to Pro for unlimited clients.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger check_free_client_limit
  before insert on public.clients
  for each row execute function public.enforce_free_client_limit();


-- ---------- 7. updated_at auto-touch for credentials ----------
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger credentials_touch_updated_at
  before update on public.credentials
  for each row execute function public.touch_updated_at();


-- ============================================================
-- Notes:
-- - "platform" on profiles is set from user_metadata at signup (pass
--   { data: { platform: 'mobile' } } in your Capacitor build's signUp call,
--   leave it default 'web' for the website build).
-- - Your admin dashboard query is just:
--     select platform, count(*) from profiles group by platform;
--   (run this via the service_role key on a server-side admin route only —
--   never expose service_role in client code.)
-- - "plan" updates should be driven by RevenueCat webhooks hitting a
--   Supabase Edge Function, which then updates profiles.plan — not the
--   client app directly, so a user can't just edit their own plan value.
-- ============================================================



-- ============================================================
-- PART 2: VAULT MASTER PASSWORD SALT & CHECK (Migration 2)
-- ============================================================

-- Run this AFTER custodian_schema.sql — adds support for a vault master
-- password that's separate from the account login password.
-- vault_salt: not secret, needed to re-derive the encryption key on each login.
-- vault_check: a known value encrypted with that key, used only to verify
-- the user typed the right master password (never reveals anything sensitive).

alter table public.profiles
  add column vault_salt text,
  add column vault_check text;



-- ============================================================
-- PART 3: TRASH RECOVERY, TEAM INVITES & SPECS (Migration 3)
-- ============================================================

-- ============================================================
-- CUSTODIAN — Migration 3: Trash Recovery, Team Invites, & Project Specs
-- Paste this into: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ---------- 1. RECYCLE BIN / 30-DAY TRASH RECOVERY ----------
-- Add deleted_at timestamps for soft-deletion
alter table public.clients
  add column if not exists deleted_at timestamptz default null;

alter table public.projects
  add column if not exists deleted_at timestamptz default null;

alter table public.credentials
  add column if not exists deleted_at timestamptz default null;

-- Helper function to automatically purge items older than 30 days
create or replace function public.purge_expired_trash()
returns void as $$
begin
  -- Permanently delete credentials trashed over 30 days ago
  delete from public.credentials
  where deleted_at is not null and deleted_at < now() - interval '30 days';

  -- Permanently delete projects trashed over 30 days ago (cascades to child credentials)
  delete from public.projects
  where deleted_at is not null and deleted_at < now() - interval '30 days';

  -- Permanently delete clients trashed over 30 days ago (cascades to child projects & credentials)
  delete from public.clients
  where deleted_at is not null and deleted_at < now() - interval '30 days';
end;
$$ language plpgsql security definer;


-- ---------- 2. TEAM INVITES & ROLES (Team Plan) ----------
-- Support 'restricted' role for skeleton-only / masked value team access
alter table public.client_members
  drop constraint if exists client_members_role_check;

alter table public.client_members
  add constraint client_members_role_check
  check (role in ('owner', 'member', 'restricted'));

-- Pending invites table
create table if not exists public.client_invites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('member', 'restricted')),
  created_at timestamptz not null default now(),
  unique (client_id, email)
);

alter table public.client_invites enable row level security;

create policy "Client owners and members can view invites"
  on public.client_invites for select
  using (public.can_access_client(client_id));

create policy "Client owners can insert invites"
  on public.client_invites for insert
  with check (exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid()));

create policy "Client owners can delete invites"
  on public.client_invites for delete
  using (exists (select 1 from public.clients c where c.id = client_id and c.owner_id = auth.uid()));


-- ---------- 3. PROJECT DELIVERY DATES, GREY DAYS & SPECS ----------
-- Add details_blob column to projects for encrypted delivery dates, Grey Days, and checklists
alter table public.projects
  add column if not exists details_blob text default null;



-- ============================================================
-- PART 4: WORKSPACE & STORAGE BUCKET WITH RLS (Migration 4)
-- ============================================================

-- ============================================================
-- CUSTODIAN — Migration 4: Workspace (Store Room) Feature
-- Paste this into: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ---------- 1. STORAGE USAGE TRACKING ON PROFILES ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS storage_used_bytes bigint NOT NULL DEFAULT 0;


-- ---------- 2. WORKSPACE_ITEMS TABLE ----------
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

-- RLS: Owner-only access (simple pattern matching clients table)
CREATE POLICY "Users can view their own workspace items"
  ON public.workspace_items FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own workspace items"
  ON public.workspace_items FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own workspace items"
  ON public.workspace_items FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own workspace items"
  ON public.workspace_items FOR DELETE
  USING (user_id = auth.uid());

-- Auto-touch updated_at (reuses existing trigger function)
CREATE TRIGGER workspace_items_touch_updated_at
  BEFORE UPDATE ON public.workspace_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ---------- 3. STORAGE BUCKET: workspace-files ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-files', 'workspace-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access files under their own user_id prefix
-- Path format: {user_id}/{filename}

CREATE POLICY "Users can read their own workspace files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'workspace-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their own workspace files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'workspace-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own workspace files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'workspace-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own workspace files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'workspace-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ---------- 4. SERVER-SIDE QUOTA ENFORCEMENT ----------
-- Blocks file uploads that would exceed the user's storage quota.
-- Free: 256 MB, Pro: 5 GB, Team/Founder: 50 GB
CREATE OR REPLACE FUNCTION public.enforce_workspace_storage_quota()
RETURNS trigger AS $$
DECLARE
  user_plan text;
  current_usage bigint;
  quota_limit bigint;
BEGIN
  -- Only enforce when a file is being stored (file_size_bytes > 0)
  IF NEW.file_size_bytes <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT plan, storage_used_bytes
    INTO user_plan, current_usage
    FROM public.profiles
    WHERE id = NEW.user_id;

  -- Set quota based on plan
  IF user_plan = 'free' THEN
    quota_limit := 268435456;   -- 256 MB
  ELSIF user_plan = 'pro' THEN
    quota_limit := 5368709120;  -- 5 GB
  ELSE
    quota_limit := 53687091200; -- 50 GB (team/founder)
  END IF;

  IF (current_usage + NEW.file_size_bytes) > quota_limit THEN
    RAISE EXCEPTION 'Storage quota exceeded. Your % plan allows % MB total. You are using % MB and this file is % MB.',
      user_plan,
      (quota_limit / 1048576),
      (current_usage / 1048576),
      (NEW.file_size_bytes / 1048576);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_workspace_storage_quota
  BEFORE INSERT ON public.workspace_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_storage_quota();


-- ---------- 5. AUTO-SYNC storage_used_bytes ----------
-- Increment on insert
CREATE OR REPLACE FUNCTION public.sync_storage_usage_insert()
RETURNS trigger AS $$
BEGIN
  IF NEW.file_size_bytes > 0 THEN
    UPDATE public.profiles
      SET storage_used_bytes = storage_used_bytes + NEW.file_size_bytes
      WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER workspace_items_sync_usage_insert
  AFTER INSERT ON public.workspace_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_storage_usage_insert();

-- Decrement on delete
CREATE OR REPLACE FUNCTION public.sync_storage_usage_delete()
RETURNS trigger AS $$
BEGIN
  IF OLD.file_size_bytes > 0 THEN
    UPDATE public.profiles
      SET storage_used_bytes = GREATEST(0, storage_used_bytes - OLD.file_size_bytes)
      WHERE id = OLD.user_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER workspace_items_sync_usage_delete
  AFTER DELETE ON public.workspace_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_storage_usage_delete();


-- ---------- 8. USER ACCOUNT SELF-DELETION (SECURITY DEFINER) ----------
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


-- ---------- 9. ADMIN AUDIT LOGS TABLE ----------
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

-- ---------- 10. FOUNDER ACCESS TO ALL PROFILES & TELEMETRY (ADMIN HQ) ----------
-- Enables the founder account to see all registered platform users in Admin HQ.
DROP POLICY IF EXISTS "Founders can view all profiles" ON public.profiles;
CREATE POLICY "Founders can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR (auth.jwt() ->> 'email') = 'ygpksr456@gmail.com'
  );

DROP POLICY IF EXISTS "Founders can update all profiles" ON public.profiles;
CREATE POLICY "Founders can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR (auth.jwt() ->> 'email') = 'ygpksr456@gmail.com'
  );

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


-- ============================================================
-- PART 5: ZERO-KNOWLEDGE SHARING, DESK & MFA (Migration 5)
-- ============================================================

-- ---------- 1. CLIENTS ENHANCEMENTS ----------
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS ghosted_at timestamptz DEFAULT null,
  ADD COLUMN IF NOT EXISTS ghost_notes text DEFAULT null;

-- ---------- 2. SHARED SECRETS (ECDH P-256) ----------
CREATE TABLE IF NOT EXISTS public.shared_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'SHARED',
  encrypted_payload text NOT NULL,
  secret_ciphertext text,
  sender_public_key text NOT NULL,
  sender_public_key_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz DEFAULT null
);

ALTER TABLE public.shared_secrets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view shared secrets sent to or from them' AND tablename = 'shared_secrets') THEN
    CREATE POLICY "Users can view shared secrets sent to or from them" ON public.shared_secrets
      FOR SELECT USING (sender_id = auth.uid() OR (recipient_id = auth.uid() AND revoked_at IS NULL));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can share secrets with others' AND tablename = 'shared_secrets') THEN
    CREATE POLICY "Users can share secrets with others" ON public.shared_secrets
      FOR INSERT WITH CHECK (sender_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Senders can revoke their shared secrets' AND tablename = 'shared_secrets') THEN
    CREATE POLICY "Senders can revoke their shared secrets" ON public.shared_secrets
      FOR UPDATE USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Senders or recipients can delete shared secrets' AND tablename = 'shared_secrets') THEN
    CREATE POLICY "Senders or recipients can delete shared secrets" ON public.shared_secrets
      FOR DELETE USING (sender_id = auth.uid() OR recipient_id = auth.uid());
  END IF;
END $$;

-- ---------- 3. SUPPORT REQUESTS & FOUNDER DESK ----------
CREATE TABLE IF NOT EXISTS public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  response text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_requests' AND policyname = 'Allow public insert support_requests') THEN
    CREATE POLICY "Allow public insert support_requests" ON public.support_requests FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_requests' AND policyname = 'Allow founder select support_requests') THEN
    CREATE POLICY "Allow founder select support_requests" ON public.support_requests
      FOR SELECT USING (
        (auth.jwt() ->> 'email') = 'ygpksr456@gmail.com'
        OR EXISTS (
          SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'founder' OR profiles.role = 'admin' OR profiles.plan = 'founder')
        )
        OR auth.uid() = user_id
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_requests' AND policyname = 'Allow founder update support_requests') THEN
    CREATE POLICY "Allow founder update support_requests" ON public.support_requests
      FOR UPDATE USING (
        (auth.jwt() ->> 'email') = 'ygpksr456@gmail.com'
        OR EXISTS (
          SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'founder' OR profiles.role = 'admin' OR profiles.plan = 'founder')
        )
      );
  END IF;
END $$;

-- ---------- 4. MFA RECOVERY CODES TABLE ----------
CREATE TABLE IF NOT EXISTS public.mfa_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mfa_recovery_codes' AND policyname = 'Users can manage their own MFA recovery codes') THEN
    CREATE POLICY "Users can manage their own MFA recovery codes" ON public.mfa_recovery_codes
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_lookup 
  ON public.mfa_recovery_codes (user_id, code_hash);



-- ============================================================
-- PART 6: SELF-SERVICE MFA RESET RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_my_mfa()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Deletes any MFA factors for the calling user so they can enroll fresh
  DELETE FROM auth.mfa_factors WHERE user_id = auth.uid();
  DELETE FROM public.mfa_recovery_codes WHERE user_id = auth.uid();
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_my_mfa() TO authenticated;


