import { describe, it, expect } from "vitest";
import { calculateSecurityHealth } from "../components/shared";

describe("Security Health Audit Calculator", () => {
  it("returns 100 A+ for empty credential list", () => {
    const health = calculateSecurityHealth([]);
    expect(health.score).toBe(100);
    expect(health.grade).toBe("A+");
  });

  it("penalizes dummy / placeholder credentials", () => {
    const creds = [
      { id: "1", label: "Test Secret", password: "dummy_token_123", username: "admin", environment: "prod" }
    ];
    const health = calculateSecurityHealth(creds);
    expect(health.score).toBeLessThan(80);
    expect(health.warnings.some((w) => w.includes("dummy/placeholder"))).toBe(true);
  });

  it("flags short passwords under 12 characters", () => {
    const creds = [
      { id: "1", label: "Short Pass", password: "short", username: "user", url: "https://example.com" }
    ];
    const health = calculateSecurityHealth(creds);
    expect(health.warnings.some((w) => w.includes("shorter than 12 characters"))).toBe(true);
  });

  it("gives high score for strong, unique, long secrets", () => {
    const creds = [
      {
        id: "1",
        label: "Production DB",
        password: "v9!xK#98mP$2026_Custodian",
        username: "prod_admin",
        url: "https://aws.amazon.com",
        environment: "prod",
      },
      {
        id: "2",
        label: "Stripe Live Key",
        password: "sk_live_51PXYZ9923812903810293810293",
        username: "stripe_api",
        url: "https://stripe.com",
        environment: "prod",
      }
    ];
    const health = calculateSecurityHealth(creds);
    expect(health.score).toBe(100);
    expect(health.grade).toBe("A+");
    expect(health.warnings.length).toBe(0);
    expect(health.stats.total).toBe(2);
    expect(health.stats.productionCount).toBe(2);
    expect(health.stats.weakCount).toBe(0);
    expect(health.stats.dummyCount).toBe(0);
  });
});
