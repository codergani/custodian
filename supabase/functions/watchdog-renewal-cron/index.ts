import { createClient } from "@supabase/supabase-js";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req: Request) => {
  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY environment variable" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing Supabase service configuration" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch users who have renewal email notifications enabled
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("id, email, notify_renewal_email, notify_renewal_days")
      .eq("notify_renewal_email", true);

    if (profileErr) throw profileErr;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No active users with renewal email alerts enabled." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const results = [];
    const now = new Date();

    for (const profile of profiles) {
      const thresholdDays = profile.notify_renewal_days || 7;
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + thresholdDays);

      // Fetch projects for this user
      const { data: projects, error: projErr } = await supabase
        .from("projects")
        .select("id, name, details_blob, client_id, clients(name)")
        .eq("user_id", profile.id)
        .is("deleted_at", null);

      if (projErr) continue;

      const expiringItems = [];

      for (const p of projects || []) {
        if (!p.details_blob) continue;
        try {
          const parsed = JSON.parse(p.details_blob);
          const watchdog = parsed.watchdog || [];

          for (const item of watchdog) {
            if (!item.renewal_date) continue;
            const renDate = new Date(item.renewal_date);
            const diffMs = renDate.getTime() - now.getTime();
            const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            if (daysLeft >= 0 && daysLeft <= thresholdDays) {
              expiringItems.push({
                projectName: p.name,
                clientName: p.clients?.name || "Independent",
                type: item.type || "Domain/SSL/Subscription",
                label: item.label || item.type,
                renewalDate: item.renewal_date,
                daysLeft,
                cost: item.cost ? `$${item.cost}` : "N/A",
              });
            }
          }
        } catch {
          // ignore parsing issues on unencrypted/empty blobs
        }
      }

      if (expiringItems.length > 0) {
        // Send email via Resend
        const itemsHtml = expiringItems
          .map(
            (it) => `
            <tr style="border-bottom: 1px solid #2A2E37;">
              <td style="padding: 12px; color: #F0EDE6; font-weight: 600;">${it.projectName}</td>
              <td style="padding: 12px; color: #A8A399;">${it.label}</td>
              <td style="padding: 12px; color: ${it.daysLeft <= 3 ? '#E07A6D' : '#D4AF37'}; font-weight: 700;">
                ${it.daysLeft === 0 ? 'Expiring Today!' : it.daysLeft + ' days left'}
              </td>
              <td style="padding: 12px; color: #A8A399;">${it.renewalDate}</td>
              <td style="padding: 12px; color: #F0EDE6;">${it.cost}</td>
            </tr>
          `
          )
          .join("");

        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8" /></head>
            <body style="background-color: #0E1015; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; color: #F0EDE6;">
              <div style="max-width: 600px; margin: 0 auto; background: #171922; border: 1px solid #2A2E37; border-radius: 12px; padding: 32px;">
                <div style="display: flex; align-items: center; margin-bottom: 24px;">
                  <h1 style="font-size: 20px; font-weight: 700; color: #D4AF37; margin: 0;">🛡️ Custodian Renewal Watchdog</h1>
                </div>
                <p style="font-size: 14px; color: #A8A399; line-height: 1.6;">
                  You have <strong style="color: #F0EDE6;">${expiringItems.length} service(s)</strong> due for renewal within the next ${thresholdDays} days. Please review and renew them to prevent service downtime.
                </p>
                <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 13px;">
                  <thead>
                    <tr style="background: #1F232D; text-align: left; color: #B08D57;">
                      <th style="padding: 10px 12px;">Project</th>
                      <th style="padding: 10px 12px;">Service</th>
                      <th style="padding: 10px 12px;">Urgency</th>
                      <th style="padding: 10px 12px;">Due Date</th>
                      <th style="padding: 10px 12px;">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
                <div style="text-align: center; margin-top: 32px;">
                  <a href="https://custodian.app" style="background: #D4AF37; color: #0E1015; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block;">
                    Open Custodian Vault
                  </a>
                </div>
              </div>
              <p style="text-align: center; font-size: 11px; color: #666; margin-top: 24px;">
                Zero-Knowledge Encrypted Operations · Custodian Vault
              </p>
            </body>
          </html>
        `;

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `Custodian Watchdog <${RESEND_FROM_EMAIL}>`,
            to: [profile.email],
            subject: `⚠️ [Custodian] ${expiringItems.length} Renewal(s) Expiring Soon`,
            html: emailHtml,
          }),
        });

        const resendData = await resendRes.json();
        results.push({ email: profile.email, count: expiringItems.length, status: resendRes.status, response: resendData });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
