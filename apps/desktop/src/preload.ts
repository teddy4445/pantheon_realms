/**
 * Sandboxed preload: exposes ONLY the narrow DesktopBridge (window.prDesktop).
 * No filesystem, shell or arbitrary IPC access reaches the renderer.
 */
import { contextBridge, ipcRenderer } from 'electron';

declare const __APP_VERSION__: string;

const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('prDesktop', {
  appVersion: __APP_VERSION__,
  listSaves: () => invoke('pr:listSaves'),
  readSave: (id: string) => invoke('pr:readSave', id),
  writeSave: (id: string, text: string) => invoke('pr:writeSave', id, text),
  deleteSave: (id: string) => invoke('pr:deleteSave', id),
  exportSave: (id: string, suggestedName: string) => invoke('pr:exportSave', id, suggestedName),
  importSave: () => invoke('pr:importSave'),
  readPreferences: () => invoke('pr:readPreferences'),
  writePreferences: (text: string) => invoke('pr:writePreferences', text),
  setWindowMode: (mode: string) => invoke('pr:setWindowMode', mode),
  getWindowMode: () => invoke('pr:getWindowMode'),
  quit: () => invoke('pr:quit'),
});
