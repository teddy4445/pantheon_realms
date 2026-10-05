/**
 * Browser adapters: IndexedDB save repository and localStorage preferences.
 *
 * Browser storage is quota-limited and may be evicted; the UI distinguishes
 * "storage unavailable" from "no saves" and offers file export/import.
 */
import { assertSaveId, SAVE_ID_PATTERN, type MapFiles, type PlatformServices, type PreferencesStore, type SaveRepository, type StorageAvailability, type StoredSave, type WindowMode } from './contracts';

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

const MAPS_KEY = 'pantheon-realms.maps.v1';

function downloadText(text: string, fileName: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function pickTextFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file || file.size > 4 * 1024 * 1024) return resolve(null);
      file
        .text()
        .then(resolve)
        .catch(() => resolve(null));
    };
    input.click();
  });
}

/** Custom maps in the browser: a small library in local storage (maps are a few kilobytes). */
export class BrowserMapFiles implements MapFiles {
  constructor(private readonly key: string = MAPS_KEY) {}
  private all(): Record<string, string> {
    try {
      const raw = localStorage.getItem(this.key);
      const parsed = raw ? (JSON.parse(raw) as unknown) : {};
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
    } catch {
      return {};
    }
  }
  private put(all: Record<string, string>): void {
    localStorage.setItem(this.key, JSON.stringify(all));
  }
  async list() {
    return Object.entries(this.all())
      .filter(([id, t]) => SAVE_ID_PATTERN.test(id) && typeof t === 'string')
      .map(([id, t]) => ({ id, bytes: t.length }))
      .sort((a, b) => (a.id < b.id ? -1 : 1));
  }
  async read(id: string) {
    assertSaveId(id);
    return this.all()[id] ?? null;
  }
  async write(id: string, text: string) {
    assertSaveId(id);
    const all = this.all();
    all[id] = text;
    this.put(all);
  }
  async remove(id: string) {
    assertSaveId(id);
    const all = this.all();
    delete all[id];
    this.put(all);
  }
  async exportFile(text: string, suggestedName: string) {
    downloadText(text, `${suggestedName.replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 48) || 'map'}.prmap.json`);
    return true;
  }
  importFile() {
    return pickTextFile();
  }
}

export function createBrowserPlatform(appVersion: string): PlatformServices {
  let mode: WindowMode = 'windowed';
  return {
    kind: 'browser',
    appVersion,
    saves: new BrowserSaveRepository(),
    maps: new BrowserMapFiles(),
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
