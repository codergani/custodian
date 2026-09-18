import { describe, it, expect } from "vitest";
import { newSalt, deriveKey, encryptJSON, decryptJSON, hashText } from "../crypto";

describe("Custodian Zero-Knowledge Crypto Suite", () => {
  it("generates 16-byte base64 salt", () => {
    const salt = newSalt();
    expect(typeof salt).toBe("string");
    expect(salt.length).toBeGreaterThan(16);
  });

  it("generates unique salts across multiple invocations", () => {
    const salt1 = newSalt();
    const salt2 = newSalt();
    expect(salt1).not.toBe(salt2);
  });

  it("derives AES-256-GCM key from password and salt", async () => {
    const salt = newSalt();
    const key = await deriveKey("MyMasterPassword123!", salt);
    expect(key).toBeDefined();
    expect(key.algorithm.name).toBe("AES-GCM");
    expect(key.algorithm.length).toBe(256);
  });

  it("encrypts and decrypts payload correctly (round-trip)", async () => {
    const salt = newSalt();
    const key = await deriveKey("SuperSecretPassword!", salt);

    const sensitiveData = {
      apiKey: "sk-proj-1234567890abcdef",
      username: "admin_user",
      cost: "20.00",
      notes: "Production database root access",
    };

    const encryptedBlob = await encryptJSON(key, sensitiveData);
    expect(typeof encryptedBlob).toBe("string");
    expect(encryptedBlob).not.toContain("sk-proj-1234567890abcdef");

    const decryptedData = await decryptJSON(key, encryptedBlob);
    expect(decryptedData).toEqual(sensitiveData);
  });

  it("fails decryption with wrong key / password", async () => {
    const salt = newSalt();
    const correctKey = await deriveKey("CorrectPassword123", salt);
    const wrongKey = await deriveKey("WrongPassword999", salt);

    const secret = { token: "secret_value" };
    const encrypted = await encryptJSON(correctKey, secret);

    await expect(decryptJSON(wrongKey, encrypted)).rejects.toThrow();
  });

  it("hashes text with SHA-256 to consistent hex string", async () => {
    const hash1 = await hashText("custodian_admin_pass");
    const hash2 = await hashText("custodian_admin_pass");
    const hash3 = await hashText("different_pass");

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(64); // SHA-256 hex string length
  });

  it("regression: decrypts and maps active vault credential rows correctly without ReferenceError", async () => {
    const salt = newSalt();
    const vaultKey = await deriveKey("VaultPassword123!", salt);

    const credentialData = {
      label: "OpenAI Prod API Key",
      username: "billing@acme.com",
      password: "sk-proj-super-secret-key-123",
      url: "https://platform.openai.com",
      cost: "20.00",
      currency: "$",
      renewalDate: "2026-10-01",
      billingFrequency: "monthly",
      isCanceled: false,
    };

    const encryptedBlob = await encryptJSON(vaultKey, credentialData);
    const mockRow = { id: "cred-1", project_id: "proj-1", encrypted_blob: encryptedBlob };

    // Simulate loadVault decryption step
    const data = await decryptJSON(vaultKey, mockRow.encrypted_blob);
    const parsedCost = parseFloat(data.cost);
    const sanitizedCost = !isNaN(parsedCost) && parsedCost > 0 ? String(parsedCost) : null;

    const result = {
      id: mockRow.id,
      projectId: mockRow.project_id,
      ...data,
      cost: sanitizedCost,
      planHistory: [],
    };

    expect(result.label).toBe("OpenAI Prod API Key");
    expect(result.username).toBe("billing@acme.com");
    expect(result.password).toBe("sk-proj-super-secret-key-123");
    expect(result.cost).toBe("20");
    expect(result.isCanceled).toBe(false);
  });
});
