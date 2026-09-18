import { describe, it, expect } from "vitest";
import { t } from "../i18n/index";

describe("i18n Localization System", () => {
  it("translates known keys into English", () => {
    expect(t("nav.vault")).toBe("Vault");
    expect(t("nav.watchdog")).toBe("Watchdog");
    expect(t("nav.workspace")).toBe("Workspace");
  });

  it("falls back to key itself when missing", () => {
    expect(t("some.untranslated.key")).toBe("some.untranslated.key");
  });

  it("interpolates parameters correctly", () => {
    // Testing parameter replacement
    const greeting = t("Hello {name}!", { name: "Antigravity" });
    expect(greeting).toBe("Hello Antigravity!");
  });
});
