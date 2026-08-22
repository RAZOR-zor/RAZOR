const { app, BrowserWindow, ipcMain, screen, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

const APP_WIDTH = 600;
const BASE_PORT = 3998;
const journalServer = require('./server.js');

let port = 0;
let mainWin = null;
let splashWin = null;
let splashProgress = 0;
let splashRevealPending = false;
let serverReady = false;
let mainReady = false;
let kejarContents = null;
let activeContents = null;
const contentsById = new Map();
const soalAutoInject = new Map(); // contentsId -> nama file soal

function configFile() {
    return path.join(app.getPath('userData'), 'settings.json');
}

function loadConfig() {
    try {
        return JSON.parse(fs.readFileSync(configFile(), 'utf8')) || {};
    } catch (_) {
        return {};
    }
}

function saveConfig(cfg) {
    try {
        const existing = loadConfig();
        const next = Object.assign({}, existing, cfg);
        fs.mkdirSync(path.dirname(configFile()), { recursive: true });
        fs.writeFileSync(configFile(), JSON.stringify(next, null, 2), 'utf8');
    } catch (err) {
        console.error('Simpan pengaturan gagal:', err.message);
    }
}

function journalDir() {
    const cfg = loadConfig();
    if (cfg.journalDir && typeof cfg.journalDir === 'string' && cfg.journalDir.trim()) {
        return cfg.journalDir;
    }
    return path.join(app.getPath('userData'), 'Jurnal');
}

function migrateLegacyFiles(dir) {
    try {
        fs.mkdirSync(dir, { recursive: true });
        const base = path.join(dir, 'jurnal.js');
        if (fs.existsSync(base)) return;
        const candidates = [];
        const legacyBase = path.join(__dirname, 'jurnal.js');
        if (fs.existsSync(legacyBase)) candidates.push(legacyBase);
        try {
            fs.readdirSync(__dirname)
                .filter(f => /^jurnal-p\d+\.js$/.test(f))
                .forEach(f => candidates.push(path.join(__dirname, f)));
        } catch (_) { }
        candidates.forEach(src => {
            try {
                const dst = path.join(dir, path.basename(src));
                if (!fs.existsSync(dst)) {
                    try { fs.writeFileSync(dst, fs.readFileSync(src, 'utf8'), 'utf8'); } catch (_) { }
                }
            } catch (_) { }
        });
    } catch (_) { }
}

function ensureBaseJournal() {
    const dir = journalDir();
    const base = path.join(dir, 'jurnal.js');
    try {
        fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(base)) {
            const template = path.join(__dirname, 'jurnal.js');
            if (fs.existsSync(template)) {
                const content = fs.readFileSync(template, 'utf8');
                fs.writeFileSync(base, content, 'utf8');
            }
        }
    } catch (err) {
        console.error('Siapkan jurnal.js gagal:', err.message);
    }
}

function waitForServer(url, tries) {
    return new Promise(resolve => {
        const attempt = n => {
            const req = http.get(url, res => {
                res.resume();
                resolve(true);
            });
            req.on('error', () => {
                if (n <= 0) return resolve(false);
                setTimeout(() => attempt(n - 1), 200);
            });
        };
        attempt(tries);
    });
}

function startServer() {
    return new Promise(resolve => {
        const attempt = n => {
            const p = BASE_PORT + n;
            port = p;
            process.env.PORT = String(p);
            process.env.JOURNAL_DIR = journalDir();
            journalServer.startServer(p).then(() => {
                waitForServer('http://127.0.0.1:' + p + '/api/journal', 30).then(ok => {
                    serverReady = true;
                    resolve(ok);
                });
            }).catch(() => {
                if (n >= 4) resolve(false);
                else attempt(n + 1);
            });
        };
        attempt(0);
    });
}

function stopServer() {
    try { journalServer.stopServer(); } catch (_) { }
}

function initAutoUpdater(win) {
    autoUpdater.logger = {
        info: m => {
            console.log('[Updater]', m);
            win.webContents.send('log', '[Updater] ' + m);
        },
        warn: m => {
            console.warn('[Updater]', m);
            win.webContents.send('log', '[Updater] ' + m);
        },
        error: m => {
            console.error('[Updater]', m);
            win.webContents.send('log', '[Updater] ' + m);
        }
    };
    autoUpdater.on('update-available', info => {
        console.log('[Updater] Update available:', info.version);
        win.webContents.send('update-available', { version: info.version });
    });
    autoUpdater.on('update-not-available', () => {
        console.log('[Updater] No update available');
        win.webContents.send('update-not-available');
    });
    autoUpdater.on('download-progress', p => {
        win.webContents.send('update-progress', { percent: Math.round(p.percent) });
    });
    autoUpdater.on('update-downloaded', () => {
        console.log('[Updater] Update downloaded');
        win.webContents.send('update-downloaded');
    });
    autoUpdater.on('error', err => {
        console.error('[Updater] Error:', err.message, err.stack);
        win.webContents.send('update-error', err.message);
    });
    autoUpdater.checkForUpdates().catch(err => {
        console.error('[Updater] checkForUpdates failed:', err.message);
        win.webContents.send('update-error', err.message);
    });
}

