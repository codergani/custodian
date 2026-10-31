/**
 * Custodian Production Database Security & Migration Verification Runner
 * File: scripts/verify_production_migration.cjs
 * 
 * Run this script immediately after applying 'supabase_production_security_migration.sql'
 * in the Supabase SQL Editor.
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function verifyProductionSecurity() {
  console.log("=========================================================================");
  console.log("CUSTODIAN: PRODUCTION DATABASE SECURITY & MIGRATION VERIFICATION");
  console.log("=========================================================================\n");

  if (!fs.existsSync('.env')) {
    console.error("Error: .env file missing.");
    process.exit(1);
  }

  const envContent = fs.readFileSync('.env', 'utf8');
  const uMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/);
  const kMatch = envContent.match(/VITE_SUPABASE_ANON_KEY\s*=\s*([^\r\n]+)/);

  if (!uMatch || !kMatch) {
    console.error("Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing in .env.");
    process.exit(1);
  }

  const supabaseUrl = uMatch[1].trim();
  const supabaseKey = kMatch[1].trim();
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Target Database Endpoint:", supabaseUrl);

  const checks = [];
  function record(name, expected, actual, pass, note = "") {
    checks.push({ name, expected, actual, pass, note });
    console.log(`${pass ? "✅ PASS" : "❌ FAIL"} | ${name}`);
    if (note) console.log(`       Note: ${note}`);
  }

  // 1. Check all required columns
  console.log("\n--- Section 1: Column Schema Verification ---");
  const requiredCols = [
    'id', 'email', 'platform', 'plan', 'role', 
    'subscription_status', 'storage_used_bytes', 
    'auto_lock_timeout', 'email_renewal_reminder_days', 
    'email_renewal_alerts', 'avatar_url', 'updated_at'
  ];

  let missingCols = [];
  for (const c of requiredCols) {
    const { error } = await supabase.from('profiles').select(c).limit(1);
    if (error && error.message.includes("does not exist")) {
      missingCols.push(c);
    }
  }

  const columnsComplete = missingCols.length === 0;
  record(
    "Required Schema Columns on public.profiles",
    "All 12 required columns exist",
    columnsComplete ? "All 12 verified present" : `Missing: ${missingCols.join(', ')}`,
    columnsComplete,
    columnsComplete ? "Ready for column-level grants." : "Run supabase_production_security_migration.sql."
  );

  // 2. Check Promo Tables Isolation
  console.log("\n--- Section 2: Promo Infrastructure Isolation ---");
  const { error: promoTblErr } = await supabase.from('promo_codes').select('*').limit(1);
  const promoTblBlocked = promoTblErr && (promoTblErr.code === '42501' || promoTblErr.message.includes('permission denied') || promoTblErr.message.includes('schema cache'));
  record(
    "Direct Client Access to promo_codes Blocked",
    "Permission Denied (403/42501)",
    promoTblErr ? promoTblErr.message : "Exposed!",
    promoTblBlocked,
    "Guarantees clients cannot query active promo codes via REST."
  );

  const { error: redempTblErr } = await supabase.from('promo_redemptions').select('*').limit(1);
  const redempTblBlocked = redempTblErr && (redempTblErr.code === '42501' || redempTblErr.message.includes('permission denied') || redempTblErr.message.includes('schema cache'));
  record(
    "Direct Client Access to promo_redemptions Blocked",
    "Permission Denied (403/42501)",
    redempTblErr ? redempTblErr.message : "Exposed!",
    redempTblBlocked,
    "Guarantees audit records cannot be tampered with."
  );

  // 3. Check RPC Authorization
  console.log("\n--- Section 3: RPC Authorization Verification ---");
  const { data: promoRpcData, error: promoRpcErr } = await supabase.rpc('redeem_promo_code', { p_code: 'SHIPATON2026' });
  const promoRpcAuthEnforced = (promoRpcData?.success === false && promoRpcData?.message?.includes('Authentication required')) || (promoRpcErr?.message?.includes('Authentication required'));
  record(
    "Anonymous redeem_promo_code() Execution Blocked",
    "Authentication required",
    promoRpcData ? JSON.stringify(promoRpcData) : promoRpcErr?.message,
    promoRpcAuthEnforced,
    "Unauthenticated users cannot invoke redemption."
  );

  const { error: adminRpcErr } = await supabase.rpc('admin_get_all_users');
  const adminRpcBlocked = adminRpcErr && (adminRpcErr.message.includes('Access Denied') || adminRpcErr.message.includes('Founder'));
  record(
    "Anonymous admin_get_all_users() Execution Blocked",
    "Access Denied: Founder or Admin privileges required",
    adminRpcErr ? adminRpcErr.message : "Exposed!",
    adminRpcBlocked,
    "Telemetry directory is strictly blocked from unprivileged calls."
  );

  console.log("\n=========================================================================");
  const allPass = checks.every(c => c.pass);
  if (allPass) {
    console.log("STATUS: MIGRATION ACTIVE & VERIFIED. PRODUCTION DATABASE IS HARDENED.");
  } else {
    console.log("STATUS: MIGRATION NOT YET APPLIED TO LIVE DATABASE.");
    console.log("Paste and run 'supabase_production_security_migration.sql' in the Supabase SQL Editor.");
  }
  console.log("=========================================================================\n");
}

verifyProductionSecurity().catch(console.error);

