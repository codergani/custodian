/**
 * Zero-Knowledge Environment Formatter & Export Engine.
 * Formats decrypted secret arrays into developer formats in-memory.
 */

/**
 * Format variables as standard .env file format
 */
export function formatAsDotEnv(variables = [], options = {}) {
  const { includeComments = true, environmentName = "" } = options;
  let out = "";
  if (includeComments && environmentName) {
    out += `# Custodian Vault Environment: ${environmentName.toUpperCase()}\n`;
    out += `# Exported: ${new Date().toISOString()}\n\n`;
  }

  variables.forEach((v) => {
    const key = (v.title || v.key || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    const val = v.password || v.value || v.secret || "";
    if (!key) return;

    // Quote values if they contain spaces, newlines, or special characters
    const needsQuotes = /[\s#"'\n\r=]/.test(val) || val === "";
    const escapedVal = val.replace(/"/g, '\\"');
    out += `${key}=${needsQuotes ? `"${escapedVal}"` : val}\n`;
  });

  return out.trim();
}

/**
 * Format variables as JSON object
 */
export function formatAsJSON(variables = []) {
  const obj = {};
  variables.forEach((v) => {
    const key = (v.title || v.key || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    const val = v.password || v.value || v.secret || "";
    if (key) {
      obj[key] = val;
    }
  });
  return JSON.stringify(obj, null, 2);
}

/**
 * Format variables as Docker run flags or compose format
 */
export function formatAsDocker(variables = [], mode = "flags") {
  if (mode === "flags") {
    // -e KEY="VALUE"
    return variables
      .map((v) => {
        const key = (v.title || v.key || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
        const val = v.password || v.value || v.secret || "";
        if (!key) return null;
        return `-e ${key}="${val.replace(/"/g, '\\"')}"`;
      })
      .filter(Boolean)
      .join(" \\\n  ");
  }

  // Compose environment block
  let out = "environment:\n";
  variables.forEach((v) => {
    const key = (v.title || v.key || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    const val = v.password || v.value || v.secret || "";
    if (key) {
      out += `  - ${key}=${val}\n`;
    }
  });
  return out.trim();
}

/**
 * Format variables as Shell exports (bash/zsh)
 */
export function formatAsShellExports(variables = []) {
  return variables
    .map((v) => {
      const key = (v.title || v.key || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
      const val = v.password || v.value || v.secret || "";
      if (!key) return null;
      return `export ${key}="${val.replace(/"/g, '\\"')}"`;
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * Format for Vercel Project Environment Variables JSON format
 */
export function formatAsVercelJSON(variables = [], targetEnv = "production") {
  return JSON.stringify(
    variables.map((v) => {
      const key = (v.title || v.key || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
      const val = v.password || v.value || v.secret || "";
      return {
        key,
        value: val,
        type: "encrypted",
        target: [targetEnv],
      };
    }),
    null,
    2
  );
}

/**
 * Format for GitHub Actions Secrets YAML snippet
 */
export function formatAsGitHubActions(variables = []) {
  let out = "env:\n";
  variables.forEach((v) => {
    const key = (v.title || v.key || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (key) {
      out += `  ${key}: \${{ secrets.${key} }}\n`;
    }
  });
  return out.trim();
}

/**
 * Calculate Environment Matrix across all environments
 * @param {Array} credentials - list of decrypted credentials in the project
 * @returns {Object} matrix data including rows, missingProdAlerts, duplicateAlerts
 */
export function computeEnvironmentMatrix(credentials = []) {
  // Normalize variable names
  const varMap = new Map(); // key -> { name, global, prod, staging, dev, category, isRequired, notes, updatedAt }

  credentials.forEach((c) => {
    const rawTitle = c.title || "";
    const normKey = rawTitle.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (!normKey) return;

    if (!varMap.has(normKey)) {
      varMap.set(normKey, {
        key: normKey,
        originalTitle: rawTitle,
        category: c.category || "General",
        isRequired: c.isRequired ?? true,
        notes: c.notes || "",
        global: null,
        prod: null,
        staging: null,
        dev: null,
        allInstances: [],
      });
    }

    const entry = varMap.get(normKey);
    const env = (c.environment || "global").toLowerCase();
    entry.allInstances.push(c);

    if (env === "prod" || env === "production") {
      entry.prod = c;
    } else if (env === "staging" || env === "stage") {
      entry.staging = c;
    } else if (env === "dev" || env === "development" || env === "local") {
      entry.dev = c;
    } else {
      entry.global = c;
    }
  });

  const rows = Array.from(varMap.values()).sort((a, b) => a.key.localeCompare(b.key));

  // Detect missing in production: Has DEV or STAGING but NO PROD and NO GLOBAL
  const missingProd = rows.filter((r) => {
    const hasDevOrStage = !!r.dev || !!r.staging;
    const hasProdOrGlobal = !!r.prod || !!r.global;
    return hasDevOrStage && !hasProdOrGlobal && r.isRequired;
  });

  // Detect missing in staging: Has PROD or DEV but NO STAGING and NO GLOBAL
  const missingStaging = rows.filter((r) => {
    const hasDevOrProd = !!r.dev || !!r.prod;
    const hasStageOrGlobal = !!r.staging || !!r.global;
    return hasDevOrProd && !hasStageOrGlobal;
  });

  // Detect duplicates (multiple distinct secrets assigned to same key + same env)
  const duplicates = [];
  rows.forEach((r) => {
    const envCounts = {};
    r.allInstances.forEach((inst) => {
      const e = inst.environment || "global";
      envCounts[e] = (envCounts[e] || 0) + 1;
    });
    Object.entries(envCounts).forEach(([env, count]) => {
      if (count > 1) {
        duplicates.push({ key: r.key, environment: env, count });
      }
    });
  });

  return {
    rows,
    totalVariables: rows.length,
    missingProd,
    missingStaging,
    duplicates,
  };
}
