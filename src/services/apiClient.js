/**
 * Session repository with two backends:
 *  - 'server': the Express API, used when the app is served by `npm start`
 *  - 'local':  browser localStorage, used on static hosting such as GitHub Pages
 *
 * The API is resolved relative to the page, so the same build works in both places.
 */
import { LocalStore } from '../data/localStore.js';
import { normalizeSession } from '../core/session.ts';

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
  } catch {
    // No API reachable: static hosting.
  }
  return 'local';
}

const PAGE_LIMIT = 200;
const MAX_PAGES = 50; // 10,000 runs; a guard against a server that never stops paging

/** Every stored run, following the API's nextCursor until the last page. */
async function listAllSessions() {
  const all = [];
  let cursor = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (cursor) query.set('cursor', cursor);
    const { sessions, nextCursor } = await request(`/sessions?${query}`);
    all.push(...sessions);
    if (!nextCursor) break;
    cursor = nextCursor;
  }
  return all;
}

let repositoryPromise = null;

/**
 * The session repository for this page. A found server is remembered; "no server" is not,
 * so one slow probe (e.g. a cold start) doesn't pin the whole visit to localStorage.
 */
export function getSessionRepository() {
  if (!repositoryPromise) {
    repositoryPromise = detectBackend().then(mode => {
      if (mode !== 'server') repositoryPromise = null;
      return createSessionRepository(mode);
    });
  }
  return repositoryPromise;
}

export function createSessionRepository(mode) {
  if (mode === 'server') {
    return {
      mode,
      list: listAllSessions,
      add: async session => (await request('/sessions', { method: 'POST', body: JSON.stringify(session) })).session,
      clear: async () => {
        await request('/sessions', { method: 'DELETE' });
      }
    };
  }

  return {
    mode: 'local',
    list: async () => LocalStore.loadSessions(),
    add: async session => {
      const clean = normalizeSession(session);
      if (!LocalStore.saveSessions([clean, ...LocalStore.loadSessions()])) {
        throw new Error("this browser's storage is full or blocked");
      }
      return clean;
    },
    clear: async () => {
      if (!LocalStore.saveSessions([])) throw new Error("this browser's storage is full or blocked");
    }
  };
}
