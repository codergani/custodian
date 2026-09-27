import { supabase } from "../supabaseClient";

/**
 * Escapes HTML characters to prevent XSS in email templates
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Dispatches a support reply email via Supabase Edge Function or direct Resend API
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.originalMessage - Original customer inquiry/message
 * @param {string} params.replyText - Founder's reply text
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function sendSupportReplyEmail({ to, originalMessage, replyText }) {
  if (!to || !replyText) {
    return { success: false, error: new Error("Missing recipient or reply text") };
  }

  const subject = "Reply from Custodian Support";

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reply from Custodian Support</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0E0F12; color: #E6E4DF; margin: 0; padding: 24px; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #16181D; border: 1px solid #282B33; border-radius: 12px; padding: 32px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #282B33;">
            <div style="width: 34px; height: 34px; border-radius: 8px; background: rgba(176,141,87,0.15); border: 1px solid #B08D57; display: inline-flex; align-items: center; justify-content: center; font-size: 18px; line-height: 34px; text-align: center;">
              🛡️
            </div>
            <div style="display: inline-block; vertical-align: middle; margin-left: 8px;">
              <div style="font-size: 16px; font-weight: 700; color: #E6E4DF; letter-spacing: 0.5px;">Custodian Support</div>
              <div style="font-size: 11px; color: #8A8275;">Zero-Knowledge Encrypted Vault Platform</div>
            </div>
          </div>

          <!-- Main Greeting -->
          <h2 style="font-size: 18px; font-weight: 600; color: #F0EDE6; margin-top: 0; margin-bottom: 16px;">
            Reply to your inquiry
          </h2>

          <!-- Quoted Original Message -->
          <div style="background-color: rgba(255,255,255,0.03); border-left: 3px solid #B08D57; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #A8A399; margin-bottom: 6px; font-family: monospace; font-weight: 600;">
              Your Original Message:
            </div>
            <div style="font-size: 13.5px; color: #C2BEB5; white-space: pre-wrap; font-style: italic;">
              ${escapeHtml(originalMessage || "(No text provided)")}
            </div>
          </div>

          <!-- Founder Reply -->
          <div style="margin-bottom: 28px;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #80AAFF; margin-bottom: 8px; font-family: monospace; font-weight: 600;">
              Custodian Support Reply:
            </div>
            <div style="font-size: 14.5px; color: #FFFFFF; background-color: rgba(128,170,255,0.06); border: 1px solid rgba(128,170,255,0.22); padding: 18px; border-radius: 8px; white-space: pre-wrap; line-height: 1.6;">
              ${escapeHtml(replyText)}
            </div>
          </div>

          <!-- Footer -->
          <div style="font-size: 12px; color: #736E65; border-top: 1px solid #282B33; padding-top: 20px; line-height: 1.5;">
            You received this email because you contacted Custodian customer support.<br/>
            Zero-Knowledge Client Encryption · Custodian Platform Operations
          </div>
        </div>
      </body>
    </html>
  `;

  const emailText = [
    "Reply from Custodian Support",
    "",
    "--- Your Original Message ---",
    originalMessage || "",
    "",
    "--- Custodian Support Reply ---",
    replyText,
    "",
    "— Custodian Security & Vault Support",
  ].join("\n");

  // Step 1: Try Supabase Edge Function first (safest, no CORS restrictions)
  try {
    const { data, error } = await supabase.functions.invoke("send-support-reply", {
      body: {
        to,
        subject,
        html: emailHtml,
        text: emailText,
        originalMessage,
        replyText,
      },
    });

    if (!error && data?.success) {
      return { success: true, data };
    }
    if (error) {
      console.warn("[SupportEmail] Edge function error, trying direct Resend fallback:", error);
    }
  } catch (fnErr) {
    console.warn("[SupportEmail] Edge function invocation caught error:", fnErr);
  }

  // Step 2: Direct Resend API fallback
  const resendApiKey = import.meta.env.VITE_RESEND_API_KEY || "";
  const fromEmail =
    import.meta.env.VITE_RESEND_FROM_EMAIL || "onboarding@resend.dev";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `Custodian Support <${fromEmail}>`,
        to: [to],
        subject,
        html: emailHtml,
        text: emailText,
      }),
    });

    const resJson = await res.json();
    if (!res.ok) {
      throw new Error(resJson?.message || `Resend API returned status ${res.status}`);
    }

    return { success: true, data: resJson };
  } catch (directErr) {
    console.error("[SupportEmail] Direct Resend API call failed:", directErr);
    return { success: false, error: directErr };
  }
}
