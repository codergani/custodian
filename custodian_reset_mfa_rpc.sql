-- ============================================================
-- CUSTODIAN — RESET MFA RPC FUNCTION (Self-Service Reset)
-- Run this in Supabase Dashboard → SQL Editor → Click "Run"
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

-- Allow authenticated users to call this function for their own account
GRANT EXECUTE ON FUNCTION public.reset_my_mfa() TO authenticated;

-- Immediate reset for your founder account:
DELETE FROM auth.mfa_factors WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ygpksr456@gmail.com');
DELETE FROM public.mfa_recovery_codes WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ygpksr456@gmail.com');
