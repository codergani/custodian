/**
 * Zero-Knowledge Project Operational Readiness Engine.
 * Calculates an explainable, transparent 0-100% readiness score for a software project.
 * Evaluates:
 * 1. Environment & Secrets Completeness (30 pts)
 * 2. Database & Core Infrastructure (25 pts)
 * 3. Deployment & Repository Linking (20 pts)
 * 4. Security Health & Master Freshness (15 pts)
 * 5. Domain & Renewal Watchdog Health (10 pts)
 */

import { computeEnvironmentMatrix } from "./envFormatters";
import { calculateSecurityHealth } from "../components/shared";

export function calculateProjectReadiness(project, allRenewals = []) {
  if (!project) {
    return {
      score: 0,
      status: "unconfigured",
      checks: [],
      issues: ["Project data unavailable"],
    };
  }

  const creds = project.credentials || [];
  const details = project.details || {};
  const checks = [];
  const issues = [];
  let score = 0;

  // ──── 1. ENVIRONMENT & SECRETS COMPLETENESS (30 pts) ────
  const matrix = computeEnvironmentMatrix(creds);
  const totalVars = matrix.totalVariables;

  if (totalVars === 0) {
    checks.push({
      category: "Environment",
      name: "Environment Variables Configured",
      passed: false,
      weight: 15,
      awarded: 0,
      detail: "No environment variables or secrets stored in vault.",
    });
    issues.push("Add essential project secrets (.env variables) in Environment Studio.");
  } else {
    // 15 pts for having variables
    checks.push({
      category: "Environment",
      name: "Environment Variables Configured",
      passed: true,
      weight: 15,
      awarded: 15,
      detail: `${totalVars} environment variables securely stored.`,
    });
    score += 15;

    // 15 pts for zero missing production variables
    if (matrix.missingProd.length === 0) {
      checks.push({
        category: "Environment",
        name: "Production Environment Parity",
        passed: true,
        weight: 15,
        awarded: 15,
        detail: "All required variables configured for Production / Global.",
      });
      score += 15;
    } else {
      const missingKeys = matrix.missingProd.map((m) => m.key).join(", ");
      checks.push({
        category: "Environment",
        name: "Production Environment Parity",
        passed: false,
        weight: 15,
        awarded: 0,
        detail: `Missing ${matrix.missingProd.length} required variable(s) in Production: ${missingKeys}`,
      });
      issues.push(`Production environment is missing: ${missingKeys}`);
    }
  }

  // ──── 2. DATABASE & CORE INFRASTRUCTURE (25 pts) ────
  const hasDatabase = creds.some((c) => {
    const t = (c.title || "").toLowerCase();
    const cat = (c.category || "").toLowerCase();
    const type = (c.secretType || "").toLowerCase();
    return (
      type === "database" ||
      cat.includes("database") ||
      t.includes("database") ||
      t.includes("db_url") ||
      t.includes("postgres") ||
      t.includes("mysql") ||
      t.includes("mongo") ||
      t.includes("supabase")
    );
  });

  if (hasDatabase) {
    checks.push({
      category: "Infrastructure",
      name: "Database / Core Backend Credentials",
      passed: true,
      weight: 25,
      awarded: 25,
      detail: "Primary database or backend service connection configured.",
    });
    score += 25;
  } else {
    checks.push({
      category: "Infrastructure",
      name: "Database / Core Backend Credentials",
      passed: false,
      weight: 25,
      awarded: 0,
      detail: "No database URI, Postgres, Supabase, or backend connection credentials stored.",
    });
    issues.push("Configure database connection string or backend API keys.");
  }

  // ──── 3. DEPLOYMENT & REPOSITORY RUNBOOK (20 pts) ────
  const deployment = details.deployment || {};
  const hasRepo = !!(deployment.repository || details.repoUrl || details.repository);
  const hasProdUrl = !!(deployment.productionUrl || details.productionUrl || details.stagingUrl);

  if (hasRepo && hasProdUrl) {
    checks.push({
      category: "Deployment",
      name: "Repository & Target URLs Linked",
      passed: true,
      weight: 20,
      awarded: 20,
      detail: `Linked to repository and live deployment endpoints.`,
    });
    score += 20;
  } else if (hasRepo || hasProdUrl) {
    checks.push({
      category: "Deployment",
      name: "Repository & Target URLs Linked",
      passed: false,
      weight: 20,
      awarded: 10,
      detail: hasRepo ? "Repository linked, but no production URL documented." : "Production URL documented, but repository not linked.",
    });
    score += 10;
    if (!hasProdUrl) issues.push("Set Production URL in the Deployment Runbook.");
    if (!hasRepo) issues.push("Link Git repository URL in the Deployment Runbook.");
  } else {
    checks.push({
      category: "Deployment",
      name: "Repository & Target URLs Linked",
      passed: false,
      weight: 20,
      awarded: 0,
      detail: "No repository URL or production deployment targets configured.",
    });
    issues.push("Document Git repository and deployment platform in the Deployment Center.");
  }

  // ──── 4. SECURITY HEALTH & CREDENTIAL INTEGRITY (15 pts) ────
  const secHealth = calculateSecurityHealth(creds);
  if (creds.length > 0 && secHealth.score >= 80) {
    checks.push({
      category: "Security",
      name: "Cryptographic Vault Hygiene",
      passed: true,
      weight: 15,
      awarded: 15,
      detail: `Security health score: ${secHealth.score}/100. Zero weak or exposed tokens.`,
    });
    score += 15;
  } else if (creds.length > 0) {
    checks.push({
      category: "Security",
      name: "Cryptographic Vault Hygiene",
      passed: false,
      weight: 15,
      awarded: 8,
      detail: `Security health score: ${secHealth.score}/100. Some credentials need strength rotation.`,
    });
    score += 8;
    issues.push("Review security audit recommendations for weak or duplicate passwords.");
  } else {
    checks.push({
      category: "Security",
      name: "Cryptographic Vault Hygiene",
      passed: false,
      weight: 15,
      awarded: 0,
      detail: "Add encrypted credentials to evaluate security hygiene.",
    });
  }

  // ──── 5. RENEWAL WATCHDOG CONTINUITY (10 pts) ────
  // Filter renewals related to this project (or all renewals if project-agnostic)
  const projRenewals = allRenewals.filter((r) => {
    if (!r) return false;
    const notes = (r.notes || "").toLowerCase();
    const service = (r.service_name || "").toLowerCase();
    const projName = (project.name || "").toLowerCase();
    return notes.includes(projName) || service.includes(projName) || r.project_id === project.id;
  });

  const now = new Date();
  const criticalExpiring = projRenewals.filter((r) => {
    if (!r.renewal_date) return false;
    const diffDays = Math.ceil((new Date(r.renewal_date) - now) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  if (criticalExpiring.length > 0) {
    checks.push({
      category: "Renewals",
      name: "SSL & Domain Expiration Watchdog",
      passed: false,
      weight: 10,
      awarded: 0,
      detail: `${criticalExpiring.length} critical service(s) expiring in <= 7 days!`,
    });
    issues.push(`Urgent: ${criticalExpiring.map((r) => r.service_name).join(", ")} renewing within 7 days.`);
  } else if (projRenewals.length > 0) {
    checks.push({
      category: "Renewals",
      name: "SSL & Domain Expiration Watchdog",
      passed: true,
      weight: 10,
      awarded: 10,
      detail: `All ${projRenewals.length} tracked SSL/domain renewal dates are healthy (> 7 days).`,
    });
    score += 10;
  } else {
    // Neutral pass (5 pts) if no renewals configured yet
    checks.push({
      category: "Renewals",
      name: "SSL & Domain Expiration Watchdog",
      passed: true,
      weight: 10,
      awarded: 7,
      detail: "No imminent renewal threats detected.",
    });
    score += 7;
  }

  // Final score clamping
  const finalScore = Math.min(100, Math.max(0, Math.round(score)));

  let status = "needs_attention";
  if (finalScore >= 85) status = "production_ready";
  else if (finalScore >= 60) status = "in_progress";

  return {
    score: finalScore,
    status,
    checks,
    issues,
    summary: {
      totalChecks: checks.length,
      passedChecks: checks.filter((c) => c.passed).length,
      criticalIssuesCount: issues.length,
    },
  };
}
