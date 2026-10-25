/**
 * Session record validation, shared by the browser store and the REST API.
 */

export const MAX_SESSION_SEC = 3 * 60 * 60;

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function createSessionId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Returns a clean session object or throws with a message suitable for a 400 response.
 */
export function normalizeSession(input) {
  if (!input || typeof input !== 'object') throw new ValidationError('Session body must be an object');

  const patternId = String(input.patternId || '').trim();
  const patternName = String(input.patternName || '').trim();
  const rounds = Number(input.rounds);
  const durationSec = Number(input.durationSec);
  const completedAt = input.completedAt ? new Date(input.completedAt) : new Date();

  if (!patternId || patternId.length > 40) throw new ValidationError('patternId is required (max 40 chars)');
  if (!patternName || patternName.length > 80) throw new ValidationError('patternName is required (max 80 chars)');
  if (!Number.isInteger(rounds) || rounds < 0 || rounds > 200) throw new ValidationError('rounds must be an integer 0-200');
  if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > MAX_SESSION_SEC) {
    throw new ValidationError(`durationSec must be between 0 and ${MAX_SESSION_SEC}`);
  }
  if (Number.isNaN(completedAt.getTime())) throw new ValidationError('completedAt must be a valid date');

  return {
    id: typeof input.id === 'string' && input.id ? input.id.slice(0, 64) : createSessionId(),
    patternId,
    patternName,
    rounds,
    durationSec: Math.round(durationSec),
    completed: Boolean(input.completed),
    completedAt: completedAt.toISOString()
  };
}
