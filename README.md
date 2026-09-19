# Custodian 🛡️
> **Zero-Knowledge Freelance Developer Vault & Deliverables Management Platform**

[![Security: Zero-Knowledge](https://img.shields.io/badge/Security-Zero--Knowledge%20(Client--Side)-gold.svg)](#security-architecture)
[![Encryption: AES-256-GCM](https://img.shields.io/badge/Encryption-AES--256--GCM-blue.svg)](#security-architecture)
[![Key Derivation: PBKDF2](https://img.shields.io/badge/Key%20Derivation-PBKDF2%20100k%20iters-darkgreen.svg)](#security-architecture)
[![Key Exchange: ECDH P-256](https://img.shields.io/badge/Key%20Exchange-ECDH%20P--256-purple.svg)](#zero-knowledge-secret-sharing)
[![Tests: 14/14 Passing](https://img.shields.io/badge/Tests-102%20Passed-brightgreen.svg)](#testing--verification)
[![Platforms](https://img.shields.io/badge/Platforms-Web%20%7C%20Android%20%7C%20iOS-orange.svg)](#mobile-deployment-android--samsung-store)
[![Deployment: Vercel Ready](https://img.shields.io/badge/Deployment-Vercel%20Ready-black.svg)](#vercel-hosting-deployment-guide)

---

## Executive Summary

**Custodian** is a specialized, zero-knowledge secret and workspace manager built specifically for **freelance developers, digital agencies, and independent contractors**. 

Unlike general-purpose password managers, Custodian is tailored to freelance client workflows: organizing credentials by **Client → Project → Environment (Global, Prod, Staging, Dev)**, generating production-ready `.env` configs, tracking deliverables, specifications, and deployment runbooks, and handling contract disruptions through an automated **Ghosted Clients Vault** with `.zip` archives.

---

## Security Architecture & Cryptographic Guarantees

Custodian enforces a strict **Zero-Knowledge Architecture**. All encryption and decryption occurs strictly on the user's client device (in the browser or mobile sandbox). The backend database (Supabase) stores only opaque ciphertexts (`encrypted_blob`). Neither database administrators, cloud providers, nor the platform founder can ever decrypt your secrets.

```
                    ┌────────────────────────────────────────────────────────┐
                    │                      CLIENT DEVICE                     │
                    │                                                        │
                    │   User Password  ───►  Supabase Auth (Cloud Identity)  │
                    │                                                        │
                    │   Master Passcode ──►  PBKDF2 (100k rounds + Salt)     │
                    │                                │                       │
                    │                                ▼                       │
                    │                     AES-256-GCM Master Key             │
                    │                                │                       │
                    │             ┌──────────────────┴──────────────────┐    │
                    │             ▼                                     ▼    │
                    │     Plaintext Secrets                    Client Decryption │
                    │     (Never leaves RAM)                   (In-Browser Memory)│
                    │             │                                     ▲    │
                    │             ▼                                     │    │
                    │     AES-256-GCM Encrypt                  AES-256-GCM Decrypt│
                    └─────────────┼─────────────────────────────────────┼────┘
                                  │                                     │
                                  ▼                                     │
                    ┌────────────────────────────────────────────────────────┐
                    │                   SUPABASE CLUSTER                     │
                    │                                                        │
                    │   Stores ONLY Opaque Ciphertext Blobs:                 │
                    │   • iv (Initialization Vector)                         │
                    │   • ciphertext (Encrypted Payload)                     │
                    │   • vault_salt (Cryptographic Key Derivation Salt)     │
                    │   • vault_check (Verification Hash)                    │
                    └────────────────────────────────────────────────────────┘
```

### 1. Dual-Tier Authentication Model
- **Cloud Identity Layer**: Handled via Supabase Authentication (Email/Password or Magic Link). This authenticates user identity and enforces PostgreSQL Row-Level Security (RLS) policies.
- **Local Vault Passcode Layer**: Set upon first vault initialization. This passcode is **never** transmitted over the network or saved in persistent storage.

### 2. Cryptographic Specifications
- **Symmetric Encryption**: **AES-256-GCM** (Galois/Counter Mode) with unique 96-bit Initialization Vectors (IVs) generated per encryption operation using `crypto.getRandomValues()`.
- **Key Derivation Function (KDF)**: **PBKDF2** with **SHA-256**, utilizing a minimum of **100,000 iterations** and a 128-bit cryptographically secure per-user salt.
- **Asymmetric Secret Sharing**: **ECDH P-256** (NIST SP 800-56A). Each user possesses an elliptic-curve keypair. Secrets shared between users are encrypted using an ephemeral derived symmetric key (`AES-256-GCM`), allowing end-to-end encrypted peer sharing without revealing master passcodes.
- **Hardware Biometric Unlock**: WebAuthn / Android Platform Authenticator convenience layer. Biometric keys wrap the in-memory session key inside local device-bound secure keystore storage and automatically invalidate upon password reset.

---

## Core Features

### 1. Client & Project Hierarchy
- **Multi-Client Segregation**: Manage independent client organizations with dedicated permissions, billable hourly rates, and deliverables.
- **Tiered Environments**: Categorize credentials cleanly into `Global`, `Production`, `Staging`, and `Development`.
- **Secret Categorization**: Distinct badges and formatting for Environment Variables, Database URIs, Stripe Keys, AWS IAM credentials, API Tokens, SSH Keys, and OAuth Secrets.

### 2. Exact USA Date & Time Formatting (`MM/DD/YYYY • HH:MM AM/PM`)
- Every credential card displays the exact modification/creation timestamp formatted strictly to the USA Standard:
  ```
  Updated: 09/19/2026 • 01:30 AM
  ```
- **Interactive `ⓘ` Info Popover**: A stylish circular info badge (`ⓘ`) sits next to the timestamp. Hovering on desktop or tapping/clicking on mobile displays a high-contrast floating popover explaining the exact date and time format tokens:
  - 📅 **Date**: `MM/DD/YYYY`
  - ⏰ **Time**: `HH:MM AM/PM`
- **Audit Timeline Drawer**: Expandable revision history tracking the exact chronology of credential edits with timestamps.

### 3. .env Studio & Matrix
- **Environment Matrix**: Compare development, staging, and production environment variables side-by-side to detect missing keys before production deployments.
- **Universal Formats**: Instant 1-click clipboard copying and export as:
  - `RAW` value
  - `.ENV` format (`KEY="value"`)
  - `BASH` export commands (`export KEY="value"`)
  - `DOCKER` environment arguments (`-e KEY="value"`)
  - `JSON` configuration file
- **Bulk `.env` Import**: Paste existing `.env` files to automatically parse and batch-encrypt new project credentials.

### 4. Ghosted Clients Vault (Automated `.zip` Archiving)
- **Freelancer Protection**: When a client pauses or cancels a contract, archive their entire workspace.
- **Full ZIP Export**: Automatically compiles all project credentials, `.env` files, contract specs, and handover notes into a compressed `.zip` package (`[ClientName]-Archive.zip`).
- **One-Click Reactivation**: If the client returns, restore their entire workspace and secrets directly from the **Ghosted Clients Vault** in the Recycle Bin.

### 5. Deliverables, PRDs & Deployment Runbooks
- Track milestone deadlines, client scope sign-offs, and technical specifications alongside encrypted credentials.
- Step-by-step production deployment checklists with copy-to-clipboard operational runbooks.

### 6. Personal Space
- An isolated, zero-knowledge personal vault section for developers' private API keys, side projects, and personal accounts that remain strictly segregated from client deliverables.

### 7. Founder Admin HQ
- Built-in administration portal accessible only by authorized founder emails (`ygpksr456@gmail.com`).
- Live telemetry: registered user directory, user tiers (Free, Pro, Team, Founder), real-time encrypted storage utilization calculations, and geographic user distribution.

---

## Project Structure

```
Custodian/
├── android/                  # Native Android Capacitor project
├── ios/                      # Native iOS Capacitor project
├── dist/                     # Optimized production bundle (Vercel target)
├── src/
│   ├── components/           # UI components
│   │   ├── shared.jsx        # CredCard, Date/Time popovers, Modal wrappers
│   │   ├── ModalRouter.jsx   # Ghost client, Deliverables & sharing modals
│   │   ├── TrashView.jsx     # Recycle bin & Ghosted Clients Vault
│   │   ├── ProfilePanel.jsx  # Security settings & account password
│   │   ├── PasswordGenerator.jsx # Entropy-based passphrase generator
│   │   ├── PersonalSpaceView.jsx # Personal credential workspace
│   │   └── CommandPalette.jsx# Quick navigation (Ctrl+K)
│   ├── native/               # Capacitor native bridge & biometrics
│   ├── utils/                # Pure logic utilities
│   │   ├── dateFormatter.js  # Strict USA MM/DD/YYYY & HH:MM formatter
│   │   ├── clientArchive.js  # JSZip client export & archive generator
│   │   ├── passwordGenerator.js # Passphrase generator & entropy engine
│   │   └── personalSpace.js  # Personal vault isolation
│   ├── __tests__/            # 14 Vitest unit test suites (102 tests)
│   ├── AdminHQ.jsx           # Founder administration & telemetry dashboard
│   ├── App.jsx               # App container, auto-lock & session management
│   ├── AuthScreen.jsx        # Cloud authentication & password recovery
│   ├── ResetPasswordScreen.jsx # Dedicated password reset landing
│   ├── Vault.jsx             # Main encrypted credential workspace
│   ├── VaultUnlock.jsx       # Zero-knowledge master passcode unlock screen
│   └── styles.js             # Design tokens & color system
├── custodian_complete_schema.sql # Master Supabase database schema
├── vercel.json               # Vercel SPA rewrites & security headers
├── capacitor.config.json     # Native mobile runtime configuration
├── package.json              # Dependencies & build scripts
├── vite.config.js            # Vite bundler configuration
├── custodian-latest.apk      # Fresh Android installable APK
└── README.md                 # Master project documentation
```

---

## Local Development & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Supabase Account**: A free Supabase project for backend authentication and database storage.

### 1. Clone & Install
```bash
git clone https://github.com/codergani/custodian.git
cd custodian
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_FOUNDER_EMAIL=ygpksr456@gmail.com
```

### 3. Initialize Database Schema
1. Open your **Supabase Dashboard** → **SQL Editor**.
2. Open [`custodian_complete_schema.sql`](file:///e:/CreateApps/Custodian/custodian_complete_schema.sql).
3. Paste and run the entire script. This automatically creates:
   - All tables: `profiles`, `clients`, `projects`, `credentials`, `deliverables`, `shared_secrets`, `system_logs`.
   - Row-Level Security (RLS) policies for complete tenant isolation.
   - Triggers for user registration, plan limits, and updated timestamps.
   - Founder administrative functions (`admin_get_all_users`).

### 4. Start Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & Verification

Custodian includes extensive unit tests across 14 test suites covering cryptographic routines, date formatting, password generation, personal space isolation, rate limiting, and client archives.

Run all tests:
```bash
npm test -- --run
```

Execute a clean production build:
```bash
npm run build
```

---

## Vercel Hosting Deployment Guide

Custodian is built to deploy effortlessly to **Vercel** with zero backend servers required.

### Step 1: Push Repository to GitHub
Ensure your latest changes are pushed:
```bash
git add .
git commit -m "feat: production release ready"
git push origin main
```

### Step 2: Import into Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **"Add New..."** → **"Project"**.
3. Select your GitHub repository: `codergani/custodian`.
4. In the **Configure Project** screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (Root directory)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 3: Add Environment Variables
Under **Environment Variables**, add the following keys:
| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://xyz.supabase.co` | Your live Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJh...` | Your Supabase public anonymous API key |
| `VITE_FOUNDER_EMAIL` | `ygpksr456@gmail.com` | Founder account email for Admin HQ access |

### Step 4: Deploy
Click **"Deploy"**. Vercel will build and serve your app. The included [`vercel.json`](file:///e:/CreateApps/Custodian/vercel.json) automatically enforces:
- Single Page Application (SPA) routing for deep links.
- High-grade security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`).

---

## Mobile Deployment (Android & Samsung Galaxy Store)

Custodian uses **Capacitor** to compile native mobile apps for Android and iOS from the single codebase.

### 1. Build and Sync Web Assets
```bash
npm run build
npx cap sync android
```

### 2. Generate Installable Android APK
To compile an APK for testing on Samsung/Android phones:
```bash
cd android
./gradlew.bat assembleDebug
```
The resulting APK is generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### 3. Install on Samsung / Android Devices
1. Connect your phone via USB or upload the APK to your Google Drive / Samsung Quick Share.
2. Enable **"Install Unknown Apps"** for your file browser in Android Settings.
3. Tap `custodian-latest.apk` to install and test!

### 4. Publishing to Samsung Galaxy Store
1. Register at the [Samsung Galaxy Developers Seller Portal](https://seller.samsungapps.com/).
2. In Android Studio, build a signed release bundle or APK:
   ```bash
   cd android
   ./gradlew.bat assembleRelease
   ```
3. Upload the signed APK/AAB to the Samsung Seller Portal.
4. Set application metadata:
   - **Category**: Productivity / Tools & Utilities
   - **Content Rating**: All ages
   - **Privacy Policy URL**: Link to [`PRIVACY_POLICY.md`](file:///e:/CreateApps/Custodian/PRIVACY_POLICY.md) hosted on your Vercel domain.

---

## License & Intellectual Property

Copyright © 2026 **Custodian**. All Rights Reserved.  
Crafted with zero-knowledge cryptographic principles by **codergani**.
