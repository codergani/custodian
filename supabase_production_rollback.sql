-- =========================================================================
-- CUSTODIAN PRODUCTION SAFE ROLLBACK SCRIPT
-- File: supabase_production_rollback.sql
-- Safely reverts migration objects WITHOUT restoring privilege-escalation vulnerabilities!
-- =========================================================================

BEGIN;

-- 1. Remove defense trigger safely
DROP TRIGGER IF EXISTS tr_guard_profile_escalation ON public.profiles;
DROP FUNCTION IF EXISTS public.guard_profile_privilege_escalation();

-- 2. Drop promo redemption RPC and promo tables
DROP FUNCTION IF EXISTS public.redeem_promo_code(text);
DROP TABLE IF EXISTS public.promo_redemptions CASCADE;
DROP TABLE IF EXISTS public.promo_codes CASCADE;

-- 3. Maintain column-level security: NEVER grant general UPDATE on sensitive columns!
-- Keep UPDATE strictly restricted to safe profile fields
REVOKE UPDATE ON public.profiles FROM anon, authenticated, PUBLIC;
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

-- 4. Preserve strict tenant-isolated UPDATE policy
DROP POLICY IF EXISTS "Users can update own permitted profile fields" ON public.profiles;
CREATE POLICY "Users can update own permitted profile fields"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMIT;

