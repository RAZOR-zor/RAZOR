const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const TEMPLATE = path.join(ROOT, 'jurnal.js');
const INDEX = path.join(ROOT, 'index.html');
const LINK = path.join(ROOT, 'link.txt');
function getJournalDir() {
    return path.resolve(process.env.JOURNAL_DIR || path.join(ROOT, 'jurnal'));
}

function journalPath(profileId) {
    const id = Number(profileId);
    if (Number.isInteger(id) && id > 0) return path.join(getJournalDir(), 'jurnal-p' + id + '.js');
    return path.join(getJournalDir(), 'jurnal.js');
}

function ensureJournal(file) {
    try { fs.mkdirSync(getJournalDir(), { recursive: true }); } catch (_) { }
    if (fs.existsSync(file)) return;
    try {
        if (fs.existsSync(TEMPLATE)) {
            const content = fs.readFileSync(TEMPLATE, 'utf8');
            fs.writeFileSync(file, content, 'utf8');
            if (file !== path.join(getJournalDir(), 'jurnal.js')) {
                clearSaksiNames(file);
            }
        }
    } catch (_) { }
}

function clearSaksiNames(file) {
    try {
        let src = fs.readFileSync(file, 'utf8');
        src = src.replace(/(const SETTING_SAKSI = \{[\s\S]*?\n\s*\};)/, (block) => {
            return block.replace(/nama:\s*'[^']*'/g, "nama: ''");
        });
        fs.writeFileSync(file, src, 'utf8');
    } catch (_) { }
}

function readWeeks() {
    try {
        const raw = fs.readFileSync(LINK, 'utf8');
        return raw.split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#') && /^https?:\/\//.test(line));
    } catch (_) {
        return [];
    }
}

const HARI_RE = /const SETTING_HARI_KEGIATAN = \{([\s\S]*?)\n\s*\};/;
const SAKSI_RE = /const SETTING_SAKSI = \{([\s\S]*?)\n\s*\};/;
const CONFIG_RE = /const CONFIG = \{([\s\S]*?)\n    \};/;

const CONFIG_KEYS = ['MALAM','SUBUH_M','SUBUH_B','ZIKIR_PAGI','ZUHUR_M','ZUHUR_B','ASAR_M','ASAR_B','ZIKIR_SORE','MAGRIB_M','MAGRIB_B','ISYA_M','ISYA_B','DHUHA','TILAWAH','MEMILAH'];

function parseHari(body) {
    const result = {};
    const re = /'([^']+)'\s*:\s*'([^']*)'/g;
    let m;
    while ((m = re.exec(body))) result[m[1]] = m[2];
    return result;
}

function parseSaksi(body) {
    const result = {};
    const re = /'([^']+)'\s*:\s*\{\s*tipe:\s*'([A-Z]+)'\s*,\s*nama:\s*'([^']*)'\s*\}/g;
    let m;
    while ((m = re.exec(body))) result[m[1]] = { tipe: m[2], nama: m[3] };
    return result;
}

function readActivities(file) {
    const src = fs.readFileSync(file, 'utf8');
    const hariBody = (src.match(HARI_RE) || [])[1] || '';
    const saksiBody = (src.match(SAKSI_RE) || [])[1] || '';
    const hari = parseHari(hariBody);
    const saksi = parseSaksi(saksiBody);

    const keys = [];
    Object.keys(hari).forEach(k => { if (!keys.includes(k)) keys.push(k); });
    Object.keys(saksi).forEach(k => { if (!keys.includes(k)) keys.push(k); });

    return keys.map(k => ({
        nama: k,
        hari: hari[k] || 'Sn',
        tipe: (saksi[k] && saksi[k].tipe) || 'PARENT',
        saksi: (saksi[k] && saksi[k].nama) || ''
    }));
}

function detectEOL(src) {
    const crlf = (src.match(/\r\n/g) || []).length;
    const lf = (src.match(/(?<!\r)\n/g) || []).length;
    return crlf >= lf ? '\r\n' : '\n';
}

function buildBlocks(activities, eol) {
    const entry = (k, v) => "    '" + k + "': " + v + ",";
    const hariLines = activities.map(a => entry(a.nama, "'" + a.hari + "'"));
    const saksiLines = activities.map(a => {
        const nama = a.tipe === 'PARENT' ? '' : (a.saksi || '');
        return entry(a.nama, "{ tipe: '" + a.tipe + "', nama: '" + nama + "' }");
    });
    return {
        hari: 'const SETTING_HARI_KEGIATAN = {' + eol + hariLines.join(eol) + eol + '};',
        saksi: 'const SETTING_SAKSI = {' + eol + saksiLines.join(eol) + eol + '};'
    };
}

function writeActivities(file, activities) {
    const src = fs.readFileSync(file, 'utf8');
    const eol = detectEOL(src);
    const { hari, saksi } = buildBlocks(activities, eol);
    let out = src.replace(HARI_RE, hari);
    out = out.replace(SAKSI_RE, saksi);
    if (out === src) throw new Error('Blok konfigurasi tidak ditemukan di jurnal.js');
    fs.writeFileSync(file, out, 'utf8');
    return out;
}

