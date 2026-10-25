/**
 * Session repository with two backends:
 *  - 'server': the Express API, used when the app is served by `npm start`
 *  - 'local':  browser localStorage, used on static hosting such as GitHub Pages
 *
 * The API is resolved relative to the page, so the same build works in both places.
 */
import { LocalStore } from '../data/localStore.js';
import { normalizeSession } from '../core/session.js';

const API_BASE = new URL('./api/v1', window.location.href).href.replace(/\/$/, '');

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

export async function detectBackend() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok && (await res.json()).status === 'ok') return 'server';
  } catch (_) {
    // No API reachable: static hosting.
  }
  return 'local';
}

export function createSessionRepository(mode) {
  if (mode === 'server') {
    return {
      mode,
      list: async () => (await request('/sessions')).sessions,
      add: async session => (await request('/sessions', { method: 'POST', body: JSON.stringify(session) })).session,
      clear: async () => { await request('/sessions', { method: 'DELETE' }); }
    };
  }

  return {
    mode: 'local',
    list: async () => LocalStore.loadSessions(),
    add: async session => {
      const clean = normalizeSession(session);
      LocalStore.saveSessions([clean, ...LocalStore.loadSessions()]);
      return clean;
    },
    clear: async () => LocalStore.saveSessions([])
  };
}
