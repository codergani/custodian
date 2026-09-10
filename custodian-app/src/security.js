// Security utilities for Brute-Force lockout and Auto-Lock inactivity management

/**
 * Calculates exponential backoff lockout duration in seconds.
 * 1..4 attempts: 0 seconds (no lockout)
 * 5 attempts: 30 seconds (30 * 2^0)
 * 6 attempts: 60 seconds (30 * 2^1)
 * 7 attempts: 120 seconds (30 * 2^2)
 * 8 attempts: 240 seconds (30 * 2^3)
 * ...
 * Capped at 900 seconds (15 minutes).
 */
export function calculateLockoutDuration(failedCount) {
  if (failedCount < 5) return 0;
  const exponent = failedCount - 5;
  const seconds = 30 * Math.pow(2, exponent);
  return Math.min(seconds, 900);
}

/**
 * Reads the current lockout state for a user from localStorage.
 */
export function getLockoutState(userId) {
  try {
    const raw = localStorage.getItem(`custodian_failed_attempts_${userId}`);
    if (!raw) return { count: 0, lockedUntil: 0, remainingSeconds: 0 };
    const parsed = JSON.parse(raw);
    const count = Number(parsed.count) || 0;
    const lockedUntil = Number(parsed.lockedUntil) || 0;
    const remainingSeconds = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
    return { count, lockedUntil, remainingSeconds };
  } catch {
    return { count: 0, lockedUntil: 0, remainingSeconds: 0 };
  }
}

/**
 * Records a failed unlock attempt and calculates the new lockout duration.
 */
export function recordFailedAttempt(userId) {
  try {
    const current = getLockoutState(userId);
    const newCount = current.count + 1;
    const lockoutSecs = calculateLockoutDuration(newCount);
    const lockedUntil = lockoutSecs > 0 ? Date.now() + lockoutSecs * 1000 : 0;
    
    const state = { count: newCount, lockedUntil };
    localStorage.setItem(`custodian_failed_attempts_${userId}`, JSON.stringify(state));
    return {
      count: newCount,
      lockedUntil,
      remainingSeconds: lockoutSecs,
    };
  } catch {
    return { count: 1, lockedUntil: 0, remainingSeconds: 0 };
  }
}

/**
 * Resets the failed unlock attempts on successful unlock.
 */
export function clearFailedAttempts(userId) {
  try {
    localStorage.removeItem(`custodian_failed_attempts_${userId}`);
  } catch {}
}

/**
 * Auto-lock duration options in minutes.
 * 0 means "Never".
 */
export const AUTOLOCK_OPTIONS = [
  { value: 1, label: "1 minute" },
  { value: 5, label: "5 minutes (Default)" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 0, label: "Never" },
];

export function getAutoLockMinutes(userId) {
  try {
    const saved = localStorage.getItem(`custodian_autolock_mins_${userId}`);
    if (saved !== null) {
      const parsed = Number(saved);
      if (!isNaN(parsed)) return parsed;
    }
  } catch {}
  return 5; // default 5 minutes
}

export function setAutoLockMinutes(userId, minutes) {
  try {
    localStorage.setItem(`custodian_autolock_mins_${userId}`, String(minutes));
  } catch {}
}
