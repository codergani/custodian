import { describe, it, expect } from "vitest";
import {
  formatAsDotEnv,
  formatAsJSON,
  formatAsDocker,
  formatAsShellExports,
  formatAsVercelJSON,
  formatAsGitHubActions,
  computeEnvironmentMatrix,
} from "../utils/envFormatters";
import { calculateProjectReadiness } from "../utils/projectReadiness";

describe("Environment Studio Formatter & Matrix Engine", () => {
  const sampleCreds = [
    { title: "SUPABASE_URL", password: "https://xyz.supabase.co", environment: "global", isRequired: true },
    { title: "STRIPE_SECRET_KEY", password: "sk_test_12345", environment: "dev", isRequired: true },
    { title: "STRIPE_SECRET_KEY", password: "sk_live_99999", environment: "prod", isRequired: true },
    { title: "SENTRY_DSN", password: "https://sentry.io/123", environment: "dev", isRequired: true },
    { title: "SENTRY_DSN", password: "https://sentry.io/456", environment: "staging", isRequired: true },
  ];

  it("computes environment matrix and correctly detects missing production variable", () => {
    const matrix = computeEnvironmentMatrix(sampleCreds);

    expect(matrix.totalVariables).toBe(3); // SUPABASE_URL, STRIPE_SECRET_KEY, SENTRY_DSN

    // SENTRY_DSN exists in dev and staging, but has no prod or global entry
    expect(matrix.missingProd.length).toBe(1);
    expect(matrix.missingProd[0].key).toBe("SENTRY_DSN");

    // SUPABASE_URL is global, so it satisfies prod
    const supabaseRow = matrix.rows.find((r) => r.key === "SUPABASE_URL");
    expect(supabaseRow.global).not.toBeNull();
  });

  it("formats variables as standard .env file format", () => {
    const dotEnv = formatAsDotEnv(sampleCreds, { includeComments: false });
    expect(dotEnv).toContain("SUPABASE_URL=https://xyz.supabase.co");
    expect(dotEnv).toContain("STRIPE_SECRET_KEY=sk_test_12345");
  });

  it("formats variables as JSON", () => {
    const jsonStr = formatAsJSON(sampleCreds);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.SUPABASE_URL).toBe("https://xyz.supabase.co");
  });

  it("formats variables as Docker flags and shell exports", () => {
    const dockerFlags = formatAsDocker(sampleCreds, "flags");
    expect(dockerFlags).toContain('-e SUPABASE_URL="https://xyz.supabase.co"');

    const shell = formatAsShellExports(sampleCreds);
    expect(shell).toContain('export SUPABASE_URL="https://xyz.supabase.co"');
  });

  it("formats variables for Vercel JSON and GitHub Actions", () => {
    const vercel = formatAsVercelJSON(sampleCreds, "production");
    const parsedVercel = JSON.parse(vercel);
    expect(parsedVercel.some((v) => v.key === "SUPABASE_URL")).toBe(true);

    const gh = formatAsGitHubActions(sampleCreds);
    expect(gh).toContain("SUPABASE_URL: ${{ secrets.SUPABASE_URL }}");
  });
});

describe("Project Operational Readiness Engine", () => {
  it("calculates accurate score for a fully configured production project", () => {
    const fullProject = {
      id: "p1",
      name: "Acme Web App",
      credentials: [
        { title: "DATABASE_URL", password: "postgresql://user:pass@db.com:5432/prod", environment: "prod", secretType: "database" },
        { title: "STRIPE_SECRET_KEY", password: "sk_live_verylongsecuretoken1234567890", environment: "prod", secretType: "stripe" },
        { title: "NEXT_PUBLIC_APP_URL", password: "https://acme.com", environment: "global" },
      ],
      details: {
        deployment: {
          repository: "https://github.com/acme/app",
          productionUrl: "https://acme.com",
          platform: "Vercel",
        },
      },
    };

    const readiness = calculateProjectReadiness(fullProject, []);
    expect(readiness.score).toBeGreaterThanOrEqual(80);
    expect(readiness.status).toBe("production_ready");
    expect(readiness.issues.length).toBe(0);
  });

  it("flags missing database and missing production variables with transparent penalties", () => {
    const incompleteProject = {
      id: "p2",
      name: "Bare Project",
      credentials: [
        { title: "SENTRY_KEY", password: "abc", environment: "dev", isRequired: true },
      ],
      details: {},
    };

    const readiness = calculateProjectReadiness(incompleteProject, []);
    expect(readiness.score).toBeLessThan(50);
    expect(readiness.issues.some((i) => i.includes("missing"))).toBe(true);
    expect(readiness.issues.some((i) => i.includes("database"))).toBe(true);
  });
});
