import { describe, it, expect, vi } from "vitest";
import { throttle, debounce } from "../utils/rateLimit";

describe("Rate Limiting Utilities (Throttle & Debounce)", () => {
  it("throttle limits rapid calls to once per interval", () => {
    let callCount = 0;
    const fn = throttle(() => {
      callCount++;
    }, 100);

    fn();
    fn();
    fn();

    expect(callCount).toBe(1);
  });

  it("debounce delays execution until wait period elapses", async () => {
    let result = null;
    const fn = debounce((val) => {
      result = val;
    }, 50);

    fn("first");
    fn("second");
    fn("final");

    expect(result).toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(result).toBe("final");
  });
});
