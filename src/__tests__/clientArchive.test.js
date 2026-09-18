import { describe, it, expect } from "vitest";
import {
  sanitizeFileName,
  formatCredentialsToEnv,
  formatProjectSpecs,
  generateClientSummary,
  generateClientArchiveZip,
} from "../utils/clientArchive";

describe("Client Archive & ZIP Compression Engine", () => {
  const mockClient = {
    id: "client-123",
    name: "Payism / FinTech",
    projects: [
      {
        id: "proj-1",
        name: "Backend Services",
        details: {
          lastDate: "2026-10-15",
          lastPartialDate: "2026-10-01",
          notes: "AWS production specs and database setup.",
          checklist: [
            { text: "Setup RDS Database", completed: true },
            { text: "Configure Stripe Webhooks", completed: false },
          ],
        },
        credentials: [
          {
            id: "cred-1",
            label: "Production DB",
            username: "DATABASE_URL",
            password: "postgres://user:pass@host:5432/db",
            environment: "prod",
            secretType: "database",
          },
          {
            id: "cred-2",
            label: "Stripe Secret Key",
            username: "STRIPE_SECRET_KEY",
            password: "sk_live_998877",
            environment: "prod",
            secretType: "stripe",
          },
        ],
      },
    ],
  };

  describe("sanitizeFileName", () => {
    it("strips illegal path characters", () => {
      expect(sanitizeFileName("Payism / Client : Project * ? < > |")).toBe("Payism_Client_Project");
      expect(sanitizeFileName("")).toBe("Untitled");
      expect(sanitizeFileName(null)).toBe("Untitled");
    });
  });

  describe("formatCredentialsToEnv", () => {
    it("formats credentials into standard KEY=\"VALUE\" env lines", () => {
      const envText = formatCredentialsToEnv(mockClient.projects[0].credentials);
      expect(envText).toContain("DATABASE_URL=\"postgres://user:pass@host:5432/db\"");
      expect(envText).toContain("STRIPE_SECRET_KEY=\"sk_live_998877\"");
    });

    it("returns placeholder when empty", () => {
      const envText = formatCredentialsToEnv([]);
      expect(envText).toContain("No environment credentials stored");
    });
  });

  describe("formatProjectSpecs", () => {
    it("formats project contract deadlines and checklist items", () => {
      const specsText = formatProjectSpecs(mockClient.projects[0]);
      expect(specsText).toContain("Final Client Deadline: 2026-10-15");
      expect(specsText).toContain("AWS production specs and database setup.");
      expect(specsText).toContain("[X] Setup RDS Database");
      expect(specsText).toContain("[ ] Configure Stripe Webhooks");
    });
  });

  describe("generateClientSummary", () => {
    it("includes client name, reason notes, and return instructions", () => {
      const summary = generateClientSummary(mockClient, "Client stopped responding after Phase 1.");
      expect(summary).toContain("Payism / FinTech");
      expect(summary).toContain("Client stopped responding after Phase 1.");
      expect(summary).toContain("Instructions When Client Returns");
      expect(summary).toContain("1 Projects, 2 Total Secrets");
    });
  });

  describe("generateClientArchiveZip", () => {
    it("builds a zip archive with all project folders and files", async () => {
      const zip = await generateClientArchiveZip(mockClient, {
        reasonNotes: "Paused for Q4 budget",
      });

      // Verify root summary
      const summaryFile = zip.file("CLIENT_SUMMARY.md");
      expect(summaryFile).not.toBeNull();
      const summaryContent = await summaryFile.async("string");
      expect(summaryContent).toContain("Paused for Q4 budget");

      // Verify project folder
      const folderName = sanitizeFileName(mockClient.projects[0].name);
      const envFile = zip.file(`${folderName}/credentials.env`);
      expect(envFile).not.toBeNull();
      const envContent = await envFile.async("string");
      expect(envContent).toContain("STRIPE_SECRET_KEY=");

      const jsonFile = zip.file(`${folderName}/credentials.json`);
      expect(jsonFile).not.toBeNull();
      const jsonContent = JSON.parse(await jsonFile.async("string"));
      expect(jsonContent).toHaveLength(2);
      expect(jsonContent[0].label).toBe("Production DB");

      const specsFile = zip.file(`${folderName}/specs_and_deadlines.txt`);
      expect(specsFile).not.toBeNull();
    });
  });
});