function restartServer() {
    return new Promise(resolve => {
        stopServer();
        setTimeout(() => startServer().then(resolve), 300);
    });
}

function journalFileFor(profileId) {
    const id = Number(profileId);
    if (Number.isInteger(id) && id > 0) return path.join(journalDir(), 'jurnal-p' + id + '.js');
    return path.join(journalDir(), 'jurnal.js');
}

function loadScriptContent(profileId) {
    const file = journalFileFor(profileId);
    ensureBaseJournal();
    const base = path.join(journalDir(), 'jurnal.js');
    if (file !== base) {
        try {
            if (!fs.existsSync(file)) {
                const content = fs.readFileSync(base, 'utf8');
                fs.writeFileSync(file, content, 'utf8');
            }
        } catch (_) { }
    }
    try {
        return fs.readFileSync(file, 'utf8');
    } catch (e) {
        return '';
    }
}

function injectScriptInto(contents, profileId) {
    const script = loadScriptContent(profileId);
    if (!script) return;
    contents.executeJavaScript(script).catch(err => {
        console.error('Inject gagal:', err.message);
    });
}

function soalFileFor(fileName) {
    const name = String(fileName || 'soal.js');
    if (!/^(soal(-p[12])?|akm)\.js$/.test(name)) return path.join(journalDir(), 'soal.js');
    return path.join(journalDir(), name);
}

function ensureSoalFiles() {
    const dir = journalDir();
    try {
        fs.mkdirSync(dir, { recursive: true });
        const templates = [
            { name: 'soal.js', src: path.join(__dirname, 'script', 'SOAL.js') },
            { name: 'soal-p1.js', src: path.join(__dirname, 'script', 'SOAL1.js') },
            { name: 'akm.js', src: path.join(__dirname, 'script', 'akm.js') }
        ];
        templates.forEach(t => {
            const dst = path.join(dir, t.name);
            if (fs.existsSync(dst)) return;
            try {
                if (fs.existsSync(t.src)) {
                    try { fs.writeFileSync(dst, fs.readFileSync(t.src, 'utf8'), 'utf8'); } catch (_) { }
                }
                else fs.writeFileSync(dst, '', 'utf8');
            } catch (_) { }
        });
    } catch (_) { }
}

function loadSoalScriptContent(fileName) {
    // Prefer bundled scripts from the app's script/ folder when available.
    try {
        const name = String(fileName || 'soal.js');
        const map = {
            'soal.js': 'SOAL.js',
            'soal-p1.js': 'SOAL1.js',
            'soal-p2.js': 'SOAL2.js'
        };
        const bundled = map[name];
        if (bundled) {
            const candidate = path.join(__dirname, 'script', bundled);
            if (fs.existsSync(candidate)) {
                try {
                    return fs.readFileSync(candidate, 'utf8');
                } catch (_) { /* fall through to fallback */ }
            }
        }
        // Fallback to user-editable copies in the journal folder
        ensureSoalFiles();
        return fs.readFileSync(soalFileFor(fileName), 'utf8');
    } catch (e) {
        return '';
    }
}

function injectSoalInto(contents, fileName) {
    const script = loadSoalScriptContent(fileName);
    if (!script) return;
    contents.executeJavaScript(script).catch(err => {
        console.error('Inject soal gagal:', err.message);
    });
}

