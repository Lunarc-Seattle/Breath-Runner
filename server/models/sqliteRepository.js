/**
 * Session storage backed by SQLite via better-sqlite3.
 * Implements the same public interface as sessionRepository.js:
 *   list, listPage, health, flush, add, clear
 *
 * On startup, if a .json file exists at the same base path (e.g. sessions.json
 * when DB path is sessions.db), those rows are migrated into SQLite and the JSON
 * file is renamed to .json.migrated.
 */
import Database from 'better-sqlite3';
import * as nodeFs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { dirname } from 'node:path';
import { normalizeSession } from '../../src/core/session.ts';

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  patternId TEXT NOT NULL,
  patternName TEXT NOT NULL,
  rounds INTEGER NOT NULL DEFAULT 0,
  durationSec REAL NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  completedAt TEXT NOT NULL,
  coins INTEGER,
  totalCoins INTEGER,
  syncPct INTEGER,
  falls INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sessions_order ON sessions (completedAt DESC, id DESC);
`;

const LIST_SQL = `
  SELECT * FROM sessions ORDER BY completedAt DESC, id DESC
`;

/** Newest first; ties on completedAt are broken by id so the order is total. */
function compareSessions(a, b) {
  const dt = Date.parse(b.completedAt) - Date.parse(a.completedAt);
  if (dt !== 0) return dt;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/** Convert a DB row to a Session object (coerce the SQLite INTEGER boolean). */
function rowToSession(row) {
  const session = { ...row, completed: Boolean(row.completed) };
  // Strip null optional fields so the object is clean.
  for (const key of ['coins', 'totalCoins', 'syncPct', 'falls']) {
    if (session[key] === null) delete session[key];
  }
  return session;
}

/** A stored row the JSON file can contain; anything else is skipped on migration. */
function isStoredSession(row) {
  return (
    row !== null &&
    typeof row === 'object' &&
    typeof row.id === 'string' &&
    typeof row.completedAt === 'string' &&
    !Number.isNaN(Date.parse(row.completedAt))
  );
}

/**
 * @param {{ filePath?: string|null, log?: { warn: Function, info: Function, error: Function } }} opts
 * filePath: path to the .db file; pass null or ':memory:' for an in-memory DB.
 */
export async function createSqliteRepository({ filePath = null, log = console } = {}) {
  const dbPath = filePath === null ? ':memory:' : filePath;
  const db = new Database(dbPath);

  // WAL mode for better concurrent read performance.
  db.pragma('journal_mode = WAL');

  // Create schema.
  db.exec(CREATE_TABLE_SQL);

  // Migrate from JSON if a sibling .json file exists.
  if (filePath && filePath !== ':memory:') {
    const jsonPath = filePath.replace(/\.db$/, '.json');
    if (jsonPath !== filePath) {
      try {
        const raw = await nodeFs.readFile(jsonPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const rows = parsed.filter(isStoredSession);
          const skipped = parsed.length - rows.length;
          if (skipped > 0)
            log.warn(`sqliteRepository: skipped ${skipped} malformed row(s) during migration from ${jsonPath}`);

          const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO sessions
              (id, patternId, patternName, rounds, durationSec, completed, completedAt, coins, totalCoins, syncPct, falls)
            VALUES
              (@id, @patternId, @patternName, @rounds, @durationSec, @completed, @completedAt, @coins, @totalCoins, @syncPct, @falls)
          `);

          const insertMany = db.transaction(rowsToInsert => {
            for (const row of rowsToInsert) {
              insertStmt.run({
                id: row.id,
                patternId: row.patternId,
                patternName: row.patternName,
                rounds: row.rounds ?? 0,
                durationSec: row.durationSec ?? 0,
                completed: row.completed ? 1 : 0,
                completedAt: row.completedAt,
                coins: row.coins ?? null,
                totalCoins: row.totalCoins ?? null,
                syncPct: row.syncPct ?? null,
                falls: row.falls ?? null
              });
            }
          });

          insertMany(rows);
          log.info(`sqliteRepository: migrated ${rows.length} session(s) from ${jsonPath}`);
        }
        await nodeFs.rename(jsonPath, `${jsonPath}.migrated`);
        log.info(`sqliteRepository: renamed ${jsonPath} to ${jsonPath}.migrated`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          log.warn(`sqliteRepository: could not migrate ${jsonPath}: ${err.message}`);
        }
      }
    }
  }

  const stmtList = db.prepare(LIST_SQL);

  const stmtInsert = db.prepare(`
    INSERT INTO sessions
      (id, patternId, patternName, rounds, durationSec, completed, completedAt, coins, totalCoins, syncPct, falls)
    VALUES
      (@id, @patternId, @patternName, @rounds, @durationSec, @completed, @completedAt, @coins, @totalCoins, @syncPct, @falls)
  `);

  const stmtDeleteAll = db.prepare('DELETE FROM sessions');

  return {
    /** Every session, newest first. */
    list() {
      return stmtList.all().map(rowToSession);
    },

    /**
     * One page of sessions, newest first. `after` is the last row of the previous page
     * ({ completedAt, id }); only rows strictly after it in the ordering are returned.
     */
    listPage({ limit, after = null }) {
      let rows = stmtList.all().map(rowToSession);
      if (after) rows = rows.filter(s => compareSessions(after, s) < 0);
      const page = rows.slice(0, limit);
      return { sessions: page, hasMore: rows.length > limit };
    },

    /** Whether the store can accept writes: the DB file directory must be writable. */
    async health() {
      if (dbPath === ':memory:') return { storage: 'ok' };
      const dir = dirname(dbPath);
      try {
        await nodeFs.access(dir, fsConstants.W_OK);
        return { storage: 'ok' };
      } catch (err) {
        if (err.code === 'ENOENT') {
          try {
            await nodeFs.mkdir(dir, { recursive: true });
            await nodeFs.access(dir, fsConstants.W_OK);
            return { storage: 'ok' };
          } catch {
            return { storage: 'error' };
          }
        }
        return { storage: 'error' };
      }
    },

    /** No-op: better-sqlite3 writes are synchronous; nothing to drain. */
    flush() {
      return Promise.resolve();
    },

    async add(input) {
      const session = normalizeSession(input);
      stmtInsert.run({
        id: session.id,
        patternId: session.patternId,
        patternName: session.patternName,
        rounds: session.rounds,
        durationSec: session.durationSec,
        completed: session.completed ? 1 : 0,
        completedAt: session.completedAt,
        coins: session.coins ?? null,
        totalCoins: session.totalCoins ?? null,
        syncPct: session.syncPct ?? null,
        falls: session.falls ?? null
      });
      return session;
    },

    clear() {
      stmtDeleteAll.run();
      return Promise.resolve();
    }
  };
}
