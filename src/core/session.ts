/**
 * Session record validation, shared by the browser store and the REST API.
 */

/** Optional Breath Runner results attached to a session. */
export interface GameResult {
  coins?: number;
  totalCoins?: number;
  syncPct?: number;
  falls?: number;
}

export type GameField = keyof GameResult;

/** A validated, stored practice session. */
export interface Session extends GameResult {
  id: string;
  patternId: string;
  patternName: string;
  rounds: number;
  durationSec: number;
  completed: boolean;
  /** ISO 8601 timestamp. */
  completedAt: string;
}

/**
 * What a client sends. Fields are loosely typed because they come straight from JSON;
 * normalizeSession coerces and validates them.
 */
export interface SessionInput {
  patternId?: unknown;
  patternName?: unknown;
  rounds?: unknown;
  durationSec?: unknown;
  completed?: unknown;
  completedAt?: string | number | Date | null;
  coins?: unknown;
  totalCoins?: unknown;
  syncPct?: unknown;
  falls?: unknown;
}

export const MAX_SESSION_SEC = 3 * 60 * 60;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function createSessionId(): string {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Clock skew we tolerate between a client and the server for completedAt. */
export const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

// Optional Breath Runner results, validated when present: [field, max].
const GAME_FIELDS: readonly (readonly [GameField, number])[] = [['coins', 1000], ['totalCoins', 1000], ['syncPct', 100], ['falls', 1000]];

/**
 * Returns a clean session object or throws with a message suitable for a 400 response.
 * The id is always generated here, never taken from the client, so a request can't
 * overwrite someone else's record.
 */
export function normalizeSession(input: unknown, now: Date = new Date()): Session {
  if (!input || typeof input !== 'object') throw new ValidationError('Session body must be an object');
  const body = input as SessionInput;

  const patternId = String(body.patternId || '').trim();
  const patternName = String(body.patternName || '').trim();
  const rounds = Number(body.rounds);
  const durationSec = Number(body.durationSec);
  const completedAt = body.completedAt ? new Date(body.completedAt) : now;

  if (!patternId || patternId.length > 40) throw new ValidationError('patternId is required (max 40 chars)');
  if (!patternName || patternName.length > 80) throw new ValidationError('patternName is required (max 80 chars)');
  if (!Number.isInteger(rounds) || rounds < 0 || rounds > 200) throw new ValidationError('rounds must be an integer 0-200');
  if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > MAX_SESSION_SEC) {
    throw new ValidationError(`durationSec must be between 0 and ${MAX_SESSION_SEC}`);
  }
  if (Number.isNaN(completedAt.getTime())) throw new ValidationError('completedAt must be a valid date');
  if (completedAt.getTime() > now.getTime() + MAX_CLOCK_SKEW_MS) {
    throw new ValidationError('completedAt cannot be in the future');
  }

  const game: GameResult = {};
  for (const [field, max] of GAME_FIELDS) {
    if (body[field] === undefined || body[field] === null) continue;
    const value = Number(body[field]);
    if (!Number.isInteger(value) || value < 0 || value > max) {
      throw new ValidationError(`${field} must be an integer 0-${max}`);
    }
    game[field] = value;
  }
  if (game.coins !== undefined && game.totalCoins !== undefined && game.coins > game.totalCoins * Math.max(1, rounds + 1)) {
    throw new ValidationError('coins cannot exceed the coins available in the run');
  }

  return {
    id: createSessionId(),
    patternId,
    patternName,
    rounds,
    durationSec: Math.round(durationSec),
    completed: Boolean(body.completed),
    completedAt: completedAt.toISOString(),
    ...game
  };
}
