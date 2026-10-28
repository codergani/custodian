# Custodian & AI Studio Development Invariants

This file guides all coding assistants working on the Custodian and AI Film Studio codebases.

## 1. Zero-Trust Security Imperatives
- **No Plaintext Leaks:** NEVER log plain-text API keys, master passcodes, derived keys, or auth headers in `console.log`, server logs, or error tracebacks.
- **Cryptographic Standard:** ALL sensitive cryptographic operations MUST use WebCrypto `AES-256-GCM` and `PBKDF2` with at least 100,000 iterations.
- **Memory Hygiene:** Memory buffers and typed arrays holding decrypted keys or sensitive credentials MUST be explicitly wiped (`buffer.fill(0)`) immediately after use.
- **Strict Sanitization:** Sanitize all input fields against XSS, SQL injection, and command injection before processing or persistence.

## 2. Code Quality & Testing Standards
- **Non-Negotiable Test Coverage:** EVERY new feature, utility, or API route MUST include corresponding unit/integration tests in `src/__tests__/` (Vitest).
- **Zero Regressions:** NEVER break existing passing tests. Run `npm test -- --run` to verify that all test suites remain 100% green before finishing any task.
- **Type Safety & Schemas:** Avoid `any` types. Define explicit validation schemas (Zod or robust schema validators) for all incoming and outgoing payloads.

## 3. Architecture Constraints
- **Strict Boundary Separation:** Maintain a clean, non-negotiable separation between Client-Side Zero-Knowledge code (where servers never hold master passcodes) and Server-Side Gateway microservices.
- **Low-Memory Video Performance:** In-browser video components MUST utilize WebCodecs or lightweight proxy streams (540p H.264) to ensure butter-smooth rendering on budget/8GB RAM systems.
- **FinOps Telemetry Compliance:** All AI gateway telemetry events emitted to the Documentation Room MUST strictly conform to the `studio_generation_telemetry` PostgreSQL schema (tracking scene, shot code, take/re-roll index, clip duration, and exact calculated USD cost).
