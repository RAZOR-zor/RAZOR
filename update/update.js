#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

const W = 56;
function line(ch = '─') { return ch.repeat(W); }
function pad(text) {
  const vis = text.replace(/\x1b\[[0-9;]*m/g, '');
  const p = W - vis.length;
  return p > 0 ? text + ' '.repeat(p) : text;
}
function boxTop()    { return `  ┌${line('─')}┐`; }
function boxBot()    { return `  └${line('─')}┘`; }
function boxMid(t)   { return `  │${pad(t)}│`; }

function banner() {
  console.clear();
  console.log('');
  console.log(c.white + c.bold);
  console.log('  ▄▄▄▄▄▄▄▄▄▄    ▄▄▄▄▄▄▄▄▄   ▄▄▄▄▄▄▄▄▄▄    ▄▄▄▄▄▄▄▄▄   ▄▄▄▄▄▄▄▄▄▄');
  console.log('  ███▓┌─ ███▓┐  ███▓┌─ ███▓┐ ▓███┌─ ▓███│ ▄▓█▓┌─ ███▓┐ ███▓┌─ ███▓┐');
  console.log('  █████▄▄▄██▀┌┘ ███▓│▄▄████│  ▄▄▄▄▄▄██▓ ┘ ███▓│  ████│ ████▄▄▄██▀┌┘');
  console.log('  ███▓┌─ ███▄┐  ███▓├─ ████│ ▓███┌─ ▄▄▄▄┐ ███▓│  ███▓│ ███▓┌─ ███▄┐');
  console.log('  ▓███│  ███▓│  ▓██▓│  ▓██▓│ ████▄▄▄███▓│ └▓██▄▄▄█▓┌─┘ ▓███│  ███▓│');
  console.log('   ───┘   ───┘   ───┘   ───┘  ──────────┘   ───────┘    ───┘   ───┘');
  console.log(c.reset);
  console.log('');
}

function step(n, total, t) {
  console.log('');
  console.log(c.white + c.bold + `  [${n}/${total}]` + c.reset + ` ${t}`);
  console.log(c.gray + `  ${line('·')}` + c.reset);
}
function ok(t)   { console.log(`  ${c.white + c.bold}✓${c.reset} ${t}`); }
function fail(t) { console.log(`  ${c.white + c.bold}✗${c.reset} ${c.dim}${t}${c.reset}`); }
function info(t) { console.log(`  ${c.dim}${t}${c.reset}`); }
function blank() { console.log(''); }

async function main() {
  banner();

  const pkgPath = path.join(__dirname, '..', 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.log(boxTop());
    console.log(boxMid(`  ${c.bold}ERROR${c.reset}  package.json tidak ditemukan`));
    console.log(boxMid(`  ${c.dim}Pastikan folder update di dalam project${c.reset}`));
    console.log(boxBot());
    blank();
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVer = pkg.version;

  console.log(boxTop());
  console.log(boxMid(`  ${c.dim}Version saat ini${c.reset}  ${c.white + c.bold}v${currentVer}${c.reset}`));
  console.log(boxBot());
  blank();

  const newVer = await ask(`  ${c.dim}Version baru (contoh: 1.0.7):${c.reset} `);
  if (!newVer || !newVer.trim()) {
    fail('Version tidak boleh kosong');
    blank();
    process.exit(1);
  }

  blank();
  console.log(boxTop());
  console.log(boxMid(`  ${c.dim}TARGET${c.reset}    ${c.white + c.bold}v${newVer}${c.reset}`));
  console.log(boxMid(`  ${c.dim}CURRENT${c.reset}    ${c.dim}v${currentVer}${c.reset}`));
  console.log(boxBot());
  blank();

  const confirm = await ask(`  ${c.dim}Lanjutkan? (y/n):${c.reset} `);
  if (confirm.toLowerCase() !== 'y') {
    info('Dibatalkan');
    blank();
    process.exit(0);
  }

  const total = 5;

  // 1. Update version
  step(1, total, 'Update version');
  try {
    pkg.version = newVer;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    ok(`package.json → v${newVer}`);
  } catch (e) {
    fail('Gagal update package.json');
    blank();
    process.exit(1);
  }

  // 2. Clean dist
  step(2, total, 'Clean dist folder');
  const distDir = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  ok('dist dibersihkan');

  // 3. Build
  step(3, total, 'Build installer');
  info('npm run dist — mungkin butuh beberapa menit');
  blank();
  try {
    execSync('npm run dist', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
    blank();
    ok('Build selesai');
  } catch (e) {
    blank();
    fail('Build gagal');
    blank();
    process.exit(1);
  }

  // 4. Cek file
  step(4, total, 'Cek file build');
  const installer = path.join(distDir, `RAZOR-${newVer}-Setup.exe`);
  const latestYml = path.join(distDir, 'latest.yml');

  if (!fs.existsSync(installer)) {
    fail(`Installer tidak ditemukan: RAZOR-${newVer}-Setup.exe`);
    blank();
    process.exit(1);
  }
  if (!fs.existsSync(latestYml)) {
    fail('latest.yml tidak ditemukan');
    blank();
    process.exit(1);
  }
  ok(`RAZOR-${newVer}-Setup.exe`);
  ok('latest.yml');

  // 5. Upload
  step(5, total, 'Upload ke GitHub');
  blank();

  let token = '';
  const tokenFile = path.join(__dirname, 'gh-token.txt');
  if (fs.existsSync(tokenFile)) {
    token = fs.readFileSync(tokenFile, 'utf8').trim();
    info('Token dimuat dari gh-token.txt');
  }
  if (!token) {
    token = await ask(`  ${c.dim}GitHub Token (ghp_...):${c.reset} `);
    if (!token) {
      fail('Token tidak boleh kosong');
      blank();
      process.exit(1);
    }
    fs.writeFileSync(tokenFile, token);
    info('Token disimpan ke gh-token.txt');
  }
  blank();

  try {
    const psScript = path.join(__dirname, 'upload-release.ps1');
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psScript}" -Token "${token}" -Ver "${newVer}"`, { stdio: 'inherit' });
  } catch (e) {
    blank();
    fail('Upload gagal — cek token dan koneksi');
    blank();
    process.exit(1);
  }

  blank();
  console.log(boxTop());
  console.log(boxMid(''));
  console.log(boxMid(`  ${c.white + c.bold}RELEASE v${newVer} BERHASIL${c.reset}`));
  console.log(boxMid(''));
  console.log(boxMid(`  ${c.dim}https://github.com/RAZOR-zor/RAZOR/releases${c.reset}`));
  console.log(boxMid(''));
  console.log(boxBot());
  blank();

  rl.close();
}

main().catch(e => { console.error(e); process.exit(1); });
