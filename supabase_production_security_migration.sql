-- =========================================================================
-- CUSTODIAN PRODUCTION DATABASE SECURITY REMEDIATION MIGRATION
-- File: supabase_production_security_migration.sql
-- Idempotent, Transactional, Zero-GUC Privilege Escalation Elimination
-- =========================================================================

BEGIN;

-- 1. Ensure all required columns exist on public.profiles before applying grants/triggers
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS storage_used_bytes bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_lock_timeout integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS email_renewal_reminder_days integer DEFAULT 14,
  ADD COLUMN IF NOT EXISTS email_renewal_alerts boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Drop all legacy, permissive or conflicting UPDATE policies on public.profiles
DROP POLICY IF EXISTS "Founders can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own permitted profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;

-- 3. Create a single, strict RLS UPDATE policy for authenticated users
CREATE POLICY "Users can update own permitted profile fields"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Column-Level Permission Restrictions (Database Engine Defense)
-- Revoke general UPDATE privilege on public.profiles from client roles
REVOKE UPDATE ON public.profiles FROM anon, authenticated, PUBLIC;

-- Grant column-specific UPDATE privilege ONLY on safe, user-editable fields
GRANT UPDATE (
  username,
  display_name,
  avatar_url,
  public_key,
  encrypted_private_key,
  auto_lock_timeout,
  email_renewal_reminder_days,
  email_renewal_alerts,
  updated_at
) ON public.profiles TO authenticated;

-- Ensure service_role retains full table privileges for payment webhooks and admin microservices
GRANT ALL ON public.profiles TO service_role;

-- 5. Defense-in-Depth Trigger: Guarding Sensitive Profile Columns
-- Identifies direct client PostgREST calls via current_user = 'authenticated'
-- and rejects any attempt to mutate protected columns (plan, role, subscription_status, id, email).
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_escalation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If executed under the authenticated client role (direct PostgREST user update)
  IF current_user = 'authenticated' OR session_user = 'authenticated' THEN
    -- A. Disallow changing identity columns
    IF (NEW.id IS DISTINCT FROM OLD.id) THEN
      RAISE EXCEPTION 'Access Denied: Cannot modify profile id.';
    END IF;

    IF (NEW.email IS DISTINCT FROM OLD.email) THEN
      RAISE EXCEPTION 'Access Denied: Cannot modify profile email via direct table update.';
    END IF;

    -- B. Disallow altering plan directly (must be performed via redeem_promo_code RPC or payment webhook)
    IF (NEW.plan IS DISTINCT FROM OLD.plan) THEN
      RAISE EXCEPTION 'Access Denied: Direct alteration of plan is prohibited. Use authorized billing or promo redemption.';
    END IF;

    -- C. Disallow altering role
    IF (NEW.role IS DISTINCT FROM OLD.role) THEN
      RAISE EXCEPTION 'Access Denied: Direct alteration of role is prohibited.';
    END IF;

    -- D. Disallow altering subscription status
    IF (NEW.subscription_status IS DISTINCT FROM OLD.subscription_status) THEN
      RAISE EXCEPTION 'Access Denied: Direct alteration of subscription_status is prohibited.';
    END IF;

    -- E. Disallow altering platform or metrics
    IF (NEW.platform IS DISTINCT FROM OLD.platform) OR
       (NEW.storage_used_bytes IS DISTINCT FROM OLD.storage_used_bytes) OR
       (NEW.revenuecat_customer_id IS DISTINCT FROM OLD.revenuecat_customer_id) THEN
      RAISE EXCEPTION 'Access Denied: Direct alteration of entitlement or metric fields is prohibited.';
    END IF;
  END IF;

  -- Ensure updated_at is refreshed on every legitimate update
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_guard_profile_escalation ON public.profiles;
CREATE TRIGGER tr_guard_profile_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_privilege_escalation();


