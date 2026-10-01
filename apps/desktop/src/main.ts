/**
 * Pantheon Realms — Electron main process.
 *
 * Security posture (production/01 §7):
 *  - app-owned origin prgame://app/ serving ONLY packaged renderer files
 *  - contextIsolation + sandbox + nodeIntegration:false; narrow typed IPC
 *  - IPC sender and arguments validated; save IDs confined to the saves folder
 *  - navigation, new windows and remote content are denied
 *  - no network is required to launch or play
 */
import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, session, shell, type IpcMainInvokeEvent } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SCHEME = 'prgame';
const ORIGIN = `${SCHEME}://app`;
const SAVE_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const MAX_SAVE_BYTES = 20 * 1024 * 1024;
// Development convenience only: ignored in packaged (installed) builds, so no environment
// variable can point the installed game at another page or widen the IPC sender check.
const DEV_URL = app.isPackaged ? undefined : process.env.PR_DEV_URL || undefined;

// A desktop game may start its menu music without waiting for the first click
// (browsers require a click first; the browser build waits for it).
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } },
]);

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "media-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');

function rendererRoot(): string {
  return path.join(app.getAppPath(), 'renderer');
}

function savesDir(): string {
  return path.join(app.getPath('userData'), 'saves');
}

function prefsFile(): string {
  return path.join(app.getPath('userData'), 'preferences.json');
}

function resolveRendererPath(urlPath: string): string | null {
  const root = rendererRoot();
  const decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  const rel = decoded === '/' || decoded === '' ? 'index.html' : decoded.replace(/^\/+/, '');
  const full = path.normalize(path.join(root, rel));
  if (full !== root && !full.startsWith(root + path.sep)) return null; // traversal
  return full;
}

async function atomicWrite(file: string, text: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  const handle = await fs.open(tmp, 'w');
  try {
    await handle.writeFile(text, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await fs.copyFile(file, `${file}.bak`);
  } catch {
    // No previous good copy yet.
  }
  await fs.rename(tmp, file);
}

function validateSender(e: IpcMainInvokeEvent): void {
  const url = e.senderFrame?.url ?? '';
  const ok = url.startsWith(`${ORIGIN}/`) || (DEV_URL !== undefined && url.startsWith(DEV_URL));
  if (!ok) throw new Error('Rejected IPC from an untrusted frame');
}

function saveFile(id: unknown): string {
  if (typeof id !== 'string' || !SAVE_ID.test(id)) throw new Error('Invalid save identifier');
  return path.join(savesDir(), `${id}.json`);
}

function requireText(text: unknown): string {
  if (typeof text !== 'string') throw new Error('Invalid payload');
  if (Buffer.byteLength(text, 'utf8') > MAX_SAVE_BYTES) throw new Error('Save too large');
  return text;
}

let mainWindow: BrowserWindow | null = null;

function registerIpc(): void {
  const handle = (channel: string, fn: (...args: unknown[]) => Promise<unknown>) =>
    ipcMain.handle(channel, async (e, ...args) => {
      validateSender(e);
      return fn(...args);
    });

  handle('pr:listSaves', async () => {
    await fs.mkdir(savesDir(), { recursive: true });
    const names = await fs.readdir(savesDir());
    const out: { id: string; bytes: number }[] = [];
    for (const n of names) {
      if (!n.endsWith('.json')) continue;
      const id = n.slice(0, -5);
      if (!SAVE_ID.test(id)) continue;
      const st = await fs.stat(path.join(savesDir(), n));
      out.push({ id, bytes: st.size });
    }
    return out.sort((a, b) => (a.id < b.id ? -1 : 1));
  });
  handle('pr:readSave', async (id) => {
    const file = saveFile(id);
    try {
      return await fs.readFile(file, 'utf8');
    } catch {
      return null;
    }
  });
  handle('pr:writeSave', async (id, text) => atomicWrite(saveFile(id), requireText(text)));
  handle('pr:deleteSave', async (id) => {
    const file = saveFile(id);
    await fs.rm(file, { force: true });
    await fs.rm(`${file}.bak`, { force: true });
  });
  handle('pr:exportSave', async (id, suggested) => {
    const file = saveFile(id);
    const name = typeof suggested === 'string' ? suggested.replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 64) : 'pantheon-save';
    const res = await dialog.showSaveDialog(mainWindow!, { defaultPath: `${name}.prsave.json`, filters: [{ name: 'Pantheon Realms save', extensions: ['json'] }] });
    if (res.canceled || !res.filePath) return false;
    await fs.copyFile(file, res.filePath);
    return true;
  });
  handle('pr:importSave', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, { properties: ['openFile'], filters: [{ name: 'Pantheon Realms save', extensions: ['json'] }] });
    const file = res.filePaths[0];
    if (res.canceled || !file) return null;
    const st = await fs.stat(file);
    if (st.size > MAX_SAVE_BYTES) throw new Error('File too large');
    return fs.readFile(file, 'utf8'); // validated as untrusted data by the renderer's SaveValidator
  });
  handle('pr:readPreferences', async () => {
    try {
      return await fs.readFile(prefsFile(), 'utf8');
    } catch {
      return null;
    }
  });
  handle('pr:writePreferences', async (text) => atomicWrite(prefsFile(), requireText(text)));
  handle('pr:setWindowMode', async (mode) => {
    if (mode !== 'windowed' && mode !== 'fullscreen') throw new Error('Unsupported window mode');
    mainWindow?.setFullScreen(mode === 'fullscreen');
  });
  handle('pr:getWindowMode', async () => (mainWindow?.isFullScreen() ? 'fullscreen' : 'windowed'));
  handle('pr:quit', async () => {
    app.quit();
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#0b1322',
    show: false,
    title: 'Pantheon Realms',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
      // No developer tools in the installed game.
      devTools: !app.isPackaged,
    },
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // External help links require an explicit user action and an allowlist; none ship in this build.
    void url;
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${ORIGIN}/`) && !(DEV_URL && url.startsWith(DEV_URL))) event.preventDefault();
  });
  void mainWindow.loadURL(DEV_URL ?? `${ORIGIN}/index.html`);
}

app.on('web-contents-created', (_e, contents) => {
  contents.on('will-attach-webview', (event) => event.preventDefault());
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle(SCHEME, async (request) => {
    const url = new URL(request.url);
    if (url.host !== 'app') return new Response('Not found', { status: 404 });
    const file = resolveRendererPath(url.pathname);
    if (!file) return new Response('Forbidden', { status: 403 });
    try {
      const res = await net.fetch(pathToFileURL(file).toString());
      const headers = new Headers(res.headers);
      headers.set('Content-Security-Policy', CSP);
      headers.set('X-Content-Type-Options', 'nosniff');
      return new Response(res.body, { status: res.status, headers });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
  // Deny every permission request (camera, microphone, geolocation, notifications...).
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

void shell; // intentionally unused: no external links are opened in this build
