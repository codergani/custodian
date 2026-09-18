import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isBiometricsAvailable,
  isBiometricEnabled,
  enableBiometricUnlock,
  unlockWithBiometrics,
  disableBiometricUnlock,
  authenticateBiometrics,
} from "../native/nativeBridge";
import { deriveKey, exportKeyRaw, importKeyRaw, newSalt } from "../crypto";

// Mock storage for Node test environment
const mockStorage = new Map();
const localStorageMock = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
  get values() {
    return Array.from(mockStorage.values());
  },
};
globalThis.localStorage = localStorageMock;
globalThis.sessionStorage = localStorageMock;

// Mock window and navigator.credentials for Node
if (typeof globalThis.window === "undefined") {
  globalThis.window = {
    PublicKeyCredential: {
      isUserVerifyingPlatformAuthenticatorAvailable: async () => true,
    },
    location: { hostname: "localhost" },
  };
}

if (typeof globalThis.navigator === "undefined") {
  globalThis.navigator = {
    credentials: {
      get: async () => ({ id: "mock_cred_123" }),
    },
  };
} else if (!globalThis.navigator.credentials) {
  globalThis.navigator.credentials = {
    get: async () => ({ id: "mock_cred_123" }),
  };
}

describe("Biometric Hardware Convenience Layer", () => {
  const testUserId = "user_test_bio_9988";

  beforeEach(() => {
    mockStorage.clear();
    vi.restoreAllMocks();
  });

  it("checks biometric availability without throwing errors", async () => {
    const available = await isBiometricsAvailable();
    expect(typeof available).toBe("boolean");
  });

  it("enrolls biometric unlock by encrypting vault key without plaintext storage", async () => {
    const salt = newSalt();
    const vaultKey = await deriveKey("master-secret-password-123", salt);
    const rawKeyB64 = await exportKeyRaw(vaultKey);

    expect(isBiometricEnabled(testUserId)).toBe(false);

    const enrolled = await enableBiometricUnlock(testUserId, rawKeyB64);
    expect(enrolled).toBe(true);
    expect(isBiometricEnabled(testUserId)).toBe(true);

    // Verify raw key is NEVER stored in plaintext in localStorage
    const allStoredValues = Array.from(mockStorage.values());
    expect(allStoredValues).not.toContain(rawKeyB64);
    for (const val of allStoredValues) {
      expect(val.includes(rawKeyB64)).toBe(false);
    }

    // Verify encrypted blob structure
    const storedBlob = localStorage.getItem(`custodian_bio_enc_vault_${testUserId}`);
    expect(storedBlob).toBeDefined();
    const parsed = JSON.parse(storedBlob);
    expect(parsed.iv).toBeDefined();
    expect(parsed.ct).toBeDefined();
    expect(parsed.ct).not.toBe(rawKeyB64);
  });

  it("authenticates and successfully decrypts raw vault key matching the original key", async () => {
    const salt = newSalt();
    const originalVaultKey = await deriveKey("my-secure-vault-passcode", salt);
    const originalRawKeyB64 = await exportKeyRaw(originalVaultKey);

    await enableBiometricUnlock(testUserId, originalRawKeyB64);

    const retrievedRawKeyB64 = await unlockWithBiometrics(testUserId);
    expect(retrievedRawKeyB64).toBe(originalRawKeyB64);

    // Re-importing the key should yield a functional crypto key
    const importedKey = await importKeyRaw(retrievedRawKeyB64);
    expect(importedKey).toBeDefined();
    expect(importedKey.algorithm.name).toBe("AES-GCM");
  });

  it("invalidates and purges biometric keys on disableBiometricUnlock", async () => {
    const salt = newSalt();
    const vaultKey = await deriveKey("temporary-passcode-456", salt);
    const rawKeyB64 = await exportKeyRaw(vaultKey);

    await enableBiometricUnlock(testUserId, rawKeyB64);
    expect(isBiometricEnabled(testUserId)).toBe(true);

    disableBiometricUnlock(testUserId);
    expect(isBiometricEnabled(testUserId)).toBe(false);
    expect(localStorage.getItem(`custodian_bio_enc_vault_${testUserId}`)).toBeNull();
    expect(localStorage.getItem(`custodian_bio_enabled_${testUserId}`)).toBeNull();

    const afterPurgeKey = await unlockWithBiometrics(testUserId);
    expect(afterPurgeKey).toBeNull();
  });
});