-- 6. Promo Codes & Redemptions Tables (Completely Isolated from Client Access)
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  plan_upgrade text NOT NULL CHECK (plan_upgrade IN ('pro', 'team')),
  max_redemptions integer NOT NULL DEFAULT 100,
  redemptions_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_promo_user_redemption PRIMARY KEY (promo_id, user_id)
);

-- Enable RLS on promo tables
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Revoke all direct client access (anon and authenticated cannot read or write promo tables directly)
REVOKE ALL ON public.promo_codes FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.promo_redemptions FROM anon, authenticated, PUBLIC;

-- Only service_role has direct table access
GRANT ALL ON public.promo_codes TO service_role;
GRANT ALL ON public.promo_redemptions TO service_role;

-- 7. Seed Official Reviewer & Launch Promo Codes
INSERT INTO public.promo_codes (code, plan_upgrade, max_redemptions, expires_at, is_active)
VALUES 
  ('SHIPATON2026', 'pro', 250, now() + interval '90 days', true),
  ('JUDGE2026', 'pro', 100, now() + interval '90 days', true),
  ('REVIEWER2026', 'pro', 100, now() + interval '90 days', true),
  ('SAMSUNG2026', 'pro', 250, now() + interval '90 days', true),
  ('EXPIREDTEST', 'pro', 10, now() - interval '1 day', true)
ON CONFLICT (code) DO UPDATE 
SET 
  is_active = EXCLUDED.is_active,
  expires_at = EXCLUDED.expires_at,
  plan_upgrade = EXCLUDED.plan_upgrade;


-- 8. Concurrency-Safe, Atomic Promo Redemption RPC
-- Runs as SECURITY DEFINER (owned by postgres) to allow atomic plan elevation
CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_promo public.promo_codes%ROWTYPE;
BEGIN
  -- A. Authentication Gate
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required.');
  END IF;

  -- B. Concurrency-Safe Lookup with Row-Level Lock
  -- FOR UPDATE serializes concurrent transactions attempting to redeem the same code,
  -- guaranteeing redemptions_count cannot exceed max_redemptions.
  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE code = upper(trim(p_code)) AND is_active = true
  FOR UPDATE;

  -- C. Validate Existence & Status
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or inactive promo code.');
  END IF;

  -- D. Validate Expiration
  IF now() > v_promo.expires_at THEN
    RETURN jsonb_build_object('success', false, 'message', 'This promo code has expired.');
  END IF;

  -- E. Validate Redemption Capacity
  IF v_promo.redemptions_count >= v_promo.max_redemptions THEN
    RETURN jsonb_build_object('success', false, 'message', 'This promo code has reached its maximum redemptions.');
  END IF;

  -- F. Prevent Duplicate Redemption by the Same User
  IF EXISTS (
    SELECT 1 FROM public.promo_redemptions 
    WHERE promo_id = v_promo.id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You have already redeemed this promo code.');
  END IF;

  -- G. Atomically Record Redemption & Increment Count
  INSERT INTO public.promo_redemptions (promo_id, user_id, redeemed_at)
  VALUES (v_promo.id, v_user_id, now());

  UPDATE public.promo_codes
  SET redemptions_count = redemptions_count + 1
  WHERE id = v_promo.id;

  -- H. Elevate Profile Plan (Allowed because function runs as definer 'postgres', not 'authenticated')
  UPDATE public.profiles
  SET plan = v_promo.plan_upgrade,
      updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'plan', v_promo.plan_upgrade, 
    'message', 'Promo code applied successfully! Plan upgraded to ' || upper(v_promo.plan_upgrade) || '.'
  );
END;
$$;

-- Function Execution Permissions
REVOKE ALL ON FUNCTION public.redeem_promo_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text) TO authenticated;


-- 9. Secure Admin HQ RPC Authorization
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- Strict caller verification from server-controlled profiles table
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF COALESCE(v_caller_role, '') NOT IN ('founder', 'admin') THEN
    RAISE EXCEPTION 'Access Denied: Founder or Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT p.id, p.email, p.plan, p.role, p.created_at, p.storage_used_bytes
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_all_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;

COMMIT;

