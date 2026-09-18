import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generatePassword,
  generateApiKey,
  generateHexToken,
  generateBase64Secret,
  generateUUID,
  generatePassphrase,
  generateSecret,
  calculateEntropy,
} from "../utils/passwordGenerator";

// Mock crypto.getRandomValues for deterministic tests
const originalGetRandomValues = globalThis.crypto?.getRandomValues;

describe("Password Generator", () => {
  // Ensure crypto.getRandomValues is available (JSDOM / Node)
  beforeEach(() => {
    if (!globalThis.crypto) {
      globalThis.crypto = {};
    }
    if (!globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues = (arr) => {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
        return arr;
      };
    }
    if (!globalThis.crypto.randomUUID) {
      globalThis.crypto.randomUUID = () => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        });
      };
    }
  });

  describe("generatePassword", () => {
    it("generates a password of the specified length", () => {
      const pw = generatePassword({ length: 32 });
      expect(pw.length).toBe(32);
    });

    it("generates a minimum length password (4 chars)", () => {
      const pw = generatePassword({ length: 2 }); // should clamp to 4
      expect(pw.length).toBe(4);
    });

    it("generates a maximum length password (128 chars)", () => {
      const pw = generatePassword({ length: 200 }); // should clamp to 128
      expect(pw.length).toBe(128);
    });

    it("includes lowercase letters when enabled", () => {
      const pw = generatePassword({ length: 64, lowercase: true, uppercase: false, digits: false, symbols: false });
      expect(/[a-z]/.test(pw)).toBe(true);
      expect(/[A-Z]/.test(pw)).toBe(false);
      expect(/[0-9]/.test(pw)).toBe(false);
    });

    it("includes uppercase letters when enabled", () => {
      const pw = generatePassword({ length: 64, lowercase: false, uppercase: true, digits: false, symbols: false });
      expect(/[A-Z]/.test(pw)).toBe(true);
    });

    it("includes digits when enabled", () => {
      const pw = generatePassword({ length: 64, lowercase: false, uppercase: false, digits: true, symbols: false });
      expect(/[0-9]/.test(pw)).toBe(true);
    });

    it("includes symbols when enabled", () => {
      const pw = generatePassword({ length: 64, lowercase: false, uppercase: false, digits: false, symbols: true });
      expect(/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]/.test(pw)).toBe(true);
    });

    it("excludes ambiguous characters when option is set", () => {
      const pw = generatePassword({ length: 100, excludeAmbiguous: true });
      const ambiguous = ["0", "O", "o", "1", "l", "I"];
      for (const ch of ambiguous) {
        expect(pw.includes(ch)).toBe(false);
      }
    });

    it("generates unique passwords each time", () => {
      const pw1 = generatePassword({ length: 32 });
      const pw2 = generatePassword({ length: 32 });
      expect(pw1).not.toBe(pw2); // Cryptographic random — virtually impossible to match
    });

    it("falls back to lowercase+digits when no character sets are selected", () => {
      const pw = generatePassword({ length: 32, lowercase: false, uppercase: false, digits: false, symbols: false });
      expect(pw.length).toBe(32);
      expect(/^[a-z0-9]+$/.test(pw)).toBe(true);
    });
  });

  describe("generateApiKey", () => {
    it("generates a hex API key of the specified length", () => {
      const key = generateApiKey({ length: 48, format: "hex" });
      expect(key.length).toBe(48);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it("generates a base64 API key of the specified length", () => {
      const key = generateApiKey({ length: 48, format: "base64" });
      expect(key.length).toBe(48);
      expect(/^[A-Za-z0-9\-_]+$/.test(key)).toBe(true);
    });

    it("prepends a prefix when specified", () => {
      const key = generateApiKey({ length: 32, format: "hex", prefix: "sk_live_" });
      expect(key.startsWith("sk_live_")).toBe(true);
      expect(key.length).toBe(32 + "sk_live_".length);
    });

    it("clamps length to min 8", () => {
      const key = generateApiKey({ length: 2, format: "hex" });
      expect(key.length).toBe(8);
    });
  });

  describe("generateHexToken", () => {
    it("generates a hex token of the specified length", () => {
      const hex = generateHexToken(64);
      expect(hex.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(hex)).toBe(true);
    });

    it("clamps to min 8 and max 256", () => {
      expect(generateHexToken(2).length).toBe(8);
      expect(generateHexToken(999).length).toBe(256);
    });
  });

  describe("generateBase64Secret", () => {
    it("generates a URL-safe base64 secret of the specified length", () => {
      const b64 = generateBase64Secret(44);
      expect(b64.length).toBe(44);
      expect(/^[A-Za-z0-9\-_]+$/.test(b64)).toBe(true);
    });
  });

  describe("generateUUID", () => {
    it("generates a valid UUID v4 format", () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(uuid)).toBe(true);
    });

    it("generates unique UUIDs", () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe("generatePassphrase", () => {
    it("generates a passphrase with the specified word count", () => {
      const pp = generatePassphrase({ wordCount: 5, separator: "-" });
      const words = pp.split("-");
      expect(words.length).toBe(5);
    });

    it("capitalizes words when option is set", () => {
      const pp = generatePassphrase({ wordCount: 4, separator: "-", capitalize: true });
      const words = pp.split("-");
      for (const w of words) {
        expect(w[0]).toBe(w[0].toUpperCase());
      }
    });

    it("uses the specified separator", () => {
      const pp = generatePassphrase({ wordCount: 4, separator: "_" });
      expect(pp.includes("_")).toBe(true);
    });

    it("clamps word count to 3-10 range", () => {
      const pp1 = generatePassphrase({ wordCount: 1 });
      expect(pp1.split("-").length).toBe(3); // clamped to 3

      const pp2 = generatePassphrase({ wordCount: 20 });
      expect(pp2.split("-").length).toBe(10); // clamped to 10
    });
  });

  describe("generateSecret (unified)", () => {
    it("delegates to the correct generator based on mode", () => {
      const pw = generateSecret("password", { length: 16 });
      expect(pw.length).toBe(16);

      const hex = generateSecret("hex", { length: 32 });
      expect(/^[0-9a-f]+$/.test(hex)).toBe(true);

      const uuid = generateSecret("uuid");
      expect(uuid).toMatch(/^[0-9a-f]{8}-/i);

      const pp = generateSecret("passphrase", { wordCount: 4, separator: "." });
      expect(pp.split(".").length).toBe(4);
    });
  });

  describe("calculateEntropy", () => {
    it("calculates correct entropy for password mode", () => {
      const e = calculateEntropy("password", { length: 24, lowercase: true, uppercase: true, digits: true, symbols: true });
      expect(e.bits).toBeGreaterThan(100); // ~157 bits for 24 chars with all charsets
      expect(["Very Strong", "Extreme"]).toContain(e.label);
    });

    it("returns 'Weak' for short passwords with small charset", () => {
      const e = calculateEntropy("password", { length: 4, lowercase: true, uppercase: false, digits: false, symbols: false });
      expect(e.bits).toBeLessThan(40);
      expect(e.label).toBe("Weak");
    });

    it("returns fixed 122 bits for UUID v4", () => {
      const e = calculateEntropy("uuid");
      expect(e.bits).toBe(122);
      expect(e.label).toBe("Very Strong");
    });

    it("calculates entropy for passphrases based on wordlist size", () => {
      const e = calculateEntropy("passphrase", { wordCount: 5 });
      expect(e.bits).toBeGreaterThan(40); // ~51 bits for 5 words from ~1200 wordlist
    });

    it("calculates entropy for hex tokens", () => {
      const e = calculateEntropy("hex", { length: 64 });
      expect(e.bits).toBe(256);
      expect(e.label).toBe("Extreme");
    });

    it("returns a color property for each strength level", () => {
      const weak = calculateEntropy("password", { length: 4, lowercase: true });
      const strong = calculateEntropy("hex", { length: 64 });
      expect(weak.color).toBeTruthy();
      expect(strong.color).toBeTruthy();
      expect(weak.color).not.toBe(strong.color);
    });
  });

  describe("Security guarantees", () => {
    it("does NOT use Math.random in the generated output", () => {
      // Spy on Math.random — the generator should never call it
      const spy = vi.spyOn(Math, "random");
      spy.mockClear();

      // Only run this test if native crypto is available
      if (originalGetRandomValues) {
        globalThis.crypto.getRandomValues = originalGetRandomValues;
        generatePassword({ length: 32 });
        expect(spy).not.toHaveBeenCalled();
      }

      spy.mockRestore();
    });

    it("generates different values on each call (not deterministic)", () => {
      const results = new Set();
      for (let i = 0; i < 20; i++) {
        results.add(generatePassword({ length: 32 }));
      }
      // 20 unique passwords (statistically certain with crypto random)
      expect(results.size).toBe(20);
    });
  });
});
