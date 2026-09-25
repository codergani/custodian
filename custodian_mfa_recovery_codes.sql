-- ============================================================
-- CUSTODIAN — MFA RECOVERY CODES TABLE
-- Run this in Supabase Dashboard → SQL Editor → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mfa_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

-- Allow users to read and update only their own MFA recovery codes
CREATE POLICY "Users can manage their own MFA recovery codes"
  ON public.mfa_recovery_codes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookup by user and code hash
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_lookup 
  ON public.mfa_recovery_codes (user_id, code_hash);