function createSplash() {
    splashWin = new BrowserWindow({
        width: 380,
        height: 280,
        frame: false,
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        alwaysOnTop: true,
        show: false,
        icon: path.join(__dirname, 'icon.ico'),
        backgroundColor: '#141310',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    splashWin.loadFile(path.join(__dirname, 'splash.html'));
    splashWin.once('ready-to-show', () => {
        splashWin.show();
        splashWin.moveTop();
        splashWin.setAlwaysOnTop(true, 'screen-saver');
        tickSplash();
    });
    splashWin.on('closed', () => { splashWin = null; });
}

function tryShowMain() {
    if (!mainWin || !splashWin) return;
    if (splashProgress < 100 || !serverReady || !mainReady) return;
    if (splashRevealPending) return;
    splashRevealPending = true;
    setTimeout(() => {
        splashRevealPending = false;
        if (splashWin) {
            splashWin.close();
            splashWin = null;
        }
        if (mainWin) {
            mainWin.show();
            mainWin.moveTop();
        }
    }, 450);
}

function tickSplash() {
    if (!splashWin) return;
    if (splashProgress < 100) {
        splashProgress = Math.min(100, splashProgress + 3);
        splashWin.webContents.executeJavaScript('setSplashProgress(' + splashProgress + ')').catch(() => {});
    }
    tryShowMain();
    if (splashWin) setTimeout(tickSplash, 45);
}

function createWindow() {
    const bounds = screen.getPrimaryDisplay().workAreaSize;
    const browserW = Math.max(Math.min(bounds.width - APP_WIDTH - 40, 840), 480);
    mainWin = new BrowserWindow({
        width: APP_WIDTH + browserW,
        height: Math.min(bounds.height - 40, 760),
        resizable: true,
        maximizable: true,
        fullscreenable: true,
        frame: false,
        show: false,
        icon: path.join(__dirname, 'icon.ico'),
        backgroundColor: '#141310',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true
        }
    });
    mainWin.setMenu(null);
    mainWin.loadURL('http://127.0.0.1:' + port + '/');
    mainWin.once('ready-to-show', () => {
        mainReady = true;
        tryShowMain();
        initAutoUpdater(mainWin);
    });
    mainWin.webContents.on('did-attach-webview', (event, contents) => {
        contentsById.set(contents.id, contents);
        kejarContents = contents;
        contents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36');
        contents.on('destroyed', () => {
            contentsById.delete(contents.id);
            soalAutoInject.delete(contents.id);
            if (activeContents === contents) activeContents = null;
            if (kejarContents === contents) kejarContents = null;
        });
        contents.on('did-finish-load', () => {
            try {
                const url = contents.getURL() || '';
                if (url.indexOf('kejar.id') === -1) return;
                const soalFile = soalAutoInject.get(contents.id);
                if (soalFile) injectSoalInto(contents, soalFile);
            } catch (e) {
                console.error('Inject soal gagal:', e.message);
            }
        });
    });
    mainWin.on('closed', () => {
        mainWin = null;
        kejarContents = null;
        activeContents = null;
        contentsById.clear();
    });
}

ipcMain.on('win:minimize', e => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w) w.minimize();
});

ipcMain.on('win:maximize', e => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w) {
        if (w.isMaximized()) {
            w.unmaximize();
        } else {
            w.maximize();
        }
    }
});

ipcMain.on('win:close', e => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w) w.close();
});

ipcMain.on('win:set-active-tab', (e, id) => {
    activeContents = contentsById.get(Number(id)) || null;
});

ipcMain.on('win:inject-script', (e, profileId) => {
    const contents = activeContents || kejarContents;
    if (!contents) return;
    const isLoaded = contents.getURL() !== '' && !contents.isLoading();
    if (isLoaded) {
        injectScriptInto(contents, profileId);
    } else {
        contents.once('did-finish-load', () => injectScriptInto(contents, profileId));
    }
});

ipcMain.on('win:inject-soal-script', (e, fileName) => {
    const contents = activeContents || kejarContents;
    if (!contents) return;
    const isLoaded = contents.getURL() !== '' && !contents.isLoading();
    if (isLoaded) {
        injectSoalInto(contents, fileName);
    } else {
        contents.once('did-finish-load', () => injectSoalInto(contents, fileName));
    }
});

ipcMain.on('win:set-soal-auto-inject', (e, enabled, contentsId, fileName) => {
    const contents = contentsById.get(Number(contentsId)) || activeContents || kejarContents;
    if (!contents) return;
    if (enabled) {
        soalAutoInject.set(contents.id, String(fileName || 'soal.js'));
        const isLoaded = contents.getURL() !== '' && !contents.isLoading();
        if (isLoaded) injectSoalInto(contents, fileName);
    } else {
        soalAutoInject.delete(contents.id);
    }
});

ipcMain.on('win:delete-profile-file', (e, profileId) => {
    const id = Number(profileId);
    if (!Number.isInteger(id) || id <= 0) return;
    const file = path.join(journalDir(), 'jurnal-p' + id + '.js');
    try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (err) {
        console.error('Gagal menghapus ' + path.basename(file) + ':', err.message);
    }
});

ipcMain.handle('settings:get', () => {
    const cfg = loadConfig();
    return {
        journalDir: cfg.journalDir || null,
        defaultDir: path.join(app.getPath('userData'), 'Jurnal'),
        mode: cfg.mode || 'jurnal'
    };
});

ipcMain.handle('settings:set-mode', (e, mode) => {
    if (mode !== 'jurnal' && mode !== 'soal') return { ok: false };
    saveConfig({ mode });
    return { ok: true, mode };
});

