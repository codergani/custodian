# Custodian

Zero-knowledge credential vault — Supabase-backed, real accounts, encrypted client-side.

## Setup

1. **Run the two SQL files** in your Supabase project (SQL Editor → New query):
   - `custodian_schema.sql` first
   - `custodian_migration_2.sql` second

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Set up your environment:**
   ```
   cp .env.example .env
   ```
   Then open `.env` and paste in your Supabase project's URL + anon key
   (Supabase Dashboard → Settings → API). This file is gitignored — it
   never gets committed or shared anywhere.

4. **Run it:**
   ```
   npm run dev
   ```
   Opens at http://localhost:5173

## How the security model works

- **Account login** (email/password via Supabase Auth) — this is just your
  identity, it does NOT unlock your data.
- **Vault password** (set on first login, separate from your account
  password) — this is what actually derives the AES-256 encryption key,
  entirely in your browser. It's never sent to Supabase in any form.
- Supabase only ever stores encrypted blobs (`encrypted_blob` column).
  Even with full database access, nobody can read your credentials
  without your vault password.

## What's built

- Signup / login / forgot-password (email)
- Two-step unlock: account login → vault password
- Client → Project → Credential CRUD, all encrypted
- Free plan: 2 clients max (enforced both in the UI and server-side via
  a Postgres trigger, so it can't be bypassed)
- Profile page: view email/plan, change account password, sign out

## What's NOT built yet (next steps)

- RevenueCat subscription integration (Pro/Team paywall)
- Shared vaults (Team tier) — the `client_members` table and RLS
  policies are already in the schema, just needs UI + invite flow
- TOTP 2FA
- Admin dashboard (web vs mobile signup counts) — needs a secure
  server-side route using the `service_role` key (never expose that key
  in this frontend code); a Supabase Edge Function is the right place
  for it
- Phone OTP (planned for right before Play Store submission)
- Capacitor wrap for the Android build
- `.env` file bulk-import (was in the Claude prototype — portable, just
  needs re-wiring to `addCredential`)
