/**
 * Practical in-memory rate limiter to mitigate brute-force and credential-stuffing attacks.
 *
 * Tracks failed authentication attempts per key (client IP or account email)
 * within a sliding time window. State is in memory, so it resets when the
 * server restarts and is not shared between multiple server instances.
 */

interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minute lock upon hitting threshold

const ipStore = new Map<string, RateLimitRecord>();

/**
 * Periodically cleans up expired records to keep memory bounded.
 */
function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [ip, record] of ipStore.entries()) {
    if (record.blockedUntil && record.blockedUntil < now) {
      ipStore.delete(ip);
    } else if (!record.blockedUntil && now - record.firstAttemptAt > WINDOW_MS) {
      ipStore.delete(ip);
    }
  }
}

// Run cleanup every 10 minutes in long-running processes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredRecords, 10 * 60 * 1000).unref();
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
}

/**
 * Checks whether the client IP is allowed to attempt a login.
 */
export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const record = ipStore.get(ip);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  // Check if currently blocked
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  // If window expired, reset record
  if (now - record.firstAttemptAt > WINDOW_MS) {
    ipStore.delete(ip);
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - record.attempts);
  return { allowed: remaining > 0, remainingAttempts: remaining };
}

/**
 * Records a failed authentication attempt for the IP.
 */
export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = ipStore.get(ip);

  if (!record || now - record.firstAttemptAt > WINDOW_MS) {
    ipStore.set(ip, {
      attempts: 1,
      firstAttemptAt: now,
    });
    return;
  }

  record.attempts += 1;
  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
  }
}

/**
 * Resets failed attempts for the IP upon successful authentication.
 */
export function resetAttempts(ip: string): void {
  ipStore.delete(ip);
}

