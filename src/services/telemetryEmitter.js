import { TelemetryEventSchema } from "../schemas/gateway.js";

/**
 * Service to format and emit generation telemetry events to the Documentation Room database.
 * Designed to execute asynchronously in the background so video rendering/streaming is never stalled.
 */
export class TelemetryEmitter {
  constructor({ sink = null } = {}) {
    // Sink is a custom handler or Supabase client table insert
    this.sink = sink;
    this.inFlightQueue = [];
  }

  /**
   * Formats a raw generation result into a validated Telemetry Event
   *
   * @param {Object} data - Raw generation and gateway outcome
   * @returns {Object} Validated telemetry payload
   */
  formatEvent(data) {
    const payload = {
      timestamp: new Date().toISOString(),
      virtualKeyId: data.virtualKeyId,
      projectId: data.projectId,
      userId: data.userId || null,
      sceneNumber: data.sceneNumber ?? null,
      shotCode: data.shotCode || null,
      takeNumber: data.takeNumber || 1,
      isReroll: Boolean(data.isReroll),
      rerollReason: data.rerollReason || null,
      mediaType: data.mediaType,
      provider: data.provider,
      modelName: data.modelName,
      clipDurationSeconds: data.clipDurationSeconds ?? null,
      costUsd: data.costUsd,
      billingRateUnit: data.billingRateUnit || "per_second",
      projectMonthlySpendUsd: data.projectMonthlySpendUsd,
      budgetRemainingUsd: data.budgetRemainingUsd,
      latencyMs: data.latencyMs,
      httpStatusCode: data.httpStatusCode,
      status: data.status,
      errorCode: data.errorCode || null,
      metadata: data.metadata || {},
    };

    return TelemetryEventSchema.parse(payload);
  }

  /**
   * Asynchronously emits the telemetry event to the ingest sink without throwing or blocking.
   *
   * @param {Object} eventData
   * @returns {Promise<Object>} Formatted and emitted telemetry record
   */
  async emitAsync(eventData) {
    try {
      const validatedEvent = this.formatEvent(eventData);

      if (this.sink && typeof this.sink.emit === "function") {
        // Fire-and-forget or track in microtask queue
        const promise = this.sink.emit(validatedEvent).catch((err) => {
          // Never crash caller process on telemetry transport failure
          return { error: err.message };
        });
        this.inFlightQueue.push(promise);
      }

      return { success: true, event: validatedEvent };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Waits for all pending telemetry promises to settle (useful for graceful shutdown & tests).
   */
  async flush() {
    await Promise.allSettled(this.inFlightQueue);
    this.inFlightQueue = [];
  }
}
