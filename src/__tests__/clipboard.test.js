import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { copySecretWithAutoClear } from "../utils/clipboard";

describe("Clipboard Auto-Clear Hardening", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns false gracefully if text is empty or falsy", async () => {
    const res = await copySecretWithAutoClear("");
    expect(res).toBe(false);
  });

  it("writes text to clipboard and wipes it after timeout", async () => {
    let clipboardData = "";
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(async (val) => {
          clipboardData = val;
        }),
        readText: vi.fn(async () => clipboardData),
      },
    });

    const res = await copySecretWithAutoClear("my-master-password", 5000);
    expect(res).toBe(true);
    expect(clipboardData).toBe("my-master-password");

    // Fast-forward past timeout
    await vi.advanceTimersByTimeAsync(5500);

    // Should have cleared
    expect(clipboardData).toBe("");
  });
});
