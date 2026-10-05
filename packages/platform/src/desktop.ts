/**
 * Desktop adapters: thin wrappers over the narrow Electron preload bridge.
 * All filesystem work happens in the main process after argument validation.
 */
import { assertSaveId, type DesktopBridge, type MapFiles, type PlatformServices, type SaveRepository, type StorageAvailability, type StoredSave } from './contracts';

export class ElectronSaveRepository implements SaveRepository {
  readonly kind = 'desktop' as const;
  constructor(private readonly bridge: DesktopBridge) {}

  async availability(): Promise<StorageAvailability> {
    try {
      await this.bridge.listSaves();
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'Save folder unavailable' };
    }
  }

  async list(): Promise<StoredSave[]> {
    const entries = await this.bridge.listSaves();
    const out: StoredSave[] = [];
    for (const e of entries) {
      const text = await this.bridge.readSave(e.id);
      if (text !== null) out.push({ id: e.id, text, bytes: e.bytes });
    }
    return out;
  }

  read(id: string) {
    assertSaveId(id);
    return this.bridge.readSave(id);
  }

  write(id: string, text: string) {
    assertSaveId(id);
    return this.bridge.writeSave(id, text);
  }

  remove(id: string) {
    assertSaveId(id);
    return this.bridge.deleteSave(id);
  }

  exportSave(id: string, suggestedName: string) {
    assertSaveId(id);
    return this.bridge.exportSave(id, suggestedName);
  }

  importSave() {
    return this.bridge.importSave();
  }
}

/** Custom maps on desktop: files in the app's data folder (`maps/<id>.prmap.json`) via the bridge. */
export class ElectronMapFiles implements MapFiles {
  constructor(private readonly bridge: DesktopBridge) {}
  list() {
    return this.bridge.listMaps();
  }
  read(id: string) {
    assertSaveId(id);
    return this.bridge.readMap(id);
  }
  write(id: string, text: string) {
    assertSaveId(id);
    return this.bridge.writeMap(id, text);
  }
  remove(id: string) {
    assertSaveId(id);
    return this.bridge.deleteMap(id);
  }
  exportFile(text: string, suggestedName: string) {
    return this.bridge.exportMap(text, suggestedName);
  }
  importFile() {
    return this.bridge.importMap();
  }
}

export function createDesktopPlatform(bridge: DesktopBridge): PlatformServices {
  return {
    kind: 'desktop',
    appVersion: bridge.appVersion,
    saves: new ElectronSaveRepository(bridge),
    maps: new ElectronMapFiles(bridge),
    preferences: { load: () => bridge.readPreferences(), save: (t) => bridge.writePreferences(t) },
    records: { load: () => bridge.readRecords(), save: (t) => bridge.writeRecords(t) },
    canQuit: true,
    quit: () => bridge.quit(),
    supportsWindowMode: true,
    setWindowMode: (m) => bridge.setWindowMode(m),
    getWindowMode: () => bridge.getWindowMode(),
  };
}