const DEFAULT_HARIAN = {
    MALAM: '0', SUBUH_M: '1', SUBUH_B: '2', ZIKIR_PAGI: '1',
    ZUHUR_M: '1', ZUHUR_B: '2', ASAR_M: '1', ASAR_B: '2',
    ZIKIR_SORE: '1', MAGRIB_M: '1', MAGRIB_B: '2',
    ISYA_M: '1', ISYA_B: '2', DHUHA: '8', TILAWAH: '1', MEMILAH: '1'
};

function journalFileForProfile(profileId) {
    const id = Number(profileId);
    if (Number.isInteger(id) && id > 0) return path.join(getJournalDir(), 'jurnal-p' + id + '.js');
    return path.join(getJournalDir(), 'jurnal.js');
}

function parseConfig(body) {
    const result = {};
    const re = /(\w+)\s*:\s*(['"]?\w+['"]?)/g;
    let m;
    while ((m = re.exec(body))) {
        const val = m[2].replace(/^['"]|['"]$/g, '');
        result[m[1]] = val;
    }
    return result;
}

function readHarianConfig(profileId) {
    try {
        const file = journalFileForProfile(profileId);
        const src = fs.readFileSync(file, 'utf8');
        const match = src.match(CONFIG_RE);
        if (!match) return Object.assign({}, DEFAULT_HARIAN);
        const parsed = parseConfig(match[1]);
        const result = {};
        CONFIG_KEYS.forEach(k => { result[k] = parsed[k] !== undefined ? parsed[k] : DEFAULT_HARIAN[k]; });
        return result;
    } catch (_) {
        return Object.assign({}, DEFAULT_HARIAN);
    }
}

function writeHarianConfig(cfg, profileId) {
    try {
        const file = journalFileForProfile(profileId);
        let src = fs.readFileSync(file, 'utf8');
        CONFIG_KEYS.forEach(k => {
            const raw = cfg[k] !== undefined ? cfg[k] : DEFAULT_HARIAN[k];
            let val;
            if (String(raw) === '00') {
                val = "'00'";
            } else {
                const num = Number(raw);
                val = isNaN(num) ? raw : num;
            }
            const re = new RegExp('(\\b' + k + '\\s*:\\s*)([^,\\n]+)');
            if (re.test(src)) {
                src = src.replace(re, '$1' + val);
            }
        });
        fs.writeFileSync(file, src, 'utf8');
    } catch (err) {
        console.error('Gagal simpan harian config:', err.message);
    }
}

function sanitizeActivities(payload) {
    if (!Array.isArray(payload)) throw new Error('Payload harus berupa array');
    return payload.map(a => ({
        nama: String(a.nama || '').trim(),
        hari: String(a.hari || 'Sn').trim(),
        tipe: String(a.tipe || 'PARENT').trim().toUpperCase(),
        saksi: a.tipe === 'PARENT' ? '' : String(a.saksi || '').trim()
    }));
}

function sendJSON(res, code, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(body);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => { data += chunk; if (data.length > 1e6) req.destroy(); });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    try {
        if (req.method === 'GET' && url.pathname === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fs.readFileSync(INDEX, 'utf8'));
            return;
        }

        if (req.method === 'GET' && url.pathname === '/api/journal') {
            const file = journalPath(url.searchParams.get('profile'));
            ensureJournal(file);
            sendJSON(res, 200, {
                ok: true,
                profile: url.searchParams.get('profile') || null,
                activities: readActivities(file)
            });
            return;
        }

        if (req.method === 'GET' && url.pathname === '/api/weeks') {
            sendJSON(res, 200, { ok: true, weeks: readWeeks() });
            return;
        }

        if (req.method === 'GET' && url.pathname === '/api/harian') {
            sendJSON(res, 200, { ok: true, config: readHarianConfig(url.searchParams.get('profile')) });
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/harian') {
            const raw = await readBody(req);
            let payload;
            try { payload = JSON.parse(raw); } catch (e) { return sendJSON(res, 400, { ok: false, error: 'JSON tidak valid' }); }
            const profile = url.searchParams.get('profile');
            const cfg = Object.assign({}, DEFAULT_HARIAN, payload.config || {});
            writeHarianConfig(cfg, profile);
            sendJSON(res, 200, { ok: true, config: cfg });
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/journal') {
            const raw = await readBody(req);
            let payload;
            try { payload = JSON.parse(raw); } catch (e) { return sendJSON(res, 400, { ok: false, error: 'JSON tidak valid' }); }
            const activities = sanitizeActivities(payload.activities);
            const file = journalPath(url.searchParams.get('profile'));
            ensureJournal(file);
            writeActivities(file, activities);
            sendJSON(res, 200, { ok: true });
            return;
        }

        sendJSON(res, 404, { ok: false, error: 'Tidak ditemukan' });
    } catch (e) {
        sendJSON(res, 500, { ok: false, error: String(e && e.message || e) });
    }
});

function startServer(port) {
    return new Promise((resolve, reject) => {
        const onError = (err) => reject(err);
        server.once('error', onError);
        server.listen(port, () => {
            server.removeListener('error', onError);
            console.log('Kegiatan Mingguan berjalan di: http://localhost:' + port);
            console.log('Mengedit bagian kegiatan dari: jurnal.js');
            resolve(port);
        });
    });
}

function stopServer() {
    return new Promise((resolve) => {
        server.close(() => resolve());
    });
}

module.exports = { startServer, stopServer };

if (require.main === module) {
    startServer(PORT).catch(err => {
        console.error('Server gagal dijalankan:', err.message);
        process.exit(1);
    });
}
