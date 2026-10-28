# Custodian Product Roadmap & Architecture Vision 🗺️

> **From Zero-Knowledge Secret Vault to the Safest Open-Source AI Gateway on the Market.**

Custodian is built on a simple philosophy: **Dogfooding—being Customer #1 for our own software—is the only way to build world-class systems.** Every security invariant, encryption boundary, budget limit, and telemetry counter is battle-tested in our own production AI Film Studio workflows before external creators touch it.

---

## 📅 The Two-Phase Open-Source Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Karnataka Rajyotsava (Nov 1, 2026) Launch                          │
│ Zero-Knowledge Client-Side Credential Vault & SaaS Watchdog                 │
│ • 100% Client-Side WebCrypto (AES-256-GCM + PBKDF2 100k rounds)             │
│ • Client ➔ Project ➔ Environment (.env Studio & Matrix)                    │
│ • Ghosted Client Vault (Automated .zip Handovers)                           │
│ • Watchdog SaaS Subscription & Renewal Alarms                               │
│ • Mobile Android APK (Capacitor Native Build)                               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Post-Launch (Active AI Gateway Extension for AI Studios)           │
│ Real-Time Proxy, Virtual Keys & Precision FinOps Telemetry                  │
│ • Scoped Virtual API Keys (`sk-custodian-...`)                              │
│ • Server-Side Encrypted Provider Vault (AES-256)                            │
│ • Real-Time Hard USD Spend Caps & Redis Rate-Limiting                       │
│ • Model Allowlists (Kling, Higgsfield, Runway, ElevenLabs)                  │
│ • Documentation Room Telemetry Pipeline (Per-Second Video Spend & Re-rolls) │
│ • Community Modular Provider Adapter Plugin System                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Phase 1: November 1st Launch Milestone (Current Stable)

The initial open-source release focuses on delivering the most secure, delightful, and privacy-preserving freelance developer credential manager in the ecosystem.

### Core Deliverables:
- [x] **Zero-Knowledge Cryptographic Core**: All encryption and decryption occurs strictly in-browser via WebCrypto (`AES-256-GCM`). Master passwords never touch servers.
- [x] **Freelance Project Hierarchy**: Organize secrets by `Client -> Project -> Environment` (`Global`, `Prod`, `Staging`, `Dev`).
- [x] **.env Studio & Matrix**: Side-by-side environment diffing, instant one-click exports (`.env`, `Docker`, `Bash`, `JSON`), and bulk `.env` importing.
- [x] **Ghosted Client Vault**: Automatic compilation of project deliverables and credentials into encrypted `.zip` packages for client handovers.
- [x] **SaaS Renewal Watchdog**: Client-side renewal date monitoring and spend alert warnings.
- [x] **Asymmetric Peer Secret Sharing**: Ephemeral `ECDH P-256` key exchange for sharing secrets without exposing master passcodes.
- [x] **Cross-Platform Mobile**: Native Android build (`custodian-latest.apk`) with biometric unlock support.
- [x] **152 Passing Automated Unit/Integration Tests**: Covering crypto derivation, MFA, billing, and credential vaults.

---

## 🎬 Phase 2: Active AI Gateway Extension (Dogfooded in AI Film Studio)

Phase 2 introduces an opt-in, high-performance reverse proxy service designed to sit between generative studio applications and AI model providers.

### 1. Virtual API Key Management (`sk-custodian-...`)
* Issue scoped tokens to individual artists, scenes, or background workers.
* **5-Second Revocation**: If a token leaks in client code, revoke it instantly in Custodian without rotating master provider accounts.

### 2. Hard USD Budget Guardrails & Redis Rate-Limiting
* Real-time pre-call interception.
* Enforce hard monthly caps (e.g. `$200/month` per project) and requests-per-minute (RPM/TPM) limits. If budget is exceeded, requests are rejected *before* incurring provider charges.

### 3. Model Governance & Dynamic Routing
* Model allowlisting per virtual key (e.g. allow `kling-v2.5` and `flux-schnell`, reject unapproved expensive models).
* Automated fallback routing during upstream provider degradation.

### 4. FinOps & Documentation Room Telemetry Pipeline
* Event emitter logging generation specs directly into the studio database:
  * Model & provider called
  * Clip duration (seconds) or tokens consumed
  * Exact USD cost derived from model rate cards
  * Take number & re-roll index (tracking take efficiency per scene)

### 5. Modular Provider Adapter Plugin System
* Community-contributed adapters for emerging models (Runway, Luma Dream Machine, Kling, Higgsfield, ElevenLabs, Midjourney API).

---

## 🤝 Community & Contribution

Custodian is open-source under the **MIT License**. We welcome contributors!
- To report bugs or suggest features: See `.github/ISSUE_TEMPLATE/`
- To contribute code: Review [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md)