ipcMain.handle('scripts:list', () => {
    try {
        const scriptsDir = path.join(__dirname, 'script');
        const map = [
            { file: 'soal.js', display: fs.existsSync(path.join(scriptsDir, 'SOAL.js')) ? 'SOAL.js' : 'soal.js' },
            { file: 'soal-p1.js', display: fs.existsSync(path.join(scriptsDir, 'SOAL1.js')) ? 'SOAL1.js' : 'soal-p1.js' },
            { file: 'soal-p2.js', display: fs.existsSync(path.join(scriptsDir, 'SOAL2.js')) ? 'SOAL2.js' : 'soal-p2.js' }
        ];
        return map;
    } catch (e) { return []; }
});

ipcMain.handle('settings:choose-journal-dir', async () => {
    const opts = {
        title: 'Pilih lokasi folder Jurnal',
        buttonLabel: 'Pilih Folder Ini',
        properties: ['openDirectory', 'createDirectory']
    };
    const win = mainWin || BrowserWindow.getFocusedWindow();
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);
    if (res.canceled || !res.filePaths.length) return { dir: null };
    return { dir: res.filePaths[0] };
});

ipcMain.handle('settings:set-journal-dir', async (e, dir) => {
    if (typeof dir !== 'string' || !dir.trim()) return { ok: false };
    const target = path.resolve(dir.trim());
    const old = journalDir();
    try {
        fs.mkdirSync(target, { recursive: true });
        if (old !== target) {
            const files = [];
            try {
                const base = path.join(old, 'jurnal.js');
                if (fs.existsSync(base)) files.push(base);
                fs.readdirSync(old)
                    .filter(f => /^jurnal-p\d+\.js$/.test(f))
                    .forEach(f => files.push(path.join(old, f)));
            } catch (_) { }
            files.forEach(src => {
                try {
                    const dst = path.join(target, path.basename(src));
                if (!fs.existsSync(dst)) {
                    const c = fs.readFileSync(src, 'utf8');
                    fs.writeFileSync(dst, c, 'utf8');
                }
                } catch (_) { }
            });
        }
    } catch (err) {
        return { ok: false };
    }
    saveConfig({ journalDir: target });
    ensureBaseJournal();
    const ok = await restartServer();
    return { ok, dir: journalDir() };
});

let catatanWin = null;

function catatanFile() {
    return path.join(app.getPath('userData'), 'catatan.txt');
}

ipcMain.handle('catatan:load', () => {
    try {
        const file = catatanFile();
        if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
    } catch (_) { }
    return null;
});

ipcMain.handle('catatan:save', (e, text) => {
    try {
        fs.writeFileSync(catatanFile(), text || '', 'utf8');
        return true;
    } catch (_) { return false; }
});

ipcMain.handle('catatan:export', async (e, text) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const res = await dialog.showSaveDialog(win || null, {
        title: 'Export Catatan',
        defaultPath: 'catatan.txt',
        filters: [{ name: 'Text File', extensions: ['txt'] }]
    });
    if (res.canceled || !res.filePath) return false;
    try {
        fs.writeFileSync(res.filePath, text || '', 'utf8');
        return true;
    } catch (_) { return false; }
});

ipcMain.on('win:open-catatan', () => {
    if (catatanWin && !catatanWin.isDestroyed()) {
        catatanWin.focus();
        return;
    }
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    catatanWin = new BrowserWindow({
        width: Math.min(960, width - 100),
        height: Math.min(700, height - 80),
        minWidth: 500,
        minHeight: 400,
        title: 'Catatan Akun',
        backgroundColor: '#362f2d',
        frame: false,
        transparent: false,
        resizable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload-catatan.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    catatanWin.loadFile(path.join(__dirname, 'catatan.html'));
    catatanWin.on('closed', () => { catatanWin = null; });
});

ipcMain.on('win:refresh-page', () => {
    const contents = activeContents || kejarContents;
    if (contents) {
        contents.reload();
    }
});

ipcMain.on('update:download', () => {
    autoUpdater.downloadUpdate();
});

ipcMain.on('update:check', () => {
    autoUpdater.checkForUpdates().catch(() => {});
});

ipcMain.on('update:install', () => {
    autoUpdater.quitAndInstall(false, true);
});

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWin) {
            if (mainWin.isMinimized()) mainWin.restore();
            mainWin.focus();
        }
    });
    app.whenReady().then(() => {
        app.setAppUserModelId('com.kejar.kegiatan-mingguan');
        ensureBaseJournal();
        createSplash();
        startServer().then(ok => {
            if (!ok) {
                console.error('Server gagal dijalankan.');
                if (splashWin) splashWin.close();
                app.quit();
                return;
            }
            createWindow();
            serverReady = true;
            tryShowMain();
        });
    });
}

app.on('window-all-closed', () => {
    stopServer();
    app.quit();
});

app.on('will-quit', () => {
    stopServer();
});
