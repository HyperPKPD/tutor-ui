import Dexie, { type Table } from 'dexie';
import { useSyncExternalStore } from 'react';
import { PERSISTENCE } from '../config/appConfig';

/** One row per persisted setting (key/value store; values are plain JSON-compatible data). */
export interface SettingRow {
  key: string;
  value: unknown;
  updatedAt: number;
}
export interface QuizAttempt {
  id?: number;
  completedAt: number;
  score: number;
  total: number;
  answers: (number | null)[];
  /** which question pool the round was drawn from ('pk', 'er-emax', …); missing on rounds recorded before v1.2.3.8 (= 'pk') */
  pool?: string;
}

class PkDatabase extends Dexie {
  settings!: Table<SettingRow, string>;
  quizAttempts!: Table<QuizAttempt, number>;

  constructor() {
    super(PERSISTENCE.dbName);
    // Bump the version and add .upgrade() steps here when the schema changes.
    this.version(1).stores({
      settings: 'key, updatedAt',
      quizAttempts: '++id, completedAt',
    });
  }
}

export type SaveStatus = 'loading' | 'saved' | 'saving' | 'error' | 'unavailable';

let db: PkDatabase | null = null;
let snapshot: Record<string, unknown> = {};
let status: SaveStatus = 'loading';
let lastSavedAt: number | null = null;
const listeners = new Set<() => void>();
const pending = new Map<string, unknown>();
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing: Promise<void> | null = null;
let resetting = false;

const emit = () => listeners.forEach((l) => l());
const setStatus = (s: SaveStatus) => {
  if (s !== status) { status = s; emit(); }
};

/** Open the database and load every stored setting. Never throws: falls back to in-memory defaults. */
export async function initPersistence(): Promise<void> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB not available');
    const d = new PkDatabase();
    d.on('versionchange', () => { d.close(); }); // another tab upgraded the schema
    await d.open();
    const rows = await d.settings.toArray();
    snapshot = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    db = d;
    d.settings.bulkDelete([...PERSISTENCE.obsoleteKeys]).catch(() => undefined); // clean up keys from older versions
    setStatus('saved');
    // Ask the browser not to evict our data under storage pressure (best effort)
    navigator.storage?.persist?.().catch(() => undefined);
  } catch (err) {
    console.warn('[pksims] IndexedDB unavailable – settings will not persist this session.', err);
    db = null;
    setStatus('unavailable');
  }
  window.addEventListener('pagehide', () => void flushNow());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flushNow(); });
}

/** Raw stored value for a key (undefined if never saved). */
export const getStored = (key: string): unknown => snapshot[key];

/** Queue a write; coalesced and flushed after a short debounce so every change is captured in near real time. */
export function saveSetting(key: string, value: unknown): void {
  if (!db || resetting) return;
  snapshot[key] = value;
  pending.set(key, value);
  setStatus('saving');
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flushNow(), PERSISTENCE.debounceMs);
}

export function flushNow(): Promise<void> {
  if (timer) { clearTimeout(timer); timer = null; }
  if (flushing) return flushing.then(() => (pending.size ? flushNow() : undefined));
  if (!db || resetting || pending.size === 0) return Promise.resolve();
  const batch = Array.from(pending.entries());
  pending.clear();
  const now = Date.now();
  flushing = db.settings
    .bulkPut(batch.map(([key, value]) => ({ key, value, updatedAt: now })))
    .then(() => { lastSavedAt = Date.now(); setStatus(pending.size ? 'saving' : 'saved'); })
    .catch((err) => {
      console.error('[pksims] save failed (will retry on next change)', err);
      for (const [k, v] of batch) if (!pending.has(k)) pending.set(k, v); // keep for retry
      setStatus('error');
    })
    .finally(() => { flushing = null; });
  return flushing;
}

/** Delete every stored setting + quiz history and reload the page with factory defaults. */
export async function resetAll(): Promise<void> {
  resetting = true;
  if (timer) clearTimeout(timer);
  pending.clear();
  try {
    await db?.transaction('rw', db.settings, db.quizAttempts, async () => {
      await db!.settings.clear();
      await db!.quizAttempts.clear();
    });
  } catch (err) {
    console.error('[pksims] reset failed', err);
  }
  window.location.reload();
}

export async function addQuizAttempt(a: Omit<QuizAttempt, 'id'>): Promise<void> {
  try { await db?.quizAttempts.add(a); } catch (err) { console.error('[pksims] could not store quiz attempt', err); }
}
export async function getQuizStats(poolId = 'pk'): Promise<{ attempts: number; best: number | null; total: number | null }> {
  try {
    if (!db) return { attempts: 0, best: null, total: null };
    const all = (await db.quizAttempts.toArray()).filter((a) => (a.pool ?? 'pk') === poolId);
    if (!all.length) return { attempts: 0, best: null, total: null };
    const best = all.reduce((m, a) => (a.score / a.total > m.score / m.total ? a : m), all[0]);
    return { attempts: all.length, best: best.score, total: best.total };
  } catch { return { attempts: 0, best: null, total: null }; }
}

export function useSaveStatus(): { status: SaveStatus; lastSavedAt: number | null } {
  const s = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => status
  );
  return { status: s, lastSavedAt };
}
