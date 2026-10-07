# Contributing to Custodian

Thank you for your interest in contributing to Custodian! We welcome contributions that help make Custodian the most secure, delightful, and privacy-preserving client secrets manager in the world.

---

## Code of Conduct

Please treat everyone with respect, kindness, and professionalism. Hostile, derogatory, or abusive behavior is not tolerated.

---

## Core Security Invariants (MUST READ BEFORE CODING)

When writing or modifying code in Custodian, you must uphold the following rules:

1. **Zero-Knowledge Invariant**: Plaintext secrets, passwords, notes, and credentials must **NEVER** leave the client unencrypted. Do not send plaintext keys to any network API, analytics provider, logging service, or database column.
2. **Standard Cryptography Only**: Never roll custom ciphers or hash functions. Use the standardized WebCrypto primitives in `src/crypto.js`.
3. **No Unencrypted Persistence**: Do not store unencrypted secrets in `localStorage`, `sessionStorage`, cookies, or unencrypted SQLite tables.
4. **No Secrets in Logs**: Never use `console.log()` or telemetry tools to inspect plaintext credentials, private keys, or master passwords.

---

## Development Setup

### 1. Prerequisites
- **Node.js** v18+ (v20+ recommended)
- **npm** v9+
- Optional for mobile: Android Studio / Android SDK

### 2. Installation
```bash
git clone https://github.com/codergani/custodian.git
cd custodian
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase credentials or test sandbox credentials.

### 4. Running the Dev Server
```bash
npm run dev
```

### 5. Running the Automated Tests
Every pull request must pass the automated test suite:
```bash
npm test
```
To run tests in CI/run mode:
```bash
npm test -- --run
```

### 6. Production Build Check
Ensure the production build finishes cleanly without bundling errors:
```bash
npm run build
```

---

## Pull Request Guidelines

1. **Keep PRs focused**: Address one feature, fix, or enhancement per PR.
2. **Include Tests**: Add or update test coverage in `src/__tests__/` for any logic, utility, or component modification.
3. **Zero Secrets**: Verify that no API keys, private tokens, or sensitive credentials are included in your commits.
