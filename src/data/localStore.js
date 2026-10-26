/**
 * localStorage persistence. Every access is guarded: storage can be disabled
 * (private mode, blocked cookies), and the app must still work without it.
 */

const KEYS = {
  sessions: 'breath-trainer:sessions:v1'
};

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Returns false when storage is unavailable or full, so callers can tell the user. */
function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const LocalStore = {
  loadSessions: () => {
    const list = read(KEYS.sessions, []);
    // Ignore anything that isn't a saved run (hand-edited or corrupted storage).
    return Array.isArray(list) ? list.filter(s => s && typeof s === 'object' && typeof s.completedAt === 'string') : [];
  },
  saveSessions: sessions => write(KEYS.sessions, sessions)
};
