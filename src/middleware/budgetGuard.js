import { GatewayRequestSchema, VirtualKeyConfigSchema } from "../schemas/gateway.js";

/**
 * Lightweight, high-performance in-memory Redis adapter with atomic transaction support.
 * Can be swapped with ioredis, Upstash, or node-redis in production.
 */
export class MemoryRedisStore {
  constructor() {
    this.storage = new Map();
    this.expirations = new Map();
  }

  async get(key) {
    if (this._isExpired(key)) return null;
    return this.storage.get(key) ?? null;
  }

  async set(key, value, options = {}) {
    this.storage.set(key, String(value));
    if (options.ex) {
      this.expirations.set(key, Date.now() + options.ex * 1000);
    }
    return "OK";
  }

  async incr(key) {
    const current = parseInt((await this.get(key)) || "0", 10);
    const updated = current + 1;
    this.storage.set(key, String(updated));
    return updated;
  }

  async incrbyfloat(key, increment) {
    const current = parseFloat((await this.get(key)) || "0");
    const updated = Math.round((current + increment) * 100000) / 100000;
    this.storage.set(key, String(updated));
    return updated;
  }

  async decrbyfloat(key, decrement) {
    return this.incrbyfloat(key, -decrement);
  }

  _isExpired(key) {
    if (this.expirations.has(key)) {
      if (Date.now() > this.expirations.get(key)) {
        this.storage.delete(key);
        this.expirations.delete(key);
        return true;
      }
    }
    return false;
  }

  multi() {
    const ops = [];
    return {
      incrbyfloat: (key, amount) => {
        ops.push(() => this.incrbyfloat(key, amount));
        return this;
      },
      exec: async () => {
        const results = [];
        for (const op of ops) {
          results.push(await op());
        }
        return results;
      },
    };
  }

  clear() {
    this.storage.clear();
    this.expirations.clear();
  }
}

/**
 * Current Year-Month key generator (e.g. '2026-10')
 */
export function getMonthlySpendKey(projectId, date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `budget:${projectId}:${year}-${month}`;
}

/**
 * Minute bucket key generator for Rate Limiting
 */
export function getRateLimitKey(keyId, date = new Date()) {
  const timestampMinute = Math.floor(date.getTime() / 60000);
  return `ratelimit:${keyId}:${timestampMinute}`;
}

/**
 * Main Budget Guard Middleware
 * Validates virtual keys, enforces model allowlists, checks RPM rate limits,
 * and executes hard USD monthly spend cap cutoffs before model dispatch.
 *
 * @param {Object} rawPayload - Incoming gateway request body
 * @param {Object} options
 * @param {MemoryRedisStore|Object} options.store - Redis or in-memory store
 * @param {Function} options.keyResolver - Function to resolve virtual key config (from Redis or DB)
 * @returns {Promise<Object>} Authorization decision
 */
