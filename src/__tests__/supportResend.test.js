import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendSupportReplyEmail } from "../utils/resend";
import { supabase } from "../supabaseClient";

describe("Support Resend Email Integration Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns error if missing required 'to' or 'replyText'", async () => {
    const res1 = await sendSupportReplyEmail({ to: "", originalMessage: "Hello", replyText: "Hi" });
    expect(res1.success).toBe(false);

    const res2 = await sendSupportReplyEmail({ to: "user@test.com", originalMessage: "Hello", replyText: "" });
    expect(res2.success).toBe(false);
  });

  it("calls supabase.functions.invoke with properly formatted payload", async () => {
    const invokeSpy = vi.spyOn(Object.getPrototypeOf(supabase.functions), "invoke").mockResolvedValue({
      data: { success: true, id: "resend-mock-id" },
      error: null,
    });

    const result = await sendSupportReplyEmail({
      to: "customer@example.com",
      originalMessage: "I need help with my vault keys.",
      replyText: "You can reset your keys via Settings -> Master Key.",
    });

    expect(invokeSpy).toHaveBeenCalledWith("send-support-reply", expect.objectContaining({
      body: expect.objectContaining({
        to: "customer@example.com",
        subject: "Reply from Custodian Support",
        originalMessage: "I need help with my vault keys.",
        replyText: "You can reset your keys via Settings -> Master Key.",
      }),
    }));

    expect(result.success).toBe(true);
    expect(result.data.id).toBe("resend-mock-id");
  });

  it("falls back to fetch if edge function fails", async () => {
    vi.spyOn(Object.getPrototypeOf(supabase.functions), "invoke").mockRejectedValue(new Error("Edge function unavailable"));

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ id: "direct-resend-id" }),
    });

    const result = await sendSupportReplyEmail({
      to: "customer@example.com",
      originalMessage: "My subscription didn't activate.",
      replyText: "Your subscription has been manually synchronized.",
    });

    expect(fetchSpy).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        "Content-Type": "application/json",
      }),
      body: expect.stringContaining("customer@example.com"),
    }));

    expect(result.success).toBe(true);
  });
});
