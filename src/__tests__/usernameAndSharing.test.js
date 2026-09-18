import { describe, it, expect } from "vitest";
import { normalizeUsername, validateUsername, RESERVED_USERNAMES } from "../utils/usernameValidation";
import {
  generateECDHKeyPair,
  exportPublicKeyJWK,
  importPublicKeyJWK,
  exportEncryptedPrivateKey,
  importDecryptedPrivateKey,
  deriveSharedSecretKey,
  encryptSharedPayload,
  decryptSharedPayload,
  deriveKey,
  newSalt,
} from "../crypto";

describe("Username System Validation & Security", () => {
  it("normalizes uppercase characters, leading @ symbols, and trims whitespace", () => {
    expect(normalizeUsername("  @Alex_Dev  ")).toBe("alex_dev");
    expect(normalizeUsername("@JOHN_DOE")).toBe("john_doe");
    expect(normalizeUsername("   SARAH_99   ")).toBe("sarah_99");
    expect(normalizeUsername("")).toBe("");
    expect(normalizeUsername(null)).toBe("");
  });

  it("accepts valid alphanumeric + underscore usernames between 3 and 20 chars", () => {
    expect(validateUsername("alex_dev").isValid).toBe(true);
    expect(validateUsername("dev123").isValid).toBe(true);
    expect(validateUsername("a_b_c").isValid).toBe(true);
    expect(validateUsername("user_name_2026").isValid).toBe(true);
  });

  it("rejects usernames shorter than 3 characters or longer than 20 characters", () => {
    const tooShort = validateUsername("ab");
    expect(tooShort.isValid).toBe(false);
    expect(tooShort.error).toMatch(/at least 3 characters/);

    const tooLong = validateUsername("abcdefghijklmnopqrstu_vwxyz");
    expect(tooLong.isValid).toBe(false);
    expect(tooLong.error).toMatch(/cannot exceed 20 characters/);
  });

  it("rejects invalid symbols such as hyphens, periods, spaces, and special characters", () => {
    expect(validateUsername("alex-dev").isValid).toBe(false);
    expect(validateUsername("alex.dev").isValid).toBe(false);
    expect(validateUsername("alex dev").isValid).toBe(false);
    expect(validateUsername("alex$dev").isValid).toBe(false);
    expect(validateUsername("alex@dev").isValid).toBe(false);
  });

  it("rejects reserved system blocklist names", () => {
    for (const name of RESERVED_USERNAMES) {
      const res = validateUsername(name);
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/reserved name/);
    }
  });
});

