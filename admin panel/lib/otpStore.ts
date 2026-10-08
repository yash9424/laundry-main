/**
 * One-time passcodes for phone login, held in the server's memory.
 *
 * Two things used to go wrong here:
 *
 * 1. There was no expiry at all. The store was a plain Map, so a code lived
 *    until it was used. The "OTP expired" message users saw actually meant
 *    "no code found for this number", which was not the same thing.
 *
 * 2. A code was deleted the instant it verified. If the app sent the request
 *    twice — a double tap, or a second tap while the first was still in
 *    flight — the first call signed the user in and the second came back
 *    "OTP expired", leaving them staring at an error after a successful login.
 *    Installed builds still do this, so the fix has to live here too: a repeat
 *    of the same code shortly after it worked is treated as the same login.
 *
 * Note this lives in the process, so restarting the server drops every code in
 * flight. With one PM2 instance and a short lifetime that is tolerable, but a
 * deploy during someone's login will make them ask for a new code.
 */

const TTL_MS = 10 * 60 * 1000;        // a code is usable for 10 minutes
const REPLAY_GRACE_MS = 2 * 60 * 1000; // a duplicate request this soon after success still passes
const MAX_ATTEMPTS = 5;

type Entry = {
  code: string;
  expiresAt: number;
  attempts: number;
  verifiedAt?: number;
};

const entries = new Map<string, Entry>();

/** Drop anything long dead so the map cannot grow without bound. */
function sweep() {
  const now = Date.now();
  for (const [phone, entry] of entries) {
    const dead = entry.verifiedAt
      ? now - entry.verifiedAt > REPLAY_GRACE_MS
      : now > entry.expiresAt;
    if (dead) entries.delete(phone);
  }
}

/**
 * How often a number may ask for a code.
 *
 * Nothing used to limit this: one request per tap, each one a real SMS through
 * Indori, each one billable. A loop could empty the SMS credit, and could also
 * be used to pester a phone number that is not the caller's.
 */
const SEND_WINDOW_MS = 60 * 60 * 1000;   // the window the count applies to
const MAX_SENDS_PER_WINDOW = 5;          // real sign-ins need one or two
const MIN_GAP_MS = 30 * 1000;            // and never twice within half a minute

type SendLog = { times: number[] };
const sends = new Map<string, SendLog>();

export type SendAllowance =
  | { ok: true }
  | { ok: false; reason: 'too_soon' | 'too_many'; retryAfterSeconds: number };

/** Ask whether this number may be sent another code right now. */
export function canSendOtp(phone: string): SendAllowance {
  const now = Date.now();
  const log = sends.get(phone) ?? { times: [] };
  log.times = log.times.filter((t) => now - t < SEND_WINDOW_MS);

  const last = log.times[log.times.length - 1];
  if (last !== undefined && now - last < MIN_GAP_MS) {
    return { ok: false, reason: 'too_soon', retryAfterSeconds: Math.ceil((MIN_GAP_MS - (now - last)) / 1000) };
  }

  if (log.times.length >= MAX_SENDS_PER_WINDOW) {
    const oldest = log.times[0];
    return {
      ok: false,
      reason: 'too_many',
      retryAfterSeconds: Math.ceil((SEND_WINDOW_MS - (now - oldest)) / 1000),
    };
  }

  sends.set(phone, log);
  return { ok: true };
}

/** Record that a code actually went out. */
export function noteOtpSent(phone: string) {
  const now = Date.now();
  const log = sends.get(phone) ?? { times: [] };
  log.times = log.times.filter((t) => now - t < SEND_WINDOW_MS);
  log.times.push(now);
  sends.set(phone, log);

  // Keep the map from growing for numbers that never come back
  if (sends.size > 5000) {
    for (const [key, value] of sends) {
      if (value.times.every((t) => now - t >= SEND_WINDOW_MS)) sends.delete(key);
    }
  }
}

export function saveOtp(phone: string, code: string) {
  sweep();
  entries.set(phone, { code, expiresAt: Date.now() + TTL_MS, attempts: 0 });
}

export type VerifyResult =
  | { ok: true; replay: boolean }
  | { ok: false; reason: 'not_found' | 'expired' | 'mismatch' | 'too_many_attempts' };

export function verifyOtp(phone: string, code: string): VerifyResult {
  sweep();
  const entry = entries.get(phone);
  if (!entry) return { ok: false, reason: 'not_found' };

  // Already used: accept the same code again briefly, so a duplicate request
  // from the app cannot turn a successful login into an error.
  if (entry.verifiedAt !== undefined) {
    if (entry.code === code && Date.now() - entry.verifiedAt <= REPLAY_GRACE_MS) {
      return { ok: true, replay: true };
    }
    return { ok: false, reason: 'not_found' };
  }

  if (Date.now() > entry.expiresAt) {
    entries.delete(phone);
    return { ok: false, reason: 'expired' };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    entries.delete(phone);
    return { ok: false, reason: 'too_many_attempts' };
  }

  if (entry.code !== code) {
    entry.attempts += 1;
    return { ok: false, reason: 'mismatch' };
  }

  entry.verifiedAt = Date.now();
  return { ok: true, replay: false };
}

/** How many codes are waiting — for logging, never for returning to a client. */
export function pendingCount() {
  sweep();
  return entries.size;
}

export const OTP_TTL_MINUTES = TTL_MS / 60000;
