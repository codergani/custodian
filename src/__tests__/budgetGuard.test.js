import { describe, it, expect, beforeEach } from "vitest";
import {
  budgetGuardMiddleware,
  reconcileBudgetReservation,
  MemoryRedisStore,
  getMonthlySpendKey,
} from "../middleware/budgetGuard.js";
import { TelemetryEmitter } from "../services/telemetryEmitter.js";

describe("Phase 2 AI Gateway: Redis USD Budget Guardrail & Telemetry Suite", () => {
  let store;
  let mockKeyStore;

  const validKey = "sk-studio-filmmaker-prod-8f2a91";
  const revokedKey = "sk-studio-leaked-key-000000";
  const projectId = "project-cyberpunk-2099";

  beforeEach(() => {
    store = new MemoryRedisStore();
    mockKeyStore = new Map([
      [
        validKey,
        {
          id: "vk_001",
          keyHash: "sha256_mock_hash",
          projectId,
          status: "active",
          monthlyBudgetCapUsd: 100.0, // $100 budget cap
          rateLimitRpm: 10,
          allowedModels: ["kling-v2.5", "flux-schnell", "eleven_multilingual_v2"],
        },
      ],
      [
        revokedKey,
        {
          id: "vk_002",
          keyHash: "sha256_revoked_hash",
          projectId,
          status: "revoked",
          monthlyBudgetCapUsd: 50.0,
          rateLimitRpm: 5,
          allowedModels: ["*"],
        },
      ],
    ]);
  });

  const keyResolver = async (key) => mockKeyStore.get(key) || null;

  it("1. Approves requests under monthly budget and increments Redis spend atomically", async () => {
    const payload = {
      virtualKey: validKey,
      projectId,
      mediaType: "video",
      provider: "kling",
      model: "kling-v2.5",
      estimatedCostUsd: 0.175, // $0.175 for a 5s clip
      clipDurationSeconds: 5.0,
      studioContext: {
        sceneNumber: 3,
        shotCode: "SC03_SH01",
        takeNumber: 1,
        isReroll: false,
      },
    };

    const decision = await budgetGuardMiddleware(payload, { store, keyResolver });

    expect(decision.authorized).toBe(true);
    expect(decision.statusCode).toBe(200);
    expect(decision.finops.currentSpendUsd).toBe(0.175);
    expect(decision.finops.budgetRemainingUsd).toBe(99.825);

    // Verify state persisted in Redis
    const budgetKey = getMonthlySpendKey(projectId);
    const storedVal = await store.get(budgetKey);
    expect(parseFloat(storedVal)).toBe(0.175);
  });

  it("2. Triggers Hard Killswitch (HTTP 402) when request exceeds monthly budget cap", async () => {
    // Pre-populate spend close to the $100 cap ($99.90 already spent)
    const budgetKey = getMonthlySpendKey(projectId);
    await store.set(budgetKey, "99.90");

    const expensivePayload = {
      virtualKey: validKey,
      projectId,
      mediaType: "video",
      provider: "kling",
      model: "kling-v2.5",
      estimatedCostUsd: 0.25, // $0.25 would push total to $100.15 (Over $100 cap!)
      clipDurationSeconds: 8.0,
      studioContext: {
        sceneNumber: 4,
        shotCode: "SC04_SH02",
      },
    };

    const decision = await budgetGuardMiddleware(expensivePayload, { store, keyResolver });

    expect(decision.authorized).toBe(false);
    expect(decision.statusCode).toBe(402);
    expect(decision.error).toBe("BUDGET_EXCEEDED");
    expect(decision.finops.currentSpendUsd).toBe(99.9);
    expect(decision.finops.budgetCapUsd).toBe(100.0);
    expect(decision.finops.budgetRemainingUsd).toBe(0.1);

    // Ensure Redis spend was NOT incremented on rejection
    const storedVal = await store.get(budgetKey);
    expect(parseFloat(storedVal)).toBe(99.9);
  });

  it("3. Rejects invalid and revoked virtual keys with HTTP 401", async () => {
    // 3a: Non-existent key
    const missingDecision = await budgetGuardMiddleware(
      {
        virtualKey: "sk-studio-unknown-ghost-token-999",
        projectId,
        mediaType: "text",
        provider: "openai",
        model: "gpt-4o",
        estimatedCostUsd: 0.01,
      },
      { store, keyResolver }
    );

    expect(missingDecision.authorized).toBe(false);
    expect(missingDecision.statusCode).toBe(401);
    expect(missingDecision.error).toBe("INVALID_VIRTUAL_KEY");

    // 3b: Revoked key (5-second killswitch)
    const revokedDecision = await budgetGuardMiddleware(
      {
        virtualKey: revokedKey,
        projectId,
        mediaType: "video",
        provider: "kling",
        model: "kling-v2.5",
        estimatedCostUsd: 0.1,
      },
      { store, keyResolver }
    );

    expect(revokedDecision.authorized).toBe(false);
    expect(revokedDecision.statusCode).toBe(401);
    expect(revokedDecision.error).toBe("REVOKED_VIRTUAL_KEY");
  });

  it("4. Enforces Model Allowlists (blocks unapproved models with HTTP 403)", async () => {
    const unapprovedPayload = {
      virtualKey: validKey, // Only allows kling-v2.5, flux-schnell, eleven_multilingual_v2
      projectId,
      mediaType: "video",
      provider: "runway",
      model: "runway-gen3-alpha-turbo", // Not in allowlist!
      estimatedCostUsd: 0.5,
    };

    const decision = await budgetGuardMiddleware(unapprovedPayload, { store, keyResolver });

    expect(decision.authorized).toBe(false);
    expect(decision.statusCode).toBe(403);
    expect(decision.error).toBe("MODEL_NOT_PERMITTED");
    expect(decision.allowedModels).toContain("kling-v2.5");
  });

  it("5. Enforces RPM (Requests Per Minute) Rate Limits (HTTP 429)", async () => {
    const keyData = mockKeyStore.get(validKey);
    keyData.rateLimitRpm = 3; // Strict 3 RPM for test

    const payload = {
      virtualKey: validKey,
      projectId,
      mediaType: "audio",
      provider: "elevenlabs",
      model: "eleven_multilingual_v2",
      estimatedCostUsd: 0.005,
    };

    // 3 successful requests
    await budgetGuardMiddleware(payload, { store, keyResolver });
    await budgetGuardMiddleware(payload, { store, keyResolver });
    await budgetGuardMiddleware(payload, { store, keyResolver });

    // 4th request must be rate limited
    const rateLimited = await budgetGuardMiddleware(payload, { store, keyResolver });
    expect(rateLimited.authorized).toBe(false);
    expect(rateLimited.statusCode).toBe(429);
    expect(rateLimited.error).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("6. Reconciles budget reservations if upstream provider fails or costs less", async () => {
    const budgetKey = getMonthlySpendKey(projectId);
    await store.set(budgetKey, "50.00");

    // Refund $10.00 due to upstream generation timeout
    await reconcileBudgetReservation({
      projectId,
      differenceUsd: -10.0,
      store,
    });

    const updated = await store.get(budgetKey);
    expect(parseFloat(updated)).toBe(40.0);
  });

  it("7. Asynchronously formats and emits validated telemetry events to Documentation Room sink", async () => {
    const sinkEvents = [];
    const mockSink = {
      emit: async (event) => {
        sinkEvents.push(event);
        return { ok: true };
      },
    };

    const emitter = new TelemetryEmitter({ sink: mockSink });

    const emitResult = await emitter.emitAsync({
      virtualKeyId: "sk-studio-filmmaker-prod-8f2a91",
      projectId: "project-cyberpunk-2099",
      sceneNumber: 7,
      shotCode: "SC07_SH03",
      takeNumber: 4,
      isReroll: true,
      rerollReason: "Character eyes out of focus",
      mediaType: "video",
      provider: "kling",
      modelName: "kling-v2.5",
      clipDurationSeconds: 5.0,
      costUsd: 0.175,
      projectMonthlySpendUsd: 14.85,
      budgetRemainingUsd: 85.15,
      latencyMs: 12400,
      httpStatusCode: 200,
      status: "success",
      metadata: { seed: 9948102, motion_bucket: 127 },
    });

    expect(emitResult.success).toBe(true);
    expect(emitResult.event.shotCode).toBe("SC07_SH03");
    expect(emitResult.event.isReroll).toBe(true);
    expect(emitResult.event.costUsd).toBe(0.175);

    await emitter.flush();
    expect(sinkEvents).toHaveLength(1);
    expect(sinkEvents[0].modelName).toBe("kling-v2.5");
  });
});
