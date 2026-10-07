# Security Policy

## Reporting Security Vulnerabilities

Custodian is a zero-knowledge secrets manager designed for freelancers, developers, and agency teams. We take security and privacy with paramount seriousness.

If you discover a security vulnerability or cryptographic weakness in Custodian, please do **NOT** open a public issue. Instead, report it responsibly via our vulnerability disclosure channel:

- **Email**: `security@custodian.app` (or contact the maintainers directly via private GitHub Advisory)
- **Response Target**: We acknowledge all reports within 48 hours and strive to issue a patch and security advisory within 7 business days.

---

## Security Architecture & Guarantees

Custodian is built on a **Zero-Knowledge Architecture**:
1. **Client-Side Encryption**: All secrets, notes, passwords, and project credentials are encrypted and decrypted locally on the user's client using standard WebCrypto APIs (**AES-256-GCM** with 96-bit random IVs and **PBKDF2-SHA256** key derivation with 310,000+ iterations).
2. **Server-Side Blindness**: The server / Supabase backend only ever receives encrypted ciphertext (`iv:ciphertext`). The master password or encryption key is never transmitted or stored remotely.
3. **Android Security**:
   - `android:allowBackup="false"` is enforced to block ADB device backup extraction.
   - `FLAG_SECURE` is active in release builds to block screen capture and task-switcher previews.
   - WebView debugging is disabled in production release builds.
4. **Clipboard Auto-Clear**: Copied secrets and credentials automatically clear from the device clipboard after 30 seconds.

---

## Scope & Bounties

In-scope components:
- Cryptographic implementations (`src/crypto.js`, key derivation, ECDH key exchange)
- Master key handling, memory isolation, and local storage encapsulation
- Android native bridge & biometrics integration (`src/native/nativeBridge.js`, `android/`)
- Authentication & MFA flows (`src/utils/mfaUtils.js`, recovery code hashing)

Out of scope:
- Rate-limiting spam on self-hosted demo instances
- Social engineering against end-users
- Denial-of-service against third-party upstream providers
