import { describe, it, expect } from "vitest";

function getSpendByCurrency(items = [], defaultCurrency = "$") {
  const map = {};
  for (const item of items) {
    if (item.isCanceled) continue;
    const curr = item.currency || defaultCurrency;
    const cost = parseFloat(item.cost) || 0;
    if (cost > 0) {
      map[curr] = (map[curr] || 0) + cost;
    }
  }
  const entries = Object.entries(map).filter(([_, v]) => v > 0);
  if (!entries.length) return `${defaultCurrency}0.00`;
  return entries.map(([curr, val]) => `${curr}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" + ");
}

function getSavingsByCurrency(items = [], defaultCurrency = "$") {
  const map = {};
  for (const item of items) {
    if (!item.isCanceled) continue;
    const curr = item.currency || defaultCurrency;
    const cost = parseFloat(item.cost) || 0;
    if (cost > 0) {
      map[curr] = (map[curr] || 0) + cost;
    }
  }
  const entries = Object.entries(map).filter(([_, v]) => v > 0);
  if (!entries.length) return `+${defaultCurrency}0.00`;
  return entries.map(([curr, val]) => `+${curr}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" + ");
}

function getAnnualSavingsByCurrency(items = [], defaultCurrency = "$") {
  const map = {};
  for (const item of items) {
    if (!item.isCanceled) continue;
    const curr = item.currency || defaultCurrency;
    const cost = (parseFloat(item.cost) || 0) * 12;
    if (cost > 0) {
      map[curr] = (map[curr] || 0) + cost;
    }
  }
  const entries = Object.entries(map).filter(([_, v]) => v > 0);
  if (!entries.length) return `+${defaultCurrency}0.00 / yr`;
  return entries.map(([curr, val]) => `+${curr}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" + ") + " / yr";
}

function validateEstimatedCost(costStr) {
  if (costStr === "" || costStr === null || costStr === undefined) return { valid: true, value: null };
  const num = parseFloat(costStr);
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: "Estimated cost must be greater than 0 (e.g. 0.01 or 20.00)." };
  }
  return { valid: true, value: String(num) };
}

describe("Renewal Watchdog Math & Validation", () => {
  it("rejects negative, zero, and NaN cost inputs", () => {
    expect(validateEstimatedCost("-50").valid).toBe(false);
    expect(validateEstimatedCost("0").valid).toBe(false);
    expect(validateEstimatedCost("-0.01").valid).toBe(false);
    expect(validateEstimatedCost("invalid").valid).toBe(false);

    expect(validateEstimatedCost("0.01").valid).toBe(true);
    expect(validateEstimatedCost("20.00").valid).toBe(true);
    expect(validateEstimatedCost("").valid).toBe(true);
  });

  it("computes Monthly Spend strictly from active subscriptions with positive costs", () => {
    const creds = [
      { id: "1", cost: "20.00", currency: "$", isCanceled: false },
      { id: "2", cost: "50.00", currency: "$", isCanceled: true },
      { id: "3", cost: "-30.00", currency: "$", isCanceled: false },
      { id: "4", cost: "100.00", currency: "€", isCanceled: false },
    ];
    expect(getSpendByCurrency(creds, "$")).toBe("$20.00 + €100.00");
  });

  it("computes Total Money Saved strictly on render from canceled subscriptions", () => {
    const creds = [
      { id: "1", cost: "20.00", currency: "$", isCanceled: false },
      { id: "2", cost: "50.00", currency: "$", isCanceled: true },
      { id: "3", cost: "25.50", currency: "$", isCanceled: true },
      { id: "4", cost: "-100.00", currency: "$", isCanceled: true }, // corrupt record ignored
    ];
    expect(getSavingsByCurrency(creds, "$")).toBe("+$75.50");
    expect(getAnnualSavingsByCurrency(creds, "$")).toBe("+$906.00 / yr");
  });

  it("returns +$0.00 when there are 0 cancellations regardless of legacy artifacts", () => {
    const creds = [
      { id: "1", cost: "20.00", currency: "$", isCanceled: false },
      { id: "2", cost: "100.00", currency: "$", isCanceled: false },
    ];
    expect(getSavingsByCurrency(creds, "$")).toBe("+$0.00");
    expect(getAnnualSavingsByCurrency(creds, "$")).toBe("+$0.00 / yr");
  });
});
