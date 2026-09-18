# Custodian Web & Mobile App 🛡️

Zero-knowledge freelance developer credential vault and deliverables management platform.

For the full architectural and cryptographic overview, see the root [README.md](../README.md).

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Provide your Supabase URL and public anonymous key:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_FOUNDER_EMAIL=ygpksr456@gmail.com
```

### 3. Initialize Database
Execute [`custodian_complete_schema.sql`](./custodian_complete_schema.sql) in your Supabase SQL Editor.

### 4. Development Server
```bash
npm run dev
```
Starts Vite dev server at `http://localhost:3000`.

---

## Production Build & Tests

- **Run all unit tests**:
  ```bash
  npm test -- --run
  ```
- **Compile production web bundle**:
  ```bash
  npm run build
  ```
- **Sync web assets to native Android project**:
  ```bash
  npm run cap:sync
  ```

---

## Android APK Build

Compile the native Android debug APK:
```bash
cd android
./gradlew.bat assembleDebug
```
Output path: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Vercel Deployment

Deploy with zero configuration via Vercel CLI or GitHub Integration.  
The included [`vercel.json`](./vercel.json) automatically enforces SPA rewrite rules and enterprise security headers.
