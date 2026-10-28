import { z } from "zod";

/**
 * 1. Gateway Request Schema
 * Validates incoming proxy requests before any external API is dispatched.
 */
export const GatewayRequestSchema = z.object({
  virtualKey: z
    .string()
    .min(10, "Virtual key too short")
    .regex(/^(sk-studio-|sk-custodian-)[a-zA-Z0-9_-]+$/, "Must be a valid scoped virtual key (e.g. sk-studio-... or sk-custodian-...)"),
  projectId: z.string().min(1, "Project ID is required"),
  userId: z.string().optional(),
  mediaType: z.enum(["video", "audio", "image", "text"]),
  provider: z.string().min(1, "Provider name is required"),
  model: z.string().min(1, "Model name is required"),
  estimatedCostUsd: z.number().nonnegative("Estimated cost cannot be negative"),
  clipDurationSeconds: z.number().positive().optional(),
  studioContext: z
    .object({
      sceneNumber: z.number().int().positive().optional(),
      shotCode: z.string().optional(),
      takeNumber: z.number().int().positive().default(1),
      isReroll: z.boolean().default(false),
      rerollReason: z.string().optional(),
    })
    .default({ takeNumber: 1, isReroll: false }),
  prompt: z.string().optional(),
  parameters: z.record(z.any()).default({}),
});

/**
 * 2. Budget & Virtual Key Config Schema (Stored in Redis / Database)
 */
export const VirtualKeyConfigSchema = z.object({
  id: z.string(),
  keyHash: z.string(),
  projectId: z.string(),
  status: z.enum(["active", "revoked", "suspended"]).default("active"),
  monthlyBudgetCapUsd: z.number().positive(),
  rateLimitRpm: z.number().int().positive().default(60),
  allowedModels: z.array(z.string()).default(["*"]), // Wildcard or specific model names
  createdAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

/**
 * 3. Studio Generation Telemetry Event Schema
 * Conforms strictly to the `studio_generation_telemetry` PostgreSQL table.
 */
export const TelemetryEventSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  timestamp: z.string().datetime().nullable().optional(),
  virtualKeyId: z.string(),
  projectId: z.string(),
  userId: z.string().nullable().optional(),
  sceneNumber: z.number().int().positive().nullable().optional(),
  shotCode: z.string().nullable().optional(),
  takeNumber: z.number().int().positive().default(1),
  isReroll: z.boolean().default(false),
  rerollReason: z.string().nullable().optional(),
  mediaType: z.enum(["video", "audio", "image", "text"]),
  provider: z.string(),
  modelName: z.string(),
  clipDurationSeconds: z.number().nullable().optional(),
  costUsd: z.number().nonnegative(),
  billingRateUnit: z.string().default("per_second"),
  projectMonthlySpendUsd: z.number().nonnegative(),
  budgetRemainingUsd: z.number(),
  latencyMs: z.number().int().nonnegative(),
  httpStatusCode: z.number().int(),
  status: z.enum(["success", "failed", "budget_exceeded", "rate_limited", "unauthorized"]),
  errorCode: z.string().nullable().optional(),
  metadata: z.record(z.any()).default({}),
});
