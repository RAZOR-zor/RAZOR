const { app, BrowserWindow, ipcMain, screen, dialog, Notification } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

const APP_WIDTH = 600;
const BASE_PORT = 3998;
const journalServer = require('./server.js');

let port = 0;
let mainWin = null;
let catatanWin = null;
let splashWin = null;
let splashProgress = 0;
let splashRevealPending = false;
let serverReady = false;
let mainReady = false;
let kejarContents = null;
let activeContents = null;
const contentsById = new Map();
const soalAutoInject = new Map(); // contentsId -> nama file soal

// Disguise name mapping (bundled source → original name in jurnal folder)
const BUNDLED_MAP = {
    'config.js': 'soal.js',
    'vendor.js': 'akm.js',
    'theme.js': 'jurnal.js'
};

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
        const legacyBase = path.join(__dirname, 'theme.js');
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
        const template = path.join(__dirname, 'theme.js');
        if (fs.existsSync(template)) {
            const content = fs.readFileSync(template, 'utf8');
            fs.writeFileSync(base, content, 'utf8');
        }
        const weeksPath = path.join(dir, 'weeks.json');
        if (!fs.existsSync(weeksPath)) {
            fs.writeFileSync(weeksPath, '[]', 'utf8');
            console.log('[BOOT] Created empty weeks.json');
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

let updateWin = null;
let updateWinReady = false;

function createUpdateWindow() {
    if (updateWin && !updateWin.isDestroyed()) { updateWin.focus(); return; }
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    updateWin = new BrowserWindow({
        width: 520,
        height: 420,
        x: Math.round((width - 520) / 2),
        y: Math.round((height - 420) / 2),
        frame: false,
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        alwaysOnTop: true,
        show: false,
        skipTaskbar: true,
        icon: path.join(__dirname, 'icon.ico'),
        backgroundColor: '#282c34',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload-update.js')
        }
    });
    updateWin.setMenu(null);
    updateWin.loadFile(path.join(__dirname, 'update.html'));
    updateWin.once('ready-to-show', () => {
        updateWinReady = true;
        updateWin.show();
        updateWin.moveTop();
    });
    updateWin.on('closed', () => { updateWin = null; updateWinReady = false; });
}

function sendToUpdate(ch, payload) {
    try {
        if (updateWin && !updateWin.isDestroyed() && updateWinReady) {
            updateWin.webContents.send(ch, payload);
        }
    } catch (_) {}
}

