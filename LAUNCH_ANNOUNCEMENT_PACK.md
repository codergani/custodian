# Custodian: Karnataka Rajyotsava (Nov 1, 2026) Launch Announcement Pack 🚀

> Everything you need to announce Custodian on launch day across Hacker News, X (Twitter), Reddit, and LinkedIn.

---

## 1. Show HN (Hacker News) Post

**Post Title:**  
`Show HN: Custodian – Open-source zero-knowledge secrets vault & SaaS watchdog for developers`

**Post URL:**  
`https://github.com/codergani/custodian` (or link to `https://custodian-swart.vercel.app`)

**Post Text Body:**
```markdown
Hey HN,

I’m Ganipar. Over the past couple of years freelancing and building AI products, I kept running into the same frustrating problems:
1. General-purpose password managers are clunky for developer workflows (diffing .env files across Dev/Staging/Prod, exporting Bash/Docker variables, managing SSH keys).
2. Secrets end up scattered across Slack DMs, local `.env` files, and unencrypted notes.
3. Forgotten SaaS subscriptions and unmonitored API bills quietly drain monthly budgets.
4. When clients pause or cancel contracts, packaging handover specs and credentials is a manual chore.

To solve this, I built **Custodian** (https://custodian-swart.vercel.app / https://github.com/codergani/custodian) — a 100% zero-knowledge client-side secrets manager, deliverables organizer, and SaaS renewal watchdog. 

Today, on Karnataka Rajyotsava (Nov 1st), I’m officially open-sourcing it under the MIT license.

### Technical & Cryptographic Architecture:
- **True Zero-Knowledge (WebCrypto):** All encryption and decryption occurs strictly on your client device using `AES-256-GCM` with 96-bit unique IVs. 
- **PBKDF2 Key Derivation:** Master passcodes derive an AES key via `PBKDF2` (SHA-256) with 100,000+ rounds and a 128-bit per-user salt. The master passcode is never sent over the wire or stored in persistent storage.
- **Asymmetric Peer Secret Sharing:** Built with ephemeral `ECDH P-256` key exchange to share credentials peer-to-peer without revealing master passcodes.
- **.env Studio & Matrix:** Side-by-side environment diffing (Dev vs Staging vs Prod) to catch missing keys before production pushes, with 1-click exports to RAW, `.env`, Docker flags (`-e`), and Bash exports.
- **Ghosted Clients Vault:** 1-click `.zip` archive packager that bundles project specs, deployment runbooks, and credentials when client engagements pause.
- **SaaS Renewal Watchdog:** Automated tracking of recurring API and software subscriptions with renewal alarms to kill zombie costs.
- **Native Android App:** Built with Capacitor and Android Platform Authenticator for biometric fingerprint/face unlock.
- **Testing:** 161 automated Vitest unit/integration tests covering crypto derivation, rate limiting, and memory hygiene.

The repository is on GitHub: https://github.com/codergani/custodian  
Live demo: https://custodian-swart.vercel.app

I'd love feedback on the cryptography implementation, UX, and the developer workflow. Thank you!
```

---

## 2. X / Twitter Launch Thread (6-Part Viral Thread)

### Tweet 1 (The Hook):
```
I got tired of losing money to forgotten SaaS renewals and having API keys scattered across messy local .env files.

So I built Custodian: an open-source, 100% Zero-Knowledge secrets vault and SaaS watchdog for developers.

Launching today on Karnataka Rajyotsava (Nov 1) 💛❤️

🧵👇
```
*(Attach a 5-10 sec screen recording or screenshot of the Custodian Dashboard & Environment Studio)*

---

### Tweet 2 (The Cryptography):
```
1/ Most credential tools send unencrypted keys or store encryption keys on their servers.

Custodian is 100% Zero-Knowledge:
• In-browser AES-256-GCM encryption
• PBKDF2 with 100,000 iterations
• Ephemeral ECDH P-256 peer sharing

The server only ever sees opaque ciphertext blobs.
```

---

### Tweet 3 (The .env Studio):
```
2/ Managing Dev vs Staging vs Prod environments is usually painful.

Custodian includes an interactive .env Studio & Matrix:
• Compare environments side-by-side
• Instantly spot missing prod variables
• 1-click export to .env, Docker `-e`, Bash export, or JSON
```
*(Attach screenshot of .env Matrix diff view)*

---

### Tweet 4 (Ghosted Clients & Deliverables):
```
3/ For freelancers & agencies: ever had a client ghost or pause mid-project?

The "Ghosted Clients Vault" packages project credentials, PRD specs, and deployment runbooks into an encrypted .zip deliverable archive with a single click.
```

---

### Tweet 5 (SaaS Renewal Watchdog):
```
4/ Zombie SaaS subscriptions kill indie margins.

The built-in Watchdog tracks subscription renewal dates, active tiers, and monthly costs with proactive countdown alerts so you never get hit by unexpected autorenewals.
```

