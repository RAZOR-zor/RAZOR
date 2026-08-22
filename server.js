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
