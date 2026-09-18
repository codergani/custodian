import { describe, it, expect } from "vitest";
import {
  isPersonalClient,
  classifyPersonalSecret,
  getFreelanceClients,
  PERSONAL_WORKSPACE_NAME,
} from "../utils/personalSpace";

describe("Personal Space Utilities", () => {
  describe("isPersonalClient", () => {
    it("identifies personal clients by name variants", () => {
      expect(isPersonalClient({ name: "Personal Space" })).toBe(true);
      expect(isPersonalClient({ name: "personal vault" })).toBe(true);
      expect(isPersonalClient({ name: "My Vault" })).toBe(true);
      expect(isPersonalClient({ name: "my space" })).toBe(true);
      expect(isPersonalClient({ name: "Personal" })).toBe(true);
      expect(isPersonalClient({ is_personal: true, name: "Custom Name" })).toBe(true);
    });

    it("rejects non-personal freelance clients", () => {
      expect(isPersonalClient({ name: "Payism" })).toBe(false);
      expect(isPersonalClient({ name: "Acme Corp" })).toBe(false);
      expect(isPersonalClient(null)).toBe(false);
      expect(isPersonalClient({})).toBe(false);
    });
  });

  describe("getFreelanceClients", () => {
    it("excludes the personal space from the client list", () => {
      const allClients = [
        { id: "1", name: "Personal Space" },
        { id: "2", name: "Payism" },
        { id: "3", name: "Acme Corp" },
      ];
      const freelance = getFreelanceClients(allClients);
      expect(freelance.length).toBe(2);
      expect(freelance.map((c) => c.name)).toEqual(["Payism", "Acme Corp"]);
    });

    it("handles empty or personal-only lists", () => {
      expect(getFreelanceClients([])).toEqual([]);
      expect(getFreelanceClients([{ name: "Personal Space" }])).toEqual([]);
    });
  });

  describe("classifyPersonalSecret", () => {
    it("classifies web & email logins", () => {
      expect(classifyPersonalSecret({ secretType: "login", label: "Gmail" })).toBe("logins");
      expect(classifyPersonalSecret({ label: "Netflix Account", username: "user@netflix.com" })).toBe("logins");
      expect(classifyPersonalSecret({ label: "Instagram" })).toBe("logins");
    });

    it("classifies mobile PINs and Wi-Fi passcodes", () => {
      expect(classifyPersonalSecret({ secretType: "pin", label: "HDFC Bank App" })).toBe("pins");
      expect(classifyPersonalSecret({ label: "Home Wi-Fi Password" })).toBe("pins");
      expect(classifyPersonalSecret({ label: "Phone PIN Unlock" })).toBe("pins");
    });

    it("classifies secure notes and crypto recovery seeds", () => {
      expect(classifyPersonalSecret({ secretType: "note", label: "Ledger 24 Words" })).toBe("notes");
      expect(classifyPersonalSecret({ label: "Metamask Seed Phrase" })).toBe("notes");
      expect(classifyPersonalSecret({ label: "Private Locker Notes" })).toBe("notes");
    });

    it("classifies cards and banking credentials", () => {
      expect(classifyPersonalSecret({ secretType: "card", label: "Debit Card" })).toBe("cards");
      expect(classifyPersonalSecret({ label: "Visa Credit Card" })).toBe("cards");
    });

    it("classifies developer keys safely under notes without dev tab", () => {
      expect(classifyPersonalSecret({ secretType: "api_key", label: "OpenAI Key" })).toBe("notes");
      expect(classifyPersonalSecret({ secretType: "database", label: "Supabase URL" })).toBe("notes");
    });
  });
});