---

### Tweet 6 (Call to Action & Links):
```
5/ Custodian is completely open-source (MIT), built with React, Vite, Capacitor, and WebCrypto, with 161 automated passing tests.

⭐ Star on GitHub: https://github.com/codergani/custodian
🌐 Live Web App: https://custodian-swart.vercel.app

Proudly made in Karnataka for developers worldwide 🚀
```

---

## 3. Reddit Posts

### Post A: for `r/selfhosted` & `r/opensource`
**Title:** `Custodian – Open-source, zero-knowledge developer secrets vault & SaaS watchdog (MIT)`

**Body:**
```markdown
Hi r/selfhosted and r/opensource!

Today for Karnataka Rajyotsava, I'm open-sourcing **Custodian**, a client-side zero-knowledge credential manager and subscription watchdog built specifically for developers, agencies, and self-hosters.

### Why not just use Bitwarden or Keepass?
General password managers are great for web logins, but clunky for developer workflows. Custodian is built around:
- **Client ➔ Project ➔ Environment (`Dev`, `Staging`, `Prod`, `Global`)** credential hierarchy.
- **.env Matrix**: Side-by-side environment comparison to spot missing keys before deployments, with 1-click export to Docker `-e`, Bash, and `.env`.
- **Zero-Knowledge Core**: Encrypts and decrypts 100% in-browser using WebCrypto `AES-256-GCM` and `PBKDF2` (100,000 iterations). Raw secrets never touch the database unencrypted.
- **SaaS Renewal Watchdog**: Tracks SaaS renewal dates and licenses with alert warnings to stop subscription leaks.
- **Ghosted Clients Vault**: Compiles full `.zip` project deliverables archives with handover runbooks.
- **Native Android APK**: Mobile app with biometric fingerprint unlock via Capacitor.
- **Zero Tracking / Zero Telemetry on secrets**: 161 automated test suites in Vitest.

- **GitHub:** https://github.com/codergani/custodian
- **Live Demo:** https://custodian-swart.vercel.app
- **License:** MIT

Would love to hear your thoughts, feedback, and feature suggestions!
```

---

### Post B: for `r/webdev`
**Title:** `I built an open-source tool to solve local .env sprawl and SaaS subscription waste`

**Body:**
```markdown
Hey r/webdev,

Like many of you, I had API keys, Stripe webhook secrets, and database credentials scattered across `.env.local` files, Notion pages, and Slack DMs. Whenever a staging bug appeared, it was almost always due to a missing environment variable.

I built **Custodian** to fix this. It’s a 100% client-side zero-knowledge secrets vault with:
1. **.env Comparison Matrix:** View Dev, Staging, and Production variables side-by-side with 1-click export to Docker `-e`, `.env`, and Bash.
2. **Client Deliverables & SOPs:** Organize credentials by Client -> Project, and compile `.zip` archives for client handovers.
3. **SaaS Watchdog:** Track upcoming subscription renewal dates and monthly costs.
4. **Zero-Knowledge WebCrypto:** Encrypted locally with `AES-256-GCM` + `PBKDF2` (100k rounds).

It is completely open-source under the MIT license today:
- Repo: https://github.com/codergani/custodian
- Live app: https://custodian-swart.vercel.app

Check it out and let me know what developer workflows you'd like to see next!
```

---

## 4. LinkedIn Post

```markdown
🚀 Excited to celebrate Karnataka Rajyotsava (Nov 1) by open-sourcing Custodian! 💛❤️

As developers and founders, we often face two silent productivity and budget killers:
1. Environment credential sprawl (.env files scattered across local folders, Slack chats, and test servers).
2. Zombie SaaS subscriptions and unmonitored API bills quietly compounding each month.

I built Custodian (https://custodian-swart.vercel.app) to solve this:
🔒 True Zero-Knowledge Architecture: Built on client-side WebCrypto AES-256-GCM + PBKDF2 (100,000 rounds). Your server and database never see unencrypted credentials.
⚡ .env Studio & Matrix: Compare Dev, Staging, and Production variables side-by-side with 1-click exports to Docker, Bash, and .env files.
📦 Ghosted Clients Vault: Automated .zip handover packages with deployment runbooks when contracts pause.
⏰ SaaS Renewal Watchdog: Tracks software licenses and renewal alarms to eliminate wasteful spend.
📱 Cross-Platform: Web app + native Android APK with biometric fingerprint unlock.

Custodian is 100% open-source under the MIT License with 161 passing automated tests.

⭐ Explore the code on GitHub: https://github.com/codergani/custodian
🌐 Try the live app: https://custodian-swart.vercel.app

Proudly crafted in Karnataka for global developers and engineering teams. Looking forward to your thoughts and feedback!

#OpenSource #WebSecurity #DevTools #Cryptography #JavaScript #KarnatakaRajyotsava #SaaS #FinOps
```
