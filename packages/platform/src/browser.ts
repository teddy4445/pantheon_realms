/**
 * Browser adapters: IndexedDB save repository and localStorage preferences.
 *
 * Browser storage is quota-limited and may be evicted; the UI distinguishes
 * "storage unavailable" from "no saves" and offers file export/import.
 */
import { assertSaveId, type PlatformServices, type PreferencesStore, type SaveRepository, type StorageAvailability, type StoredSave, type WindowMode } from './contracts';

const DB_NAME = 'pantheon-realms';
const STORE = 'saves';
const PREFS_KEY = 'pantheon-realms.preferences.v1';
const RECORDS_KEY = 'pantheon-realms.records.v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Could not open browser storage'));
    req.onblocked = () => reject(new Error('Browser storage is blocked by another tab'));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const req = run(store);
        let value: T | undefined;
        if (req) req.onsuccess = () => (value = req.result);
        t.oncomplete = () => {
          db.close();
          resolve(value);
        };
        t.onerror = () => {
          db.close();
          reject(t.error ?? new Error('Storage transaction failed'));
        };
        t.onabort = () => {
          db.close();
          reject(t.error ?? new Error('Storage transaction aborted (quota?)'));
        };
      }),
  );
}

export class BrowserSaveRepository implements SaveRepository {
  readonly kind = 'browser' as const;

  async availability(): Promise<StorageAvailability> {
    try {
      await tx('readonly', (s) => s.count());
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'Browser storage unavailable' };
    }
  }

  async list(): Promise<StoredSave[]> {
    const rows = ((await tx<{ id: string; text: string }[]>('readonly', (s) => s.getAll() as IDBRequest<{ id: string; text: string }[]>)) ?? []) as {
      id: string;
      text: string;
    }[];
    return rows.map((r) => ({ id: r.id, text: r.text, bytes: r.text.length }));
  }

  async read(id: string): Promise<string | null> {
    assertSaveId(id);
    const row = (await tx<{ id: string; text: string }>('readonly', (s) => s.get(id) as IDBRequest<{ id: string; text: string }>)) as
      | { id: string; text: string }
      | undefined;
    return row?.text ?? null;
  }

  async write(id: string, text: string): Promise<void> {
    assertSaveId(id);
    await tx('readwrite', (s) => s.put({ id, text }));
  }

  async remove(id: string): Promise<void> {
    assertSaveId(id);
    await tx('readwrite', (s) => s.delete(id));
  }

  async exportSave(id: string, suggestedName: string): Promise<boolean> {
    const text = await this.read(id);
    if (text === null) return false;
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${suggestedName}.prsave.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  }

  importSave(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        file
          .text()
          .then(resolve)
          .catch(() => resolve(null));
      };
      input.click();
    });
  }
}

export class LocalPreferencesStore implements PreferencesStore {
  constructor(private readonly key: string = PREFS_KEY) {}
  async load(): Promise<string | null> {
    try {
      return localStorage.getItem(this.key);
    } catch {
      return null;
    }
  }
  async save(text: string): Promise<void> {
    localStorage.setItem(this.key, text);
  }
}

/** In-memory repository used when browser storage is denied, and in tests. */
export class MemorySaveRepository implements SaveRepository {
  readonly kind = 'memory' as const;
  private readonly data = new Map<string, string>();
  async availability(): Promise<StorageAvailability> {
    return { ok: true };
  }
  async list(): Promise<StoredSave[]> {
    return [...this.data.entries()].map(([id, text]) => ({ id, text, bytes: text.length }));
  }
  async read(id: string) {
    return this.data.get(id) ?? null;
  }
  async write(id: string, text: string) {
    assertSaveId(id);
    this.data.set(id, text);
  }
  async remove(id: string) {
    this.data.delete(id);
  }
  async exportSave() {
    return false;
  }
  async importSave() {
    return null;
  }
}

export function createBrowserPlatform(appVersion: string): PlatformServices {
  let mode: WindowMode = 'windowed';
  return {
    kind: 'browser',
    appVersion,
    saves: new BrowserSaveRepository(),
    preferences: new LocalPreferencesStore(),
    records: new LocalPreferencesStore(RECORDS_KEY),
    canQuit: false,
    quit: async () => undefined,
    supportsWindowMode: typeof document !== 'undefined' && !!document.documentElement.requestFullscreen,
    async setWindowMode(m) {
      // Browser fullscreen is a user-gesture action, not a persisted window mode.
      if (m === 'fullscreen' && !document.fullscreenElement) await document.documentElement.requestFullscreen();
      if (m !== 'fullscreen' && document.fullscreenElement) await document.exitFullscreen();
      mode = m;
    },
    async getWindowMode() {
      return document.fullscreenElement ? 'fullscreen' : mode === 'fullscreen' ? 'windowed' : mode;
    },
  };
}
