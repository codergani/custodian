// Custodian AI Copilot: Zero-Knowledge Security & Handover Intelligence
// Evaluates secret hygiene, generates client handover runbooks, and audits SaaS renewal costs
// Guarantees zero-knowledge: Raw decrypted secret contents are never sent to external servers.

/**
 * Analyzes credentials and environment configurations for security risks,
 * misconfigurations, and compliance red flags.
 *
 * @param {Array<Object>} credentials - List of credential objects (keys, scopes, services)
 * @param {string} environment - Current environment ('production', 'staging', 'development')
 * @returns {Object} Security audit report with score, critical warnings, and AI recommendations
 */
export function analyzeEnvSecurity(credentials = [], environment = "production") {
  const issues = [];
  const recommendations = [];
  let score = 100;

  if (!credentials || credentials.length === 0) {
    return {
      score: 100,
      riskLevel: "LOW",
      issues: [{ level: "INFO", message: "No credentials registered in this scope." }],
      recommendations: ["Register your primary API keys to enable AI security auditing."],
      summary: "Environment is clean with no tracked credentials.",
    };
  }

  // 1. Root / Wildcard AWS Key Detection
  const awsKey = credentials.find(
    (c) =>
      /aws_access_key|aws_secret/i.test(c.title || c.service || "") ||
      (c.username && c.username.startsWith("AKIA"))
  );
  if (awsKey) {
    score -= 20;
    issues.push({
      level: "HIGH",
      title: "Potential Root AWS Access Key Detected",
      detail: `Credential "${awsKey.title || "AWS"}" uses long-lived access key format. Recommend migrating to IAM role or short-lived STS tokens.`,
      targetId: awsKey.id,
    });
    recommendations.push("Replace permanent AWS IAM keys with AssumeRole or OIDC federated auth.");
  }

  // 2. Stripe Test Key in Production Scope
  if (environment.toLowerCase() === "production") {
    const stripeTest = credentials.find(
      (c) =>
        /stripe/i.test(c.title || c.service || "") &&
        (/test/i.test(c.title || "") || (c.service && /test/i.test(c.service)))
    );
    if (stripeTest) {
      score -= 25;
      issues.push({
        level: "CRITICAL",
        title: "Test Key In Production Environment",
        detail: `Stripe test mode credential found inside a production environment profile.`,
        targetId: stripeTest.id,
      });
      recommendations.push(
        "Rotate production credentials immediately: Ensure production environment only contains `sk_live_` keys."
      );
    }
  }

  // 3. Stale Credentials / Missing Rotation Tracking
  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const staleCredentials = credentials.filter((c) => {
    if (!c.updatedAt && !c.createdAt) return false;
    const itemDate = new Date(c.updatedAt || c.createdAt).getTime();
    return now - itemDate > ninetyDaysMs;
  });

  if (staleCredentials.length > 0) {
    score -= Math.min(20, staleCredentials.length * 5);
    issues.push({
      level: "MEDIUM",
      title: `${staleCredentials.length} Credentials Exceed 90-Day Rotation Policy`,
      detail: `Security frameworks (SOC2, ISO27001) mandate 90-day secret rotation.`,
      affectedCount: staleCredentials.length,
    });
    recommendations.push("Schedule automated rotation for credentials older than 90 days.");
  }

  // 4. Missing 2FA / Recovery Backup Codes
  const missingBackups = credentials.filter(
    (c) =>
      /google|github|cloudflare|aws|azure/i.test(c.service || c.title || "") &&
      !c.notes?.includes("backup") &&
      !c.has2fa
  );
  if (missingBackups.length > 0) {
    score -= 10;
    issues.push({
      level: "LOW",
      title: "High-Privilege Accounts Without Documented 2FA/Recovery",
      detail: `${missingBackups.length} cloud provider credentials do not have MFA notes or backup recovery tags.`,
    });
    recommendations.push("Store emergency break-glass recovery codes in Custodian's 2FA Vault.");
  }

  // 5. Database direct connection string audit
  const directDb = credentials.find(
    (c) =>
      /database|postgres|mysql|mongodb/i.test(c.service || c.title || "") &&
      /postgres:\/\/|mysql:\/\/|mongodb\+srv:\/\//i.test(c.service || c.title || "")
  );
  if (directDb) {
    score -= 15;
    issues.push({
      level: "HIGH",
      title: "Direct Unpooled Database Connection String",
      detail: "Direct connection URI detected. Use connection poolers (PgBouncer/Supabase Supavisor) to prevent DDoS.",
    });
  }

  score = Math.max(10, Math.min(100, score));

  let riskLevel = "LOW";
  if (score < 60) riskLevel = "CRITICAL";
  else if (score < 80) riskLevel = "MEDIUM";

  return {
    score,
    riskLevel,
    issues,
    recommendations,
    summary: `AI Security Audit completed: ${issues.length} items flagged. Environment hygiene score: ${score}/100 (${riskLevel} risk).`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generates an executive Markdown handover runbook for clients or engineering teams.
 * Masks all sensitive secret values to maintain zero-knowledge safety.
 *
 * @param {Object} project - The project definition
 * @param {Array<Object>} credentials - Project credentials
 * @returns {string} Formatted Markdown document
 */
export function generateClientRunbook(project = {}, credentials = []) {
  const projName = project.name || "Untitled Project";
  const clientName = project.clientName || "Valued Client";
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const serviceCategories = {};
  credentials.forEach((c) => {
    const cat = c.category || "Infrastructure & APIs";
    if (!serviceCategories[cat]) serviceCategories[cat] = [];
    serviceCategories[cat].push(c);
  });

  let runbook = `# 📦 Project Handover & Operational Runbook\n\n`;
  runbook += `**Project:** ${projName}  \n`;
  runbook += `**Recipient / Client:** ${clientName}  \n`;
  runbook += `**Generated By:** Custodian Zero-Knowledge Security Copilot  \n`;
  runbook += `**Date:** ${dateStr}  \n\n`;
  runbook += `---\n\n`;

  runbook += `## 1. Executive Architecture Summary\n`;
  runbook += `This runbook provides complete operational continuity for **${projName}**.\n`;
  runbook += `All services, database infrastructure, and API keys documented below are encrypted via Custodian's AES-256-GCM zero-knowledge architecture.\n\n`;

  runbook += `## 2. Infrastructure Inventory & Managed Services\n\n`;
  if (credentials.length === 0) {
    runbook += `_No credentials or third-party services registered yet._\n\n`;
  } else {
    runbook += `| Service / Provider | Identity / Scope | Status | Renewal / Rotation |\n`;
    runbook += `| :--- | :--- | :--- | :--- |\n`;
    credentials.forEach((c) => {
      const name = c.title || c.service || "API Key";
      const scope = c.environment || "Production";
      const renewal = c.expiryDate || c.renewalDate || "Continuous";
      runbook += `| **${name}** | \`${scope}\` | Active ✅ | ${renewal} |\n`;
    });
    runbook += `\n`;
  }

  runbook += `## 3. Disaster Recovery & Emergency Rotation Protocol\n`;
  runbook += `In the event of an outage or team access revocation:\n`;
  runbook += `1. **Authenticate to Custodian Vault**: Use your client master key to unlock live secret credentials.\n`;
  runbook += `2. **Environment Variable Injection**: Export production secrets via \`.env\` export format.\n`;
  runbook += `3. **Service Fallback**: Check Renewal Watchdog to verify automated domain/SSL renewals.\n\n`;

  runbook += `## 4. Operational Sign-Off & Verification\n`;
  runbook += `- [ ] Handover package verified and all credentials confirmed active.\n`;
  runbook += `- [ ] Primary billing transferred to client payment method.\n`;
  runbook += `- [ ] DNS and Cloudflare delegation completed.\n\n`;
  runbook += `_Document certified safe: No raw plaintext master secrets are exposed in this runbook._\n`;

  return runbook;
}

/**
 * Evaluates SaaS & hosting subscriptions to detect duplicate charges,
 * untracked renewals, and suggest AI-powered cost reductions.
 *
 * @param {Array<Object>} subscriptions - Watchdog subscription records
 * @returns {Object} Optimization breakdown
 */
export function optimizeBillingWithAI(subscriptions = []) {
  if (!subscriptions || subscriptions.length === 0) {
    return {
      totalMonthlySpend: 0,
      annualProjectedSpend: 0,
      potentialMonthlySavings: 0,
      opportunities: [],
      insight: "No recurring subscriptions tracked yet. Add domains or SaaS licenses to Watchdog.",
    };
  }

  let totalMonthlySpend = 0;
  const categories = {};
  const opportunities = [];

  subscriptions.forEach((sub) => {
    let cost = parseFloat(sub.cost || sub.amount || 0);
    if (isNaN(cost)) cost = 0;

    // Normalize to monthly
    const billingCycle = (sub.cycle || sub.billingCycle || "monthly").toLowerCase();
    let monthlyCost = cost;
    if (billingCycle === "annual" || billingCycle === "yearly") {
      monthlyCost = cost / 12;
    }

    totalMonthlySpend += monthlyCost;

    const cat = (sub.category || "General").toLowerCase();
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ ...sub, monthlyCost });
  });

  // Check for duplicate tool categories (e.g. multiple hosting or multiple analytics)
  Object.entries(categories).forEach(([category, items]) => {
    if (items.length > 1 && category !== "general") {
      const combined = items.reduce((acc, curr) => acc + curr.monthlyCost, 0);
      const estSavings = combined * 0.35; // 35% typical consolidation savings
      opportunities.push({
        title: `Consolidate ${category.toUpperCase()} Subscriptions`,
        detail: `You have ${items.length} active services in the "${category}" category costing $${combined.toFixed(2)}/mo. Consolidating into a unified tier can save ~$${estSavings.toFixed(2)}/mo.`,
        potentialSavings: estSavings,
        services: items.map((i) => i.name || i.service || "Service"),
      });
    }
  });

  // Check for annual discount opportunities
  const monthlyItems = subscriptions.filter(
    (s) => (s.cycle || s.billingCycle || "monthly").toLowerCase() === "monthly" && parseFloat(s.cost || 0) > 20
  );
  if (monthlyItems.length > 0) {
    const annualSavings = monthlyItems.reduce((acc, curr) => acc + parseFloat(curr.cost || 0) * 0.2, 0);
    opportunities.push({
      title: "Switch High-Volume SaaS to Annual Billing",
      detail: `${monthlyItems.length} subscriptions billed monthly can yield a 15–20% discount if switched to annual billing.`,
      potentialSavings: annualSavings,
      services: monthlyItems.map((i) => i.name || i.service || "Service"),
    });
  }

  const potentialMonthlySavings = opportunities.reduce(
    (acc, curr) => acc + (curr.potentialSavings || 0),
    0
  );

  return {
    totalMonthlySpend: parseFloat(totalMonthlySpend.toFixed(2)),
    annualProjectedSpend: parseFloat((totalMonthlySpend * 12).toFixed(2)),
    potentialMonthlySavings: parseFloat(potentialMonthlySavings.toFixed(2)),
    opportunities,
    insight:
      opportunities.length > 0
        ? `Custodian AI detected ${opportunities.length} cost optimization opportunities that could save up to $${potentialMonthlySavings.toFixed(2)}/month ($${(potentialMonthlySavings * 12).toFixed(2)}/yr).`
        : `Your subscription spending is streamlined. No duplicate service clusters detected.`,
  };
}
