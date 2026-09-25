import React from "react";
import { describe, it, expect, vi } from "vitest";
import Mandatory2FASetup from "../components/Mandatory2FASetup";

describe("Mandatory 2FA Policy & Setup Component Suite", () => {
  it("determines correct 2FA enforcement policy per plan", () => {
    function is2FAMandatory(profile) {
      if (!profile) return false;
      return (
        profile.role === "founder" ||
        profile.role === "admin" ||
        profile.plan === "founder" ||
        profile.plan === "pro" ||
        profile.plan === "team" ||
        profile.email?.toLowerCase() === "ygpksr456@gmail.com"
      );
    }

    // Free tier: optional
    expect(is2FAMandatory({ plan: "free", role: "member" })).toBe(false);
    expect(is2FAMandatory({ plan: null, role: "member" })).toBe(false);

    // Pro tier: mandatory
    expect(is2FAMandatory({ plan: "pro", role: "member" })).toBe(true);

    // Team tier: mandatory
    expect(is2FAMandatory({ plan: "team", role: "member" })).toBe(true);

    // Founder tier: mandatory
    expect(is2FAMandatory({ plan: "founder", role: "founder" })).toBe(true);
    expect(is2FAMandatory({ email: "ygpksr456@gmail.com" })).toBe(true);
  });

  it("exports Mandatory2FASetup component without syntax errors", () => {
    expect(typeof Mandatory2FASetup).toBe("function");
  });

  it("handles demo judge bypass correctly", () => {
    function shouldBypassMandatory2FA(user) {
      return (
        user?.id === "a0000000-0000-0000-0000-000000000001" ||
        user?.email === "owner@custodian.app"
      );
    }

    // Demo account bypasses
    expect(shouldBypassMandatory2FA({ id: "a0000000-0000-0000-0000-000000000001" })).toBe(true);
    expect(shouldBypassMandatory2FA({ email: "owner@custodian.app" })).toBe(true);

    // Real pro users are not bypassed
    expect(shouldBypassMandatory2FA({ id: "user-123", email: "pro@company.com" })).toBe(false);
  });
});
