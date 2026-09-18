import { describe, it, expect } from "vitest";
import { formatDateUSA, formatDateTimeUSA, formatTimelineBadge } from "../utils/dateFormatter";

describe("dateFormatter (USA format: MM/DD/YYYY)", () => {
  it("formats ISO string into strict MM/DD/YYYY format", () => {
    // 2026-09-19T10:30:00Z -> month: 09, day: 19, year: 2026
    const date = new Date(2026, 8, 19); // month index 8 is September
    expect(formatDateUSA(date)).toBe("09/19/2026");
  });

  it("pads single-digit months and days with leading zeros", () => {
    const date = new Date(2026, 0, 5); // January 5th, 2026
    expect(formatDateUSA(date)).toBe("01/05/2026");
  });

  it("formats date and time with 12-hour AM/PM", () => {
    const date = new Date(2026, 8, 19, 14, 5); // 02:05 PM
    expect(formatDateTimeUSA(date)).toBe("09/19/2026 • 02:05 PM");

    const morningDate = new Date(2026, 8, 19, 9, 30); // 09:30 AM
    expect(formatDateTimeUSA(morningDate)).toBe("09/19/2026 • 09:30 AM");
  });

  it("formats timeline badge with exact date and time", () => {
    const date = new Date(2026, 8, 19, 14, 5);
    expect(formatTimelineBadge(date, "Updated")).toBe("Updated: 09/19/2026 • 02:05 PM");
    expect(formatTimelineBadge(date, "Created")).toBe("Created: 09/19/2026 • 02:05 PM");
  });

  it("gracefully handles invalid inputs", () => {
    expect(formatDateUSA(null)).toBe("N/A");
    expect(formatDateUSA(undefined)).toBe("N/A");
    expect(formatDateUSA("invalid-date")).toBe("N/A");
  });
});
