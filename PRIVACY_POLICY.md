# Privacy Policy for Custodian

**Last Updated:** September 5, 2026

Custodian ("we", "our", or "us") provides a zero-knowledge encrypted credential vault and project delivery manager application ("Custodian" or the "Service"). We are committed to protecting your privacy and ensuring you have complete control over your data.

---

### 1. Zero-Knowledge Encryption Architecture
- **Client-Side Encryption:** All sensitive credentials, API keys, passwords, environment variables, and project specification notes are encrypted and decrypted locally on your device using industry-standard **AES-256-GCM** encryption with PBKDF2 key derivation (150,000 iterations).
- **Zero-Knowledge Guarantee:** We do not possess, store, or transmit your vault encryption master password or unencrypted secrets. Nobody—including Custodian administrators or database operators—can read, recover, or decrypt your stored secrets without your master password.

---

### 2. Information We Collect
- **Account Information:** When you sign up, we collect your email address and authentication tokens via Supabase Auth to maintain your session and manage your subscription tier.
- **Billing Information:** 
  - On Web: Payment transactions and subscriptions are securely processed by Lemon Squeezy (Merchant of Record). We do not store your credit card or bank numbers.
  - On Mobile (Android): Subscriptions are processed directly by Google Play In-App Billing via RevenueCat.
- **Workspace Files:** User-uploaded files in the Workspace/Store Room are stored in your private storage bucket with strict Row Level Security (RLS) policies ensuring only authenticated account owners can access their files.

---

### 3. How We Use Your Information
- To authenticate your account and synchronize encrypted vault items across your devices.
- To enforce subscription tier limits and renewal alerts.
- To send transactional emails (e.g. password resets, optional renewal watchdog notifications).
- We **NEVER** sell, rent, or monetize your personal data or vault contents.

---

### 4. Account & Data Deletion Rights
You have the right to permanently delete your account and all associated data at any time:
- **In-App Deletion:** Open Custodian → Profile & Preferences → Click **"Delete Account & Data"** → Confirm. This immediately purges your profile, clients, projects, credentials, workspace files, and active sessions from our servers.
- **Email Request:** You can also request complete data deletion by emailing support at `support@custodian.app`.

---

### 5. Contact Information
If you have questions about this Privacy Policy, contact us at:
- **Email:** `support@custodian.app`
- **Website:** `https://custodian.app`