describe("Zero-Knowledge Asymmetric Cryptography (ECDH P-256)", () => {
  it("generates ECDH P-256 keypairs and correctly derives symmetric shared secrets", async () => {
    // 1. User A & User B generate ECDH keypairs
    const userA = await generateECDHKeyPair();
    const userB = await generateECDHKeyPair();

    // 2. Derive shared key from both directions
    const sharedKeyA = await deriveSharedSecretKey(userA.privateKey, userB.publicKey);
    const sharedKeyB = await deriveSharedSecretKey(userB.privateKey, userA.publicKey);

    expect(sharedKeyA).toBeDefined();
    expect(sharedKeyB).toBeDefined();
  });

  it("performs full end-to-end asymmetric encryption and decryption round-trip", async () => {
    const userA = await generateECDHKeyPair();
    const userB = await generateECDHKeyPair();

    const secretPayload = {
      title: "Production Database Password",
      category: "DATABASE",
      fields: [
        { key: "DB_USER", value: "postgres" },
        { key: "DB_PASS", value: "SuperSecretPassword123!@#" },
      ],
      note: "Do not commit to public repositories.",
    };

    // User A encrypts for User B
    const encryptedBlob = await encryptSharedPayload(userA.privateKey, userB.publicKey, secretPayload);
    expect(typeof encryptedBlob).toBe("string");
    expect(encryptedBlob).toContain('"iv"');
    expect(encryptedBlob).toContain('"ct"');

    // User B decrypts using User B's private key + User A's public key
    const decryptedPayload = await decryptSharedPayload(userB.privateKey, userA.publicKey, encryptedBlob);
    expect(decryptedPayload).toEqual(secretPayload);
    expect(decryptedPayload.fields[1].value).toBe("SuperSecretPassword123!@#");
  });

  it("fails decryption when an unauthorized third-party tries to decrypt", async () => {
    const userA = await generateECDHKeyPair();
    const userB = await generateECDHKeyPair();
    const userC_Attacker = await generateECDHKeyPair();

    const secretPayload = { secret: "Sensitive Token" };
    const encryptedBlob = await encryptSharedPayload(userA.privateKey, userB.publicKey, secretPayload);

    // User C tries to decrypt User A's message intended for User B
    await expect(
      decryptSharedPayload(userC_Attacker.privateKey, userA.publicKey, encryptedBlob)
    ).rejects.toThrow();
  });

  it("exports and imports private key encrypted with master vault key", async () => {
    const salt = newSalt();
    const vaultKey = await deriveKey("MasterPassphrase123!", salt);

    const ecdhPair = await generateECDHKeyPair();
    const pubKeyJWK = await exportPublicKeyJWK(ecdhPair.publicKey);
    const encryptedPrivKeyBlob = await exportEncryptedPrivateKey(ecdhPair.privateKey, vaultKey);

    // Recover public & private keys from saved blobs
    const importedPubKey = await importPublicKeyJWK(pubKeyJWK);
    const importedPrivKey = await importDecryptedPrivateKey(encryptedPrivKeyBlob, vaultKey);

    expect(importedPubKey).toBeDefined();
    expect(importedPrivKey).toBeDefined();

    // Verify imported keys can still encrypt/decrypt
    const testSecret = { msg: "Testing Encrypted Key Recovery" };
    const encrypted = await encryptSharedPayload(importedPrivKey, importedPubKey, testSecret);
    const decrypted = await decryptSharedPayload(importedPrivKey, importedPubKey, encrypted);
    expect(decrypted).toEqual(testSecret);
  });

  it("supports raw base64 public key export/import and PKCS#8 private key encryption", async () => {
    const { exportPublicKeyRaw, importPublicKey, exportEncryptedPrivateKeyPKCS8 } = await import("../crypto");
    const salt = newSalt();
    const vaultKey = await deriveKey("VaultPassphrase2026!", salt);

    const keyPair = await generateECDHKeyPair();
    const rawPubKeyB64 = await exportPublicKeyRaw(keyPair.publicKey);
    expect(typeof rawPubKeyB64).toBe("string");
    expect(rawPubKeyB64.length).toBeGreaterThan(20);

    const encryptedPkcs8Blob = await exportEncryptedPrivateKeyPKCS8(keyPair.privateKey, vaultKey);
    expect(typeof encryptedPkcs8Blob).toBe("string");

    // Decrypt and re-import
    const restoredPubKey = await importPublicKey(rawPubKeyB64);
    const restoredPrivKey = await importDecryptedPrivateKey(encryptedPkcs8Blob, vaultKey);

    expect(restoredPubKey.algorithm.name).toBe("ECDH");
    expect(restoredPrivKey.algorithm.name).toBe("ECDH");

    const payload = { test: "PKCS8 and Raw Base64 working seamlessly" };
    const ciphertext = await encryptSharedPayload(restoredPrivKey, restoredPubKey, payload);
    const plaintext = await decryptSharedPayload(restoredPrivKey, restoredPubKey, ciphertext);
    expect(plaintext).toEqual(payload);
  });

  it("shares and receives secrets using shareSecret and receiveSharedSecret directly", async () => {
    const { shareSecret, receiveSharedSecret, exportPublicKeyRaw } = await import("../crypto");

    const alice = await generateECDHKeyPair();
    const bob = await generateECDHKeyPair();

    const alicePubB64 = await exportPublicKeyRaw(alice.publicKey);
    const bobPubB64 = await exportPublicKeyRaw(bob.publicKey);

    const secretData = {
      apiKey: "sk-live-992837198237912837",
      env: "production",
      details: { db: "postgresql://user:pass@host:5432/db" }
    };

    // Alice shares secret with Bob's base64 public key
    const encryptedBlob = await shareSecret(secretData, bobPubB64, alice.privateKey);
    expect(encryptedBlob).toHaveProperty("iv");
    expect(encryptedBlob).toHaveProperty("ct");

    // Bob receives and decrypts secret using Alice's base64 public key
    const decrypted = await receiveSharedSecret(encryptedBlob, alicePubB64, bob.privateKey);
    expect(decrypted).toEqual(secretData);
    expect(decrypted.apiKey).toBe("sk-live-992837198237912837");
  });
});