export async function budgetGuardMiddleware(rawPayload, { store, keyResolver, currentDate = new Date() } = {}) {
  // 1. Zod Request Schema Validation
  const parseResult = GatewayRequestSchema.safeParse(rawPayload);
  if (!parseResult.success) {
    return {
      authorized: false,
      statusCode: 400,
      error: "BAD_REQUEST",
      message: "Invalid gateway request payload.",
      details: parseResult.error.flatten(),
    };
  }

  const req = parseResult.data;

  // 2. Resolve & Validate Virtual Key
  if (!keyResolver) {
    throw new Error("BudgetGuard requires a keyResolver function");
  }

  const keyConfig = await keyResolver(req.virtualKey);
  if (!keyConfig) {
    return {
      authorized: false,
      statusCode: 401,
      error: "INVALID_VIRTUAL_KEY",
      message: "The provided virtual key is invalid or does not exist.",
    };
  }

  const validatedKey = VirtualKeyConfigSchema.safeParse(keyConfig);
  if (!validatedKey.success) {
    return {
      authorized: false,
      statusCode: 500,
      error: "CORRUPTED_KEY_CONFIG",
      message: "Virtual key configuration is invalid.",
    };
  }

  const keyData = validatedKey.data;

  // Check key revocation
  if (keyData.status !== "active") {
    return {
      authorized: false,
      statusCode: 401,
      error: "REVOKED_VIRTUAL_KEY",
      message: `Virtual key has been ${keyData.status} and cannot execute requests.`,
    };
  }

  // 3. Model Allowlist Enforcement
  const isWildcard = keyData.allowedModels.includes("*");
  const isAllowed = isWildcard || keyData.allowedModels.some((m) => m.toLowerCase() === req.model.toLowerCase());

  if (!isAllowed) {
    return {
      authorized: false,
      statusCode: 403,
      error: "MODEL_NOT_PERMITTED",
      message: `Model "${req.model}" is not permitted under this virtual key. Permitted models: ${keyData.allowedModels.join(", ")}`,
      allowedModels: keyData.allowedModels,
    };
  }

  // 4. Rate Limiting (RPM - Requests Per Minute)
  const rateLimitKey = getRateLimitKey(keyData.id, currentDate);
  const currentRequests = await store.incr(rateLimitKey);
  if (currentRequests > keyData.rateLimitRpm) {
    return {
      authorized: false,
      statusCode: 429,
      error: "RATE_LIMIT_EXCEEDED",
      message: `Rate limit of ${keyData.rateLimitRpm} requests per minute exceeded.`,
      currentRequests,
      rateLimitRpm: keyData.rateLimitRpm,
    };
  }

  // 5. Hard Monthly USD Budget Cutoff
  const budgetKey = getMonthlySpendKey(req.projectId, currentDate);
  const currentMonthlySpendStr = await store.get(budgetKey);
  const currentMonthlySpend = currentMonthlySpendStr ? parseFloat(currentMonthlySpendStr) : 0;
  const projectedSpend = Math.round((currentMonthlySpend + req.estimatedCostUsd) * 100000) / 100000;

  if (projectedSpend > keyData.monthlyBudgetCapUsd) {
    const budgetRemaining = Math.max(0, Math.round((keyData.monthlyBudgetCapUsd - currentMonthlySpend) * 100000) / 100000);
    return {
      authorized: false,
      statusCode: 402,
      error: "BUDGET_EXCEEDED",
      message: `Project monthly budget cap of $${keyData.monthlyBudgetCapUsd.toFixed(2)} exceeded. Cannot spend $${req.estimatedCostUsd.toFixed(4)}.`,
      finops: {
        budgetCapUsd: keyData.monthlyBudgetCapUsd,
        currentSpendUsd: currentMonthlySpend,
        projectedSpendUsd: projectedSpend,
        budgetRemainingUsd: budgetRemaining,
        estimatedCostUsd: req.estimatedCostUsd,
      },
    };
  }

  // 6. Atomic Reservation of Estimated Spend
  const updatedSpend = await store.incrbyfloat(budgetKey, req.estimatedCostUsd);
  const budgetRemaining = Math.max(0, Math.round((keyData.monthlyBudgetCapUsd - updatedSpend) * 100000) / 100000);

  return {
    authorized: true,
    statusCode: 200,
    projectId: req.projectId,
    keyId: keyData.id,
    request: req,
    finops: {
      budgetCapUsd: keyData.monthlyBudgetCapUsd,
      currentSpendUsd: updatedSpend,
      budgetRemainingUsd: budgetRemaining,
      allocatedCostUsd: req.estimatedCostUsd,
    },
  };
}

/**
 * Reconciles spend after upstream generation completes.
 * (e.g. if the actual cost was less, or if generation failed and funds must be refunded)
 */
export async function reconcileBudgetReservation({ projectId, differenceUsd, store, date = new Date() }) {
  if (differenceUsd === 0) return;
  const budgetKey = getMonthlySpendKey(projectId, date);
  // If actual cost was lower, differenceUsd is negative, so decrbyfloat
  if (differenceUsd < 0) {
    return await store.decrbyfloat(budgetKey, Math.abs(differenceUsd));
  } else {
    return await store.incrbyfloat(budgetKey, differenceUsd);
  }
}
