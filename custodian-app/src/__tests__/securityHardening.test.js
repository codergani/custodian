import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import {
  calculateLockoutDuration,
  getLockoutState,
  recordFailedAttempt,
  clearFailedAttempts,
  getAutoLockMinutes,
  setAutoLockMinutes,
  AUTOLOCK_OPTIONS,
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

describe("Security Hardening - Brute Force Protection", () => {
  const testUserId = "test-user-sec-123";

  beforeEach(() => {
    localStorage.clear();
  });

  it("calculates exponential backoff lockout duration correctly", () => {
    // 0 to 4 attempts: no lockout
    expect(calculateLockoutDuration(0)).toBe(0);
    expect(calculateLockoutDuration(1)).toBe(0);
    expect(calculateLockoutDuration(2)).toBe(0);
    expect(calculateLockoutDuration(3)).toBe(0);
    expect(calculateLockoutDuration(4)).toBe(0);

    // 5 attempts: 30 seconds (30 * 2^0)
    expect(calculateLockoutDuration(5)).toBe(30);

    // 6 attempts: 60 seconds (30 * 2^1)
    expect(calculateLockoutDuration(6)).toBe(60);

    // 7 attempts: 120 seconds (30 * 2^2)
    expect(calculateLockoutDuration(7)).toBe(120);

    // 8 attempts: 240 seconds (30 * 2^3)
    expect(calculateLockoutDuration(8)).toBe(240);

    // 9 attempts: 480 seconds (30 * 2^4)
    expect(calculateLockoutDuration(9)).toBe(480);

    // 10 attempts: 900 seconds (capped at 15 mins)
    expect(calculateLockoutDuration(10)).toBe(900);
    expect(calculateLockoutDuration(20)).toBe(900);
  });

  it("records failed attempts and calculates lockout state in localStorage", () => {
    // Initial state
    const initial = getLockoutState(testUserId);
    expect(initial.count).toBe(0);
    expect(initial.remainingSeconds).toBe(0);

    // 4 failed attempts: no lockout yet
    for (let i = 1; i <= 4; i++) {
      const state = recordFailedAttempt(testUserId);
      expect(state.count).toBe(i);
      expect(state.remainingSeconds).toBe(0);
    }

    // 5th failed attempt: triggers 30s lockout
    const fifth = recordFailedAttempt(testUserId);
    expect(fifth.count).toBe(5);
    expect(fifth.remainingSeconds).toBe(30);
    expect(fifth.lockedUntil).toBeGreaterThan(Date.now());

    // 6th failed attempt: triggers 60s lockout
    const sixth = recordFailedAttempt(testUserId);
    expect(sixth.count).toBe(6);
    expect(sixth.remainingSeconds).toBe(60);

    // State is retrievable
    const retrieved = getLockoutState(testUserId);
    expect(retrieved.count).toBe(6);
    expect(retrieved.remainingSeconds).toBeGreaterThan(0);

    // Clear failed attempts upon successful unlock
    clearFailedAttempts(testUserId);
    const cleared = getLockoutState(testUserId);
    expect(cleared.count).toBe(0);
    expect(cleared.remainingSeconds).toBe(0);
  });
});

describe("Security Hardening - Auto-Lock Settings", () => {
  const testUserId = "test-user-autolock-456";

  beforeEach(() => {
    localStorage.clear();
  });

  it("provides standard auto-lock options including 1min, 5min, 15min, 30min, Never", () => {
    const values = AUTOLOCK_OPTIONS.map((o) => o.value);
    expect(values).toContain(1);
    expect(values).toContain(5);
    expect(values).toContain(15);
    expect(values).toContain(30);
    expect(values).toContain(0);
  });

  it("defaults to 5 minutes when no preference is saved", () => {
    expect(getAutoLockMinutes(testUserId)).toBe(5);
  });

  it("saves and retrieves custom auto-lock preferences", () => {
    setAutoLockMinutes(testUserId, 1);
    expect(getAutoLockMinutes(testUserId)).toBe(1);

    setAutoLockMinutes(testUserId, 0); // Never
    expect(getAutoLockMinutes(testUserId)).toBe(0);

    setAutoLockMinutes(testUserId, 5);
    expect(getAutoLockMinutes(testUserId)).toBe(5);
  });
});

describe("Zero-Knowledge Cryptographic Audit Verification", () => {
  it("executes 100% client-side AES-256-GCM encryption & decryption with PBKDF2 key derivation", async () => {
    const masterPassword = "SuperSecureMasterPassphrase!2026";
    const salt = newSalt();
    const key = await deriveKey(masterPassword, salt);

    const secretPayload = {
      title: "Production AWS Root Credentials",
      username: "admin@enterprise.com",
      password: "UltraSecretPassword99#",
      url: "https://aws.amazon.com",
      notes: "Never disclose to anyone",
    };

    // Client-side encryption produces ciphertext blob
    const encryptedBlob = await encryptJSON(key, secretPayload);
    const parsedBlob = JSON.parse(encryptedBlob);

    // Ensure blob contains IV and ciphertext only, no plaintext
    expect(parsedBlob).toHaveProperty("iv");
    expect(parsedBlob).toHaveProperty("ct");
    expect(encryptedBlob).not.toContain("UltraSecretPassword99#");
    expect(encryptedBlob).not.toContain("admin@enterprise.com");

    // Client-side decryption restores original secret in memory
    const decrypted = await decryptJSON(key, encryptedBlob);
    expect(decrypted).toEqual(secretPayload);
  });
});
