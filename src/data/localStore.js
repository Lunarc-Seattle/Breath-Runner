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
  } catch (_) {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    // Storage unavailable or full; in-memory state still works for this visit.
  }
}

export const LocalStore = {
  loadSessions: () => {
    const list = read(KEYS.sessions, []);
    return Array.isArray(list) ? list : [];
  },
  saveSessions: sessions => write(KEYS.sessions, sessions)
};
