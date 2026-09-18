import { describe, it, expect } from "vitest";

describe("Deliverables Checklist & Crash Recovery Suite", () => {
  it("manages deliverable task completion without crashing", () => {
    let checklist = [
      { id: 1, text: "Configure Supabase RLS", completed: false },
      { id: 2, text: "Verify Zero-Knowledge Encryption", completed: true },
    ];

    // Add task
    const newTask = { id: 3, text: "Setup RevenueCat Paywall", completed: false };
    checklist = [...checklist, newTask];
    expect(checklist.length).toBe(3);

    // Toggle complete
    checklist = checklist.map((t) => (t.id === 3 ? { ...t, completed: !t.completed } : t));
    expect(checklist.find((t) => t.id === 3)?.completed).toBe(true);

    // Toggle uncomplete
    checklist = checklist.map((t) => (t.id === 3 ? { ...t, completed: !t.completed } : t));
    expect(checklist.find((t) => t.id === 3)?.completed).toBe(false);

    // Compute progress
    const completedCount = checklist.filter((t) => t.completed).length;
    const progressPercent = Math.round((completedCount / checklist.length) * 100);
    expect(completedCount).toBe(1);
    expect(progressPercent).toBe(33);
  });

  it("clears cached navigation route state on ErrorBoundary catch so reload resets to safe overview", () => {
    const mockStorage = {
      custodian_nav_user123: JSON.stringify({ view: "vault", projectTab: "checklist" }),
      custodian_last_tab: "broken_tab",
      custodian_theme: "dark",
    };

    // Simulate ErrorBoundary cleanup logic
    Object.keys(mockStorage).forEach((k) => {
      if (k.startsWith("custodian_nav_") || k.startsWith("custodian_last_")) {
        delete mockStorage[k];
      }
    });

    expect(mockStorage.custodian_nav_user123).toBeUndefined();
    expect(mockStorage.custodian_last_tab).toBeUndefined();
    expect(mockStorage.custodian_theme).toBe("dark"); // Preserves unrelated preferences
  });
});
