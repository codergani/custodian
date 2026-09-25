import { describe, it, expect, beforeEach } from "vitest";
import {
  generateRecoveryCodes,
  normalizeRecoveryCode,
  hashRecoveryCode,
  storeRecoveryCodes,
  verifyAndConsumeRecoveryCode,
  purgeRecoveryCodes,
} from "../utils/mfaUtils";
import {
  calculateLockoutDuration,
  recordFailedAttempt,
  getLockoutState,
  clearFailedAttempts,
} from "../security";
import { deriveKey, newSalt, encryptJSON, decryptJSON } from "../crypto";

// Mock localStorage for node test environment
const mockStorage = new Map();
const localStorageMock = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};
globalThis.localStorage = localStorageMock;

describe("MFA & 2FA Recovery Codes & Anti-Brute-Force Test Suite", () => {
  const testUserId = "a0000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    localStorage.clear();
    clearFailedAttempts(testUserId);
  });

  it("generates correct number of single-use recovery codes in CUST-XXXX-XXXX format", () => {
    const codes = generateRecoveryCodes(8);
    expect(codes).toHaveLength(8);

    const regex = /^CUST-[2-9A-Z]{4}-[2-9A-Z]{4}$/;
    codes.forEach((code) => {
      expect(code).toMatch(regex);
    });

    // Ensure all 8 codes are distinct
    const unique = new Set(codes);
    expect(unique.size).toBe(8);
  });

  it("normalizes recovery codes ignoring casing and whitespace", () => {
    const raw = " cust-abcd-1234 ";
    expect(normalizeRecoveryCode(raw)).toBe("CUST-ABCD-1234");
  });

  it("hashes recovery codes deterministically", async () => {
    const hash1 = await hashRecoveryCode("CUST-ABCD-1234");
    const hash2 = await hashRecoveryCode("cust-abcd-1234");
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex string
  });

  it("stores and consumes single-use recovery codes (one-time use only)", async () => {
    const codes = generateRecoveryCodes(4);
    await storeRecoveryCodes(testUserId, codes);

    const testCode = codes[0];

    // First use: should succeed
    const firstAttempt = await verifyAndConsumeRecoveryCode(testUserId, testCode);
    expect(firstAttempt).toBe(true);

    // Second use of the same code: MUST fail (consumed / single-use)
    const secondAttempt = await verifyAndConsumeRecoveryCode(testUserId, testCode);
    expect(secondAttempt).toBe(false);

    // Unused code in the same batch: should succeed
    const secondCode = codes[1];
    const unusedAttempt = await verifyAndConsumeRecoveryCode(testUserId, secondCode);
    expect(unusedAttempt).toBe(true);
  });

  it("rejects invalid or fabricated recovery codes", async () => {
    const codes = generateRecoveryCodes(3);
    await storeRecoveryCodes(testUserId, codes);

    const badCode = "CUST-FAKE-CODE";
    const ok = await verifyAndConsumeRecoveryCode(testUserId, badCode);
    expect(ok).toBe(false);
  });

  it("purges all recovery codes on 2FA disable", async () => {
    const codes = generateRecoveryCodes(3);
    await storeRecoveryCodes(testUserId, codes);

    await purgeRecoveryCodes(testUserId);

    // After purge, previously stored codes can no longer be used
    const ok = await verifyAndConsumeRecoveryCode(testUserId, codes[0]);
    expect(ok).toBe(false);
  });

  it("enforces 5-attempt brute-force rate-limiting and exponential backoff", () => {
    // Attempts 1 to 4 should have 0s lockout
    for (let i = 1; i <= 4; i++) {
      const state = recordFailedAttempt(testUserId);
      expect(state.count).toBe(i);
      expect(calculateLockoutDuration(i)).toBe(0);
    }

    // 5th failed attempt triggers 30s lockout
    const fifth = recordFailedAttempt(testUserId);
    expect(fifth.count).toBe(5);
    expect(fifth.remainingSeconds).toBeGreaterThanOrEqual(29);
    expect(calculateLockoutDuration(5)).toBe(30);

    // 6th failed attempt triggers 60s lockout (exponential)
    const sixth = recordFailedAttempt(testUserId);
    expect(sixth.count).toBe(6);
    expect(calculateLockoutDuration(6)).toBe(60);

    // Successful attempt resets the lockout counter
    clearFailedAttempts(testUserId);
    const resetState = getLockoutState(testUserId);
    expect(resetState.count).toBe(0);
    expect(resetState.remainingSeconds).toBe(0);
  });

  it("allows single-password vault auto-unlock: derives key and verifies check correctly", async () => {
    const password = "MySecureAccountPassword123!";
    const salt = newSalt();
    const key = await deriveKey(password, salt);
    const check = await encryptJSON(key, { marker: "ok" });

    // Deriving with the same password decrypts successfully
    const sameKey = await deriveKey(password, salt);
    const decrypted = await decryptJSON(sameKey, check);
    expect(decrypted.marker).toBe("ok");

    // Deriving with a wrong password fails decryption
    const wrongKey = await deriveKey("WrongPassword999!", salt);
    await expect(decryptJSON(wrongKey, check)).rejects.toThrow();
  });
});