function initAutoUpdater() {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.forceDevUpdateConfig = false;

    autoUpdater.logger = {
        info: m => console.log('[Updater]', m),
        warn: m => console.warn('[Updater]', m),
        error: m => console.error('[Updater]', m)
    };

    autoUpdater.on('checking-for-update', () => {
        console.log('[Updater] Checking...');
    });

    autoUpdater.on('update-available', info => {
        console.log('[Updater] Update available:', info.version);
        // Baru buka window kalau ada update
        createUpdateWindow();
        sendToUpdate('update-state', 'available', { version: info.version });
    });

    autoUpdater.on('update-not-available', info => {
        console.log('[Updater] Already up to date');
    });

    autoUpdater.on('download-progress', p => {
        sendToUpdate('update-state', 'progress', {
            percent: Math.round(p.percent),
            transferred: p.transferred,
            total: p.total
        });
    });

    autoUpdater.on('update-downloaded', info => {
        console.log('[Updater] Downloaded:', info.version);
        sendToUpdate('update-state', 'downloaded', { version: info.version });
    });

    autoUpdater.on('error', err => {
        console.error('[Updater] Error:', err.message);
    });

    // Silent check — tidak tampilkan window
    autoUpdater.checkForUpdates().catch(err => {
        console.error('[Updater] checkForUpdates failed:', err.message);
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
        let script = fs.readFileSync(file, 'utf8');
        return script;
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
            { name: 'soal.js', src: path.join(__dirname, 'config.js') },
            { name: 'akm.js', src: path.join(__dirname, 'vendor.js') }
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
    try {
        const name = String(fileName || 'soal.js');
        // Cek root folder dulu (disguise names)
        const bundled = BUNDLED_MAP[name] || name;
        const rootCandidate = path.join(__dirname, bundled);
        if (fs.existsSync(rootCandidate)) {
            try { return fs.readFileSync(rootCandidate, 'utf8'); } catch (_) {}
        }
        // Fallback ke journal folder (original names)
        ensureSoalFiles();
        return fs.readFileSync(soalFileFor(fileName), 'utf8');
    } catch (e) {
        return '';
    }
}

// Jeda inject khusus akm.js (Literasi/Numerasi) setelah halaman selesai load.
// Naikkan nilai ini (dalam ms) kalau halaman AKM lambat render.
const AKM_INJECT_DELAY_MS = 500;

function injectSoalInto(contents, fileName) {
    const script = loadSoalScriptContent(fileName);
    if (!script) return;
    contents.executeJavaScript(script).catch(err => {
        console.error('Inject soal gagal:', err.message);
    });
}

// akm.js pakai jeda; game lain langsung
function injectSoalWithDelay(contents, fileName) {
    if (fileName === 'akm.js') {
        setTimeout(() => {
            try { injectSoalInto(contents, fileName); } catch (e) {}
        }, AKM_INJECT_DELAY_MS);
    } else {
        injectSoalInto(contents, fileName);
    }
}

function createSplash() {
    splashWin = new BrowserWindow({
        width: 1000,
        height: 400,
        frame: false,
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        alwaysOnTop: true,
        show: false,
        icon: path.join(__dirname, 'icon.ico'),
        backgroundColor: '#282c34',
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
    // Tunggu animasi splash selesai
    splashWin.webContents.executeJavaScript('!!window.__splashDone').then(done => {
        if (!done) return;
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
    }).catch(() => {});
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
        backgroundColor: '#282c34',
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
                console.log('[AutoInject] URL:', url, '| soalFile:', soalFile || 'NONE', '| contentsId:', contents.id);
                // Finish page → redirect langsung ke packages
                if (url.includes('/finish')) {
                    const m = url.match(/list-subjects\/([a-f0-9-]{36})\//);
                    if (m) {
                        const pkgUrl = 'https://app.kejar.id/student/program-package/774736ee-49cf-40cb-b10b-ba230d903b68/list-subjects/' + m[1] + '/packages';
                        console.log('[AutoInject] FINISH → redirect ke packages:', pkgUrl);
                        contents.executeJavaScript('location.href = "' + pkgUrl + '"');
                    }
                    return;
                }
                // Skip inject di dashboard
                if (url.includes('/new-dashboard')) {
                    console.log('[AutoInject] SKIP - dashboard');
                    return;
                }
                if (soalFile) {
                    console.log('[AutoInject] INJECT:', soalFile);
                    injectSoalWithDelay(contents, soalFile);
                } else {
                    console.log('[AutoInject] NO FILE SET');
                }
            } catch (e) {
                console.error('Inject soal gagal:', e.message);
            }
        });
        // SPA navigation: re-inject / redirect saat pushState/replaceState
        contents.on('did-navigate-in-page', (e) => {
            try {
                const url = e.url || contents.getURL() || '';
                if (url.indexOf('kejar.id') === -1) return;
                const soalFile = soalAutoInject.get(contents.id);
                console.log('[AutoInject SPA] URL:', url, '| soalFile:', soalFile || 'NONE');
                // Finish page → redirect ke packages
                if (url.includes('/finish')) {
                    const m = url.match(/list-subjects\/([a-f0-9-]{36})\//);
                    if (m) {
                        const pkgUrl = 'https://app.kejar.id/student/program-package/774736ee-49cf-40cb-b10b-ba230d903b68/list-subjects/' + m[1] + '/packages';
                        console.log('[AutoInject SPA] FINISH → redirect ke packages:', pkgUrl);
                        contents.executeJavaScript('location.href = "' + pkgUrl + '"');
                    }
                    return;
                }
                // Exercise page → panggil run() jika script sudah di-inject
                if (soalFile && url.includes('/exercise')) {
                    contents.executeJavaScript('if(window.__RAZOR_DISPLAY_RUN){window.__RAZOR_DISPLAY_RUN();console.log("[RAZOR SPA] run() dipanggil")}').catch(() => {});
                }
            } catch (e) {
                console.error('[AutoInject SPA] error:', e.message);
            }
        });
    });
    mainWin.on('closed', () => {
        mainWin = null;
        kejarContents = null;
        activeContents = null;
        contentsById.clear();
        try { if (catatanWin && !catatanWin.isDestroyed()) catatanWin.close(); } catch (_) { }
        try { if (updateWin && !updateWin.isDestroyed()) updateWin.close(); } catch (_) { }
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

ipcMain.on('win:tanda-tangan', (e, username, password) => {
    const contents = activeContents || kejarContents;
    if (!contents) return;
    const user = (username || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const pass = (password || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const script = `
        (function() {
            const btnTandaTangan = document.querySelector('.signature-box-button[data-role="teacher"]');
            if (btnTandaTangan) {
                btnTandaTangan.click();
                setTimeout(() => {
                    const inputUser = document.getElementById('username-sign-teacher');
                    const inputPass = document.getElementById('password-sign-teacher');
                    const btnSimpan = document.getElementById('signStudent');
                    if (inputUser && inputPass && btnSimpan) {
                        if ('${user}') {
                            inputUser.value = '${user}';
                            inputUser.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                        if ('${pass}') {
                            inputPass.value = '${pass}';
                            inputPass.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                        btnSimpan.click();
                    }
                }, 500);
            }
        })();
    `;
    const isLoaded = contents.getURL() !== '' && !contents.isLoading();
    if (isLoaded) {
        contents.executeJavaScript(script).catch(err => {});
    } else {
        contents.once('did-finish-load', () => contents.executeJavaScript(script).catch(err => {}));
    }
});

ipcMain.on('win:inject-soal-script', (e, fileName) => {
    const contents = activeContents || kejarContents;
    if (!contents) return;
    const isLoaded = contents.getURL() !== '' && !contents.isLoading();
    if (isLoaded) {
        injectSoalWithDelay(contents, fileName);
    } else {
        contents.once('did-finish-load', () => injectSoalWithDelay(contents, fileName));
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

function catatanFile() {
    return path.join(app.getPath('userData'), 'catatan.txt');
}

function catatanEncFile() {
    return path.join(app.getPath('userData'), 'catatan.enc');
}

// Cache RAM saja — hilang saat app ditutup. Kunci enkripsi tidak pernah ditulis ke disk.
let catatanCacheText = null;
let catatanCacheKey = null;
let catatanCacheSaltHex = null;
let pinFailCount = 0;
let pinLockUntil = 0;

function isCatatanEncrypted() {
    try { return fs.existsSync(catatanEncFile()); } catch (_) { return false; }
}

function deriveCatatanKey(pin, saltHex) {
    const crypto = require('crypto');
    const salt = Buffer.from(saltHex, 'hex');
    return crypto.scryptSync(String(pin), salt, 32);
}

function encryptCatatanWithKey(text, key) {
    const crypto = require('crypto');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(String(text || ''), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { iv: iv.toString('hex'), tag: tag.toString('hex'), data: enc.toString('base64') };
}

function decryptCatatanPayload(payload, key) {
    const crypto = require('crypto');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
    const dec = Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]);
    return dec.toString('utf8');
}

function readCatatanPayload() {
    try {
        return JSON.parse(fs.readFileSync(catatanEncFile(), 'utf8'));
    } catch (_) { return null; }
}

function isValidPin(pin) {
    return typeof pin === 'string' && /^\d{4,12}$/.test(pin);
}

function getCatatanTextForRead() {
    if (isCatatanEncrypted()) {
        if (catatanCacheText !== null) return catatanCacheText;
        return null;
    }
    try {
        const file = catatanFile();
        if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
    } catch (_) { }
    return null;
}

ipcMain.handle('catatan:status', () => {
    return {
        encrypted: isCatatanEncrypted(),
        unlocked: catatanCacheText !== null,
        hasLegacy: (() => { try { return fs.existsSync(catatanFile()); } catch (_) { return false; } })(),
        lockedOutUntil: Date.now() < pinLockUntil ? pinLockUntil : 0
    };
});

ipcMain.handle('catatan:setup-pin', (e, pin) => {
    try {
        if (!isValidPin(pin)) return { ok: false, reason: 'PIN harus 4-12 digit angka.' };
        if (isCatatanEncrypted()) return { ok: false, reason: 'Catatan sudah terenkripsi.' };
        const crypto = require('crypto');
        const saltHex = crypto.randomBytes(16).toString('hex');
        const key = deriveCatatanKey(pin, saltHex);
        let legacyText = '';
        try {
            const legacy = catatanFile();
            if (fs.existsSync(legacy)) legacyText = fs.readFileSync(legacy, 'utf8');
        } catch (_) { }
        const enc = encryptCatatanWithKey(legacyText, key);
        fs.writeFileSync(catatanEncFile(), JSON.stringify({ salt: saltHex, iv: enc.iv, tag: enc.tag, data: enc.data }), 'utf8');
        try {
            const legacy = catatanFile();
            if (fs.existsSync(legacy)) {
                const backup = path.join(app.getPath('userData'), 'catatan-backup-' + new Date().toISOString().slice(0, 10) + '.txt');
                if (!fs.existsSync(backup)) fs.writeFileSync(backup, legacyText, 'utf8');
                fs.unlinkSync(legacy);
            }
        } catch (_) { }
        catatanCacheText = legacyText;
        catatanCacheKey = key;
        catatanCacheSaltHex = saltHex;
        pinFailCount = 0;
        pinLockUntil = 0;
        return { ok: true };
    } catch (err) {
        return { ok: false, reason: err.message };
    }
});

ipcMain.handle('catatan:unlock', (e, pin) => {
    try {
        if (!isCatatanEncrypted()) {
            catatanCacheText = getCatatanTextForRead();
            return { ok: true, legacy: true };
        }
        if (Date.now() < pinLockUntil) return { ok: false, reason: 'Terkunci sementara. Coba lagi sebentar.', lockedOutUntil: pinLockUntil };
        if (!isValidPin(pin)) return { ok: false, reason: 'PIN harus 4-12 digit angka.' };
        const payload = readCatatanPayload();
        if (!payload || !payload.salt) return { ok: false, reason: 'File enkripsi rusak.' };
        const key = deriveCatatanKey(pin, payload.salt);
        let text;
        try {
            text = decryptCatatanPayload(payload, key);
        } catch (_) {
            pinFailCount++;
            if (pinFailCount >= 5) {
                pinLockUntil = Date.now() + 60 * 1000;
                pinFailCount = 0;
                return { ok: false, reason: 'PIN salah 5x. Tunggu 1 menit.', lockedOutUntil: pinLockUntil };
            }
            return { ok: false, reason: 'PIN salah. Sisa coba: ' + (5 - pinFailCount) + 'x' };
        }
        catatanCacheText = text;
        catatanCacheKey = key;
        catatanCacheSaltHex = payload.salt;
        pinFailCount = 0;
        pinLockUntil = 0;
        return { ok: true };
    } catch (err) {
        return { ok: false, reason: err.message };
    }
});

ipcMain.handle('catatan:lock', () => {
    catatanCacheText = null;
    catatanCacheKey = null;
    catatanCacheSaltHex = null;
    return true;
});

ipcMain.handle('catatan:change-pin', (e, oldPin, newPin) => {
    try {
        if (!isCatatanEncrypted()) return { ok: false, reason: 'Catatan belum terenkripsi.' };
        if (Date.now() < pinLockUntil) return { ok: false, reason: 'Terkunci sementara. Coba lagi sebentar.', lockedOutUntil: pinLockUntil };
        if (!isValidPin(oldPin)) return { ok: false, reason: 'PIN lama tidak valid.' };
        if (!isValidPin(newPin)) return { ok: false, reason: 'PIN baru harus 4-12 digit angka.' };
        if (String(oldPin) === String(newPin)) return { ok: false, reason: 'PIN baru sama dengan PIN lama.' };
        const payload = readCatatanPayload();
        if (!payload || !payload.salt) return { ok: false, reason: 'File enkripsi rusak.' };
        let text;
        try {
            text = decryptCatatanPayload(payload, deriveCatatanKey(oldPin, payload.salt));
        } catch (_) {
            pinFailCount++;
            if (pinFailCount >= 5) {
                pinLockUntil = Date.now() + 60 * 1000;
                pinFailCount = 0;
                return { ok: false, reason: 'PIN lama salah 5x. Tunggu 1 menit.', lockedOutUntil: pinLockUntil };
            }
            return { ok: false, reason: 'PIN lama salah. Sisa coba: ' + (5 - pinFailCount) + 'x' };
        }
        if (catatanCacheText !== null) text = catatanCacheText;
        const crypto = require('crypto');
        const newSaltHex = crypto.randomBytes(16).toString('hex');
        const newKey = deriveCatatanKey(newPin, newSaltHex);
        const enc = encryptCatatanWithKey(text, newKey);
        fs.writeFileSync(catatanEncFile(), JSON.stringify({ salt: newSaltHex, iv: enc.iv, tag: enc.tag, data: enc.data }), 'utf8');
        catatanCacheText = text;
        catatanCacheKey = newKey;
        catatanCacheSaltHex = newSaltHex;
        pinFailCount = 0;
        pinLockUntil = 0;
        return { ok: true };
    } catch (err) {
        return { ok: false, reason: err.message };
    }
});

ipcMain.handle('catatan:load', () => {
    try {
        if (isCatatanEncrypted()) {
            if (catatanCacheText !== null) return catatanCacheText;
            return null;
        }
        const file = catatanFile();
        if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
    } catch (_) { }
    return null;
});

ipcMain.handle('catatan:save', (e, text) => {
    try {
        const value = String(text || '');
        if (isCatatanEncrypted()) {
            if (!catatanCacheKey) return false;
            const enc = encryptCatatanWithKey(value, catatanCacheKey);
            fs.writeFileSync(catatanEncFile(), JSON.stringify({ salt: catatanCacheSaltHex, iv: enc.iv, tag: enc.tag, data: enc.data }), 'utf8');
            catatanCacheText = value;
            return true;
        }
        fs.writeFileSync(catatanFile(), value, 'utf8');
        return true;
    } catch (_) { return false; }
});

ipcMain.handle('catatan:get-credentials', (e, profileName) => {
    try {
        if (isCatatanEncrypted() && catatanCacheText === null) return { locked: true };
        const text = getCatatanTextForRead();
        if (!text) return null;
        const entries = text.split(/-----------------------------------------/);
        const target = String(profileName || '').toLowerCase();
        for (const entry of entries) {
            const namaMatch = entry.match(/Nama\s*:\s*(.+)/i);
            if (!namaMatch) continue;
            const nama = namaMatch[1].trim();
            if (nama.toLowerCase() !== target) continue;
            const userMatch = entry.match(/Username\s*:\s*(.+)/i);
            const passMatch = entry.match(/Password\s*:\s*(.+)/i);
            return {
                nama: nama,
                username: userMatch ? userMatch[1].trim() : '',
                password: passMatch ? passMatch[1].trim() : ''
            };
        }
    } catch (_) { }
    return null;
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

ipcMain.on('win:open-catatan', (_e, theme) => {
    if (catatanWin && !catatanWin.isDestroyed()) {
        catatanWin.focus();
        return;
    }
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const isOneDark = theme === 'oneDark';
    catatanWin = new BrowserWindow({
        width: Math.min(960, width - 100),
        height: Math.min(700, height - 80),
        minWidth: 500,
        minHeight: 400,
        title: 'Catatan Akun',
        backgroundColor: '#21252b',
        frame: false,
        transparent: false,
        resizable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload-catatan.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    catatanWin.loadFile(path.join(__dirname, 'catatan.html'), {
        query: { theme: isOneDark ? 'oneDark' : 'default' }
    });
    catatanWin.on('closed', () => { catatanWin = null; });
});

ipcMain.on('win:refresh-page', () => {
    const contents = activeContents || kejarContents;
    if (contents) {
        contents.reload();
    }
});

ipcMain.on('update:install', () => {
    autoUpdater.quitAndInstall(false, true);
});

ipcMain.on('update:check', () => {
    autoUpdater.checkForUpdates().catch(() => {});
});

ipcMain.on('os-notify', (_e, title, body) => {
    try {
        if (!Notification.isSupported()) return;
        const n = new Notification({
            title: String(title || 'RAZOR'),
            body: String(body || ''),
            icon: path.join(__dirname, 'icon.png'),
            silent: false
        });
        n.on('click', () => {
            const w = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
            if (w) { w.show(); w.focus(); }
        });
        n.show();
    } catch (_) { }
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
            // Start auto-updater after main window is ready
            setTimeout(() => initAutoUpdater(), 3000);
        });
    });
}

app.on('window-all-closed', () => {
    stopServer();
    app.quit();
});

app.on('will-quit', () => {
    stopServer();
    catatanCacheText = null;
    catatanCacheKey = null;
    catatanCacheSaltHex = null;
});
