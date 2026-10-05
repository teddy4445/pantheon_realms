/**
 * Platform service contracts shared by the browser and Electron builds.
 *
 * Adapters change storage and native actions only. They never contain game
 * rules; save text is validated by @pr/session before it becomes active.
 */

export interface StoredSave {
  readonly id: string;
  readonly text: string;
  readonly bytes: number;
}

export type StorageAvailability = { readonly ok: true } | { readonly ok: false; readonly reason: string };

export interface SaveRepository {
  readonly kind: 'browser' | 'desktop' | 'memory';
  availability(): Promise<StorageAvailability>;
  list(): Promise<StoredSave[]>;
  read(id: string): Promise<string | null>;
  /** Atomic replace where the platform supports it (desktop: temp file + rename + backup). */
  write(id: string, text: string): Promise<void>;
  remove(id: string): Promise<void>;
  /** Export a save to a user-chosen file (download in the browser). */
  exportSave(id: string, suggestedName: string): Promise<boolean>;
  /** Pick a save file to import; returns its text for validation, or null when cancelled. */
  importSave(): Promise<string | null>;
}

/** The player's custom maps (map editor, 2026-10-05): a small library plus file export/import. */
export interface MapFiles {
  list(): Promise<{ id: string; bytes: number }[]>;
  read(id: string): Promise<string | null>;
  write(id: string, text: string): Promise<void>;
  remove(id: string): Promise<void>;
  /** Save a map to a user-chosen file (a download in the browser). */
  exportFile(text: string, suggestedName: string): Promise<boolean>;
  /** Pick a map file; returns its text for validation (untrusted), or null when cancelled. */
  importFile(): Promise<string | null>;
}

export interface PreferencesStore {
  load(): Promise<string | null>;
  save(text: string): Promise<void>;
}

export type WindowMode = 'windowed' | 'fullscreen' | 'borderless';

export interface PlatformServices {
  readonly kind: 'browser' | 'desktop';
  readonly appVersion: string;
  readonly saves: SaveRepository;
  /** Custom maps made in the map editor. */
  readonly maps: MapFiles;
  readonly preferences: PreferencesStore;
  /** Player records (high-score table), kept apart from saves and preferences. */
  readonly records: PreferencesStore;
  /** Native Quit exists only on desktop; the browser never pretends to close a tab. */
  readonly canQuit: boolean;
  quit(): Promise<void>;
  readonly supportsWindowMode: boolean;
  setWindowMode(mode: WindowMode): Promise<void>;
  getWindowMode(): Promise<WindowMode>;
}

/** Narrow bridge exposed by the Electron preload (contextBridge) as window.prDesktop. */
export interface DesktopBridge {
  readonly appVersion: string;
  listSaves(): Promise<{ id: string; bytes: number }[]>;
  readSave(id: string): Promise<string | null>;
  writeSave(id: string, text: string): Promise<void>;
  deleteSave(id: string): Promise<void>;
  exportSave(id: string, suggestedName: string): Promise<boolean>;
  importSave(): Promise<string | null>;
  listMaps(): Promise<{ id: string; bytes: number }[]>;
  readMap(id: string): Promise<string | null>;
  writeMap(id: string, text: string): Promise<void>;
  deleteMap(id: string): Promise<void>;
  exportMap(text: string, suggestedName: string): Promise<boolean>;
  importMap(): Promise<string | null>;
  readPreferences(): Promise<string | null>;
  writePreferences(text: string): Promise<void>;
  readRecords(): Promise<string | null>;
  writeRecords(text: string): Promise<void>;
  setWindowMode(mode: WindowMode): Promise<void>;
  getWindowMode(): Promise<WindowMode>;
  quit(): Promise<void>;
}

/** Save identifiers are confined to a safe alphabet on every platform. */
export const SAVE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function assertSaveId(id: string): void {
  if (!SAVE_ID_PATTERN.test(id)) throw new Error(`Invalid save identifier "${id}"`);
}
