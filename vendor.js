// ==UserScript==
// @name         RAZOR - DISPLAY + AUTO 9 TIPE (One Dark)
// @namespace    https://razor.script/display-auto
// @version      3.1.0
// @description  Tampilkan + auto-jawab MCQSA / CQ / TFQMA / MQIA / QSAT / LUQ / SSQ / MQ / CTQ - One Dark
// @author       RAZOR
// @match        https://app.kejar.id/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  if (window.__RAZOR_DISPLAY_BOOTED) return;
  window.__RAZOR_DISPLAY_BOOTED = true;

  // ── Suppress app.js debounce error biar console bersih ──
  try {
    window.addEventListener('error', (e) => {
      const msg = String(e.message || '') + String(e.error?.message || '');
      if (msg.includes('Expected a function') || msg.includes('debounce') || msg.includes('xn.ga')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return true;
      }
    }, true);
    window.addEventListener('unhandledrejection', (e) => {
      const msg = String(e.reason?.message || e.reason || '');
      if (msg.includes('Expected a function') || msg.includes('debounce')) e.preventDefault();
    });
    const _origConsoleError = console.error;
    console.error = function (...args) {
      const txt = args.join(' ');
      if (txt.includes('Expected a function') && txt.includes('debounce')) return;
      return _origConsoleError.apply(this, args);
    };
  } catch {}

  // ── One Dark Palette ──
  const FONT = "'JetBrains Mono',monospace";
  const COLORS = {
    background: '#282C34',
    panel: '#21252B',
    foreground: '#ABB2BF',
    muted: '#5C6370',
    dim: '#636D83',
    border: '#3E4452',
    success: '#98C379',
    successBg: 'rgba(152,195,121,0.14)',
    successText: '#98C379',
    warning: '#E5C07B',
    warningBg: 'rgba(229,192,123,0.14)',
    info: '#61AFEF',
    infoBg: 'rgba(97,175,239,0.14)',
    error: '#E06C75',
    errorBg: 'rgba(224,108,117,0.14)',
    purple: '#C678DD',
    cyan: '#56B6C2',
  };

  const STYLE = {
    tag: (bg, fg) => `background:${bg};color:${fg};padding:2px 8px;border-radius:4px;font-family:${FONT};font-size:11px;font-weight:800;`,
    text: (color, weight) => `font-family:${FONT};font-size:11px;color:${color};font-weight:${weight || 400};`,
  };

  const Logger = {
    brand() {
      console.log(
        '%c RAZOR %c AUTO 8 TIPE — One Dark %c',
        `background:${COLORS.success};color:${COLORS.background};font-weight:900;padding:6px 14px;border-radius:8px 0 0 8px;font-family:${FONT};font-size:13px;`,
        `background:${COLORS.panel};color:${COLORS.foreground};padding:6px 14px;border-radius:0 8px 8px 0;font-family:${FONT};font-size:11px;border:1px solid ${COLORS.border};border-left:none;`,
        `background:transparent;color:${COLORS.muted};font-family:${FONT};font-size:10px;`
      );
    },
    rule() {
      console.log('%c' + '─'.repeat(62), `color:${COLORS.border};font-family:${FONT};font-size:10px;`);
    },
    info(msg) {
      console.log('%c INFO %c ' + msg, STYLE.tag(COLORS.infoBg, COLORS.info), STYLE.text(COLORS.muted));
    },
    warn(msg) {
      console.log('%c WARN %c ' + msg, STYLE.tag(COLORS.warningBg, COLORS.warning), STYLE.text(COLORS.warning));
    },
    error(msg) {
      console.log('%c ERR %c ' + msg, STYLE.tag(COLORS.errorBg, COLORS.error), STYLE.text(COLORS.error));
    },
    hint(msg) {
      console.log('%c › %c ' + msg, STYLE.tag('rgba(92,99,112,0.2)', COLORS.dim), STYLE.text(COLORS.muted));
    },
    click(msg) {
      console.log('%c KLIK %c ' + msg, STYLE.tag(COLORS.infoBg, COLORS.cyan), STYLE.text(COLORS.foreground, 600));
    },
  };

  // ── Utils ──
  function stripHtml(html) {
    if (!html) return '';
    const d = document.createElement('div');
    d.innerHTML = String(html);
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeText(v) {
    return stripHtml(v).replace(/\s+/g, ' ').trim();
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function getToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content || '';
  }

  function hasValue(v) {
    return v !== null && v !== undefined && String(v).trim() !== '' && String(v) !== 'undefined';
  }

  function isCorrect(v) {
    return v === true || v === 1 || v === '1' || v === 'true';
  }

  async function fetchCheck(q, thisAnswer, qc, max, ac = '1') {
    const t = getToken();
    if (!t) throw new Error('CSRF');
    const p = new URLSearchParams({
      taskId: q.task_id,
      questionId: q.id,
      show_correction: 'true',
      show_explanation: 'true',
      sc: 'false',
      thisAnswer: String(thisAnswer),
      type: q.type,
      questionChoices: qc,
      maxAnswering: String(max),
      answerCount: ac,
    });
    const r = await fetch(location.href + '/check-answer', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-csrf-token': t },
      body: p.toString(),
      credentials: 'include',
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  // ── Extract ──
  async function extract(q) {
    const ch = q.choices || {};
    const qc = JSON.stringify(Object.keys(ch).length ? ch : []);
    if (q.type !== 'MQ' && q.type !== 'CTQ' && q.type !== 'SSQ' && hasValue(q.correct_answer)) {
      const ca = q.correct_answer;
      if (Array.isArray(ca)) {
        const a = ca.map((v) => String(v).trim()).filter(Boolean);
        return a.length === 1 ? a[0] : a;
      }
      return String(ca).trim();
    }
    if (q.type !== 'MQ' && q.type !== 'CTQ' && q.type !== 'SSQ' && hasValue(q.answer) && isCorrect(q.is_correct)) {
      if (Array.isArray(q.answer)) {
        const a = q.answer.map((v) => String(v).trim()).filter(Boolean);
        return a.length === 1 ? a[0] : a;
      }
      return String(q.answer).trim();
    }
    if (q.type === 'TFQMA') {
      const m = {};
      for (const [k, v] of Object.entries(ch)) m[k] = isCorrect(v?.answer);
      return Object.keys(m).length ? m : null;
    }
    if (q.type === 'MCQSA') {
      for (const o of Object.keys(ch)) {
        try {
          const d = await fetchCheck(q, o, qc, 1);
          if (hasValue(d?.correct_answer)) return Array.isArray(d.correct_answer) ? String(d.correct_answer).trim() : String(d.correct_answer).trim();
          if (isCorrect(d?.is_correct)) return o;
        } catch {}
        await sleep(60);
      }
      return null;
    }
    if (q.type === 'CQ') {
      const opts = Object.keys(ch);
      const emb = opts.filter((k) => isCorrect(ch[k]?.answer));
      if (emb.length) return emb;
      try {
        const d = await fetchCheck(q, opts.join(','), qc, opts.length);
        if (hasValue(d?.correct_answer)) {
          const s = Array.isArray(d.correct_answer) ? d.correct_answer.join(',') : String(d.correct_answer);
          return s.split(',').map((s) => s.trim()).filter(Boolean);
        }
      } catch {}
      await sleep(60);
      try {
        const d = await fetchCheck(q, JSON.stringify(opts), qc, opts.length);
        if (hasValue(d?.correct_answer)) {
          const s = Array.isArray(d.correct_answer) ? d.correct_answer.join(',') : String(d.correct_answer);
          return s.split(',').map((s) => s.trim()).filter(Boolean);
        }
      } catch {}
      await sleep(60);
      if (opts.length <= 6) for (let m = 1; m < 1 << opts.length; m++) {
        const c = opts.filter((_, i) => m & (1 << i));
        try {
          const d = await fetchCheck(q, c.join(','), qc, c.length);
          if (isCorrect(d?.is_correct)) return c;
          if (hasValue(d?.correct_answer)) {
            const s = Array.isArray(d.correct_answer) ? d.correct_answer.join(',') : String(d.correct_answer);
            return s.split(',').map((s) => s.trim()).filter(Boolean);
          }
        } catch {}
        await sleep(40);
      }
      return null;
    }
    if (q.type === 'MQIA') {
      let n = 1;
      try {
        if (Array.isArray(ch)) n = ch.length || 1;
        else {
          if (Array.isArray(ch.first)) n = Math.max(n, ch.first.length);
          if (Array.isArray(ch.last)) n = Math.max(n, ch.last.length);
        }
      } catch {}
      if (!n) n = Array.isArray(q.answer) ? q.answer.length : 1;
      async function trySlot(c, o) {
        const e = Array.from({ length: c }, () => ({ answer: 'zzz' }));
        const t = getToken();
        const p = new URLSearchParams({
          taskId: q.task_id, questionId: q.id, show_correction: 'true', show_explanation: 'true',
          thisAnswer: JSON.stringify(e), type: q.type, questionChoices: JSON.stringify(o), maxAnswering: '1', answerCount: String(c + 1),
        });
        const r = await fetch(location.href + '/check-answer', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-csrf-token': t }, body: p.toString(), credentials: 'include' });
        if (!r.ok) return null;
        const d = await r.json();
        if (d?.correct_answer == null) return null;
        return Array.isArray(d.correct_answer) ? d.correct_answer.map((v) => String(v).trim()).filter(Boolean) : [String(d.correct_answer).trim()];
      }
      try {
        let k = await trySlot(n, ch);
        if (k?.length) return k;
        for (const nn of [1, 2, 3, 4, 5]) {
          if (nn === n) continue;
          k = await trySlot(nn, ch);
          if (k?.length) return k;
          await sleep(60);
        }
        k = await trySlot(1, {});
        if (k?.length) return k;
      } catch {}
      return null;
    }
    if (q.type === 'QSAT') {
      try {
        const d = await fetchCheck(q, 'zzz', JSON.stringify(q.choices || null), 1);
        let ca = d?.correct_answer;
        if (Array.isArray(ca)) ca = ca[0];
        if (hasValue(ca)) return String(ca).trim();
        if (isCorrect(d?.is_correct)) return 'zzz';
      } catch {}
      if (hasValue(q.answer)) return String(q.answer).trim();
      return null;
    }
    if (q.type === 'SSQ') {
      const qc2 = JSON.stringify(ch || {});
      try {
        const keys = Object.keys(ch || {});
        const rev = keys.slice().reverse();
        const d = await fetchCheck(q, JSON.stringify(rev), qc2, 1);
        let ca = d?.correct_answer || d?.answer;
        if (Array.isArray(ca) && ca.length) return ca.map((v) => String(v).trim());
        if (ca && typeof ca === 'object') {
          const s = Object.entries(ca).sort((a, b) => (a[1].answer || 0) - (b[1].answer || 0)).map((e) => e[0]);
          if (s.length) return s;
        }
      } catch {}
      try {
        const e = Object.entries(ch || {});
        if (!e.length) return null;
        if (e.every(([, v]) => v && typeof v.answer !== 'undefined')) return e.sort((a, b) => Number(a[1].answer) - Number(b[1].answer)).map((x) => x[0]);
        return Object.keys(ch);
      } catch {}
      return null;
    }
    if (q.type === 'MQ') {
      const lk = Object.keys(q.choices?.[0] || {});
      const rk = Object.keys(q.choices?.[1] || {});
      if (!lk.length || !rk.length) return null;
      const fake = lk.map(() => ({ answer: rk[0] }));
      const res = await fetch(location.href + '/check-answer', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-csrf-token': getToken() },
        body: new URLSearchParams({
          taskId: q.task_id, questionId: q.id, show_correction: 'true', show_explanation: 'true',
          thisAnswer: JSON.stringify(fake), type: 'MQ', questionChoices: JSON.stringify(q.choices), maxAnswering: '1', answerCount: '1',
        }).toString(),
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      const correct = data?.correct_answer;
      if (!Array.isArray(correct) || !correct.length) return null;
      const lm = {}, rm = {};
      lk.forEach((k) => { lm[String(q.choices[0][k])] = k; lm[stripHtml(q.choices[0][k])] = k; });
      rk.forEach((k) => { rm[String(q.choices[1][k])] = k; rm[stripHtml(q.choices[1][k])] = k; });
      const m = {};
      for (const it of correct) {
        const l = lm[String(it.question)] || lm[stripHtml(it.question)];
        const r = rm[String(it.answer)] || rm[stripHtml(it.answer)];
        if (l && r) m[l] = r;
      }
      return Object.keys(m).length ? m : null;
    }
    // CTQ (Tabel) — jawaban ada di choices.body[i][1].value
    if (q.type === 'CTQ') {
      try {
        const body = q.choices?.body;
        if (Array.isArray(body) && body.length) {
          const ans = body.map((row) => {
            const cell = row?.[1];
            const v = cell?.value;
            return hasValue(v) ? String(v).trim() : null;
          });
          if (ans.every((a) => a !== null)) return ans;
        }
      } catch {}
      return null;
    }
    // LUQ — isian multi-baris (contoh: Tuliskan kata baku dari 5 kata)
    if (q.type === 'LUQ') {
      // 1. Coba ambil dari choices langsung (kadang choices = array kata)
      try {
        if (Array.isArray(q.choices) && q.choices.length) {
          const maybe = q.choices.map(v => v?.answer ?? v?.correct_answer ?? v?.value).filter(hasValue);
          if (maybe.length === q.choices.length && maybe.every(v => typeof v === 'string')) {
            // jangan salah — pastikan bukan fake
          }
        }
      } catch {}
      // 2. Tebak jumlah kolom dari DOM atau choices (LUQ: choices = [[5 kata]])
      let n = 0;
      try {
        const panel = document.getElementById('question-panel-' + window.questionKey);
        if (panel) n = panel.querySelectorAll('input[type="text"], input:not([type]), textarea').length;
      } catch {}
      if (!n) {
        try {
          if (Array.isArray(ch) && Array.isArray(ch[0])) n = ch[0].length || 0;
          else if (Array.isArray(ch)) n = ch.length || 0;
          else if (ch && typeof ch === 'object') n = Object.keys(ch).length || 0;
        } catch {}
      }
      if (!n && Array.isArray(q.answer)) n = q.answer.length;
      if (!n) n = 5; // fallback screenshot 5 input

      async function tryLUQ(count, choicesObj) {
        const t = getToken();
        if (!t) return null;
        // Coba semua format fake yang mungkin untuk LUQ — server kadang cuma bocorin kalau format pas
        const fakeVariants = [
          { name: 'obj-array', fake: Array.from({ length: count }, () => ({ answer: 'zzz' })) },
          { name: 'str-array', fake: Array.from({ length: count }, () => 'zzz') },
          { name: 'obj-map', fake: Object.fromEntries(Array.from({ length: count }, (_, i) => [i, { answer: 'zzz' }])) },
          { name: 'str-map', fake: Object.fromEntries(Array.from({ length: count }, (_, i) => [i, 'zzz'])) },
          { name: 'single', fake: 'zzz' },
          { name: 'empty-obj', fake: {} },
          { name: 'null', fake: null },
        ];
        const paramVariants = [
          { sc: 'true', se: 'true', ac: String(count), ma: '1' },
          { sc: 'true', se: 'true', ac: '1', ma: '1' },
          { sc: 'false', se: 'false', ac: '1', ma: '1' },
          { sc: 'true', se: 'false', ac: '1', ma: '1' },
          { sc: 'false', se: 'true', ac: String(count), ma: '5' },
        ];
        let best = null;
        for (const fv of fakeVariants) {
          for (const pv of paramVariants) {
            const p = new URLSearchParams({
              taskId: q.task_id, questionId: q.id, show_correction: pv.sc, show_explanation: pv.se,
              thisAnswer: JSON.stringify(fv.fake), type: q.type, questionChoices: JSON.stringify(choicesObj ?? q.choices ?? []), maxAnswering: pv.ma, answerCount: pv.ac,
            });
            try {
              const r = await fetch(location.href + '/check-answer', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-csrf-token': t }, body: p.toString(), credentials: 'include' });
              if (!r.ok) continue;
              const d = await r.json();
              // Filter yang zzz semua → skip, cari yang ada kata baku beneran
              let ca = d?.correct_answer ?? d?.answer ?? d?.data?.correct_answer;
              if (ca == null) continue;
              function toStr(val) {
                if (val == null) return '';
                if (typeof val === 'string') return val.trim();
                if (typeof val === 'number') return String(val);
                if (typeof val === 'object') {
                  if ('answer' in val) return toStr(val.answer);
                  if ('value' in val) return toStr(val.value);
                  if ('text' in val) return toStr(val.text);
                  const vals = Object.values(val);
                  for (const vv of vals) if (typeof vv === 'string' && vv.trim() && vv.trim() !== 'zzz' && vv.trim() !== '1') return vv.trim();
                  for (const vv of vals) { const s = toStr(vv); if (s && s !== 'zzz' && s !== '1') return s; }
                  // fallback ambil string apa aja
                  for (const vv of vals) if (typeof vv === 'string' && vv.trim()) return vv.trim();
                }
                return String(val).trim();
              }
              let arr = null;
              if (Array.isArray(ca)) arr = ca.map(x => toStr(x)).filter(Boolean);
              else if (typeof ca === 'object') arr = Object.values(ca).map(x => toStr(x)).filter(Boolean);
              else arr = [toStr(ca)].filter(Boolean);
              // Skip kalau hasilnya cuma zzz semua atau 1 semua
              const isZzzOnly = arr.length && arr.every(x => x.toLowerCase() === 'zzz' || x === '1');
              const logColor = isZzzOnly ? '#5C6370' : '#98C379';
              try { console.log('%c LUQ try ' + fv.name + ' ac=' + pv.ac + ' sc=' + pv.sc + ' → ', 'color:' + logColor, { correct: arr, raw: d }); } catch {}
              if (isZzzOnly) continue;
              if (arr.length) {
                if (!best || arr.length > best.length) best = arr;
                if (best.length === count) return best; // dapet full 5
              }
            } catch {}
            await sleep(50);
          }
        }
        return best;
      }

      try {
        let ans = await tryLUQ(n, q.choices);
        if (ans?.length === n) return ans;
        if (ans?.length && ans.length > 1) return ans;
        for (const nn of [5,4,3,2,6,7,8,1]) {
          if (nn === n) continue;
          const a2 = await tryLUQ(nn, q.choices);
          if (a2?.length === nn) return a2;
          if (a2?.length && a2.length > 1) return a2;
          await sleep(60);
        }
        if (ans?.length) return ans;
        const ans2 = await tryLUQ(n, []);
        if (ans2?.length) return ans2;
      } catch {}
      return null;
    }
    return null;
  }

  // ── Display ──
  function hdr(i, tot, q) {
    const lb = { MCQSA: 'PILIHAN GANDA', CQ: 'PILIHAN GANDA KOMPLEKS', TFQMA: 'BENAR / SALAH', MQIA: 'ISIAN ANGKA', QSAT: 'ISIAN SINGKAT', LUQ: 'ISIAN KATA BAKU', SSQ: 'MENGURUTKAN', MQ: 'MENJODOHKAN', CTQ: 'TABEL' }[q.type] || q.type;
    console.log('%c SOAL ' + (i + 1) + '/' + tot + ' %c ' + lb + ' %c ' + q.type + ' ', STYLE.tag(COLORS.successBg, COLORS.success), STYLE.tag('rgba(92,99,112,0.3)', COLORS.foreground), STYLE.tag(COLORS.infoBg, COLORS.info));
  }
  function pMCQSA(q, a) { if (!hasValue(a)) return; console.log('%c JAWABAN %c ' + String(a).trim().toUpperCase() + ' ', STYLE.tag(COLORS.successBg, COLORS.success), `background:${COLORS.success};color:${COLORS.background};padding:4px 14px;border-radius:4px;font-family:${FONT};font-size:13px;font-weight:900;`); }
  function pCQ(q, a) { const v = Array.isArray(a) ? a.map((x) => String(x).trim().toUpperCase()) : String(a || '').split(',').map((x) => x.trim().toUpperCase()).filter(Boolean); if (!v.length) return; console.log('%c JAWABAN %c ' + v.join(', ') + ' ', STYLE.tag(COLORS.successBg, COLORS.success), `background:${COLORS.success};color:${COLORS.background};padding:4px 14px;border-radius:4px;font-family:${FONT};font-size:13px;font-weight:900;`); }
  function pTFQMA(q, a) {
    const m = a && typeof a === 'object' && !Array.isArray(a) ? a : {};
    const ks = Object.keys(m).sort();
    console.log('%c JAWABAN %c ' + ks.map((k) => k + ':' + (m[k] ? 'Benar' : 'Salah')).join('  •  '), STYLE.tag(COLORS.successBg, COLORS.success), STYLE.text(COLORS.successText, 700));
    for (const k of ks) { const b = m[k] === true; console.log('%c ' + k + ' %c ' + (b ? 'BENAR' : 'SALAH'), STYLE.tag(b ? COLORS.successBg : COLORS.errorBg, b ? COLORS.success : COLORS.error), STYLE.tag('rgba(92,99,112,0.2)', COLORS.dim)); }
  }
  function pMQIA(q, a) { const v = Array.isArray(a) ? a : [String(a)]; console.log('%c JAWABAN %c ' + v.map((x) => String(x).trim()).filter(Boolean).join(' , ') + ' ', STYLE.tag(COLORS.successBg, COLORS.success), `background:${COLORS.success};color:${COLORS.background};padding:4px 14px;border-radius:4px;font-family:${FONT};font-size:13px;font-weight:900;`); }
  function pQSAT(q, a) { console.log('%c JAWABAN %c ' + String(a || '').trim() + ' ', STYLE.tag(COLORS.successBg, COLORS.success), `background:${COLORS.success};color:${COLORS.background};padding:4px 14px;border-radius:4px;font-family:${FONT};font-size:13px;font-weight:900;`); }
  function pSSQ(q, a) {
    const arr = Array.isArray(a) ? a : String(a).split(',').map((x) => x.trim()).filter(Boolean);
    console.log('%c JAWABAN %c ' + arr.join(' → ') + ' ', STYLE.tag(COLORS.successBg, COLORS.success), `background:${COLORS.success};color:${COLORS.background};padding:4px 14px;border-radius:4px;font-family:${FONT};font-size:13px;font-weight:900;`);
    const txt = arr.map((id) => { const t = normalizeText(q.choices[id]?.question || ''); return t ? id + ':' + t : id; }).join('  →  ');
    if (txt) console.log('%c ' + txt, `font-family:${FONT};font-size:11px;color:${COLORS.successText};font-weight:600;`);
  }
  function pMQ(q, a) {
    const m = a && typeof a === 'object' && !Array.isArray(a) ? a : {};
    const pairs = Object.entries(m);
    if (!pairs.length) { console.log('%c JAWABAN %c (kosong)', STYLE.tag(COLORS.successBg, COLORS.success), STYLE.text(COLORS.muted)); return; }
    console.log('%c JAWABAN %c ' + pairs.map(([l, r]) => l + '→' + r).join('  •  ') + ' ', STYLE.tag(COLORS.successBg, COLORS.success), `background:${COLORS.success};color:${COLORS.background};padding:4px 14px;border-radius:4px;font-family:${FONT};font-size:13px;font-weight:900;`);
    const right = q.choices?.[1] || {};
    for (const [l, r] of pairs) console.log('%c ' + l + ' %c → %c ' + r + ' %c ' + normalizeText(right[r] || r), STYLE.tag('rgba(92,99,112,0.2)', COLORS.dim), STYLE.tag(COLORS.infoBg, COLORS.info), STYLE.tag('rgba(92,99,112,0.2)', COLORS.dim), STYLE.text(COLORS.successText, 600));
  }
  function pCTQ(q, a) {
    const arr = Array.isArray(a) ? a : String(a || '').split(',').map((x) => x.trim()).filter(Boolean);
    console.log('%c JAWABAN %c ' + arr.join(' | ') + ' ', STYLE.tag(COLORS.successBg, COLORS.success), `background:${COLORS.success};color:${COLORS.background};padding:4px 14px;border-radius:4px;font-family:${FONT};font-size:13px;font-weight:900;`);
  }
  function pLUQ(q, a) {
    function s(v){ if(v==null) return ''; if(typeof v==='string') return v.trim(); if(typeof v==='object'){ if('answer' in v) return s(v.answer); if('value' in v) return s(v.value); return String(v); } return String(v).trim(); }
    const arr = Array.isArray(a) ? a.map(s) : String(s(a) || '').split('|').map(x => x.trim()).filter(Boolean);
    console.log('%c JAWABAN %c ' + arr.join(' | ') + ' ', STYLE.tag(COLORS.successBg, COLORS.success), `background:${COLORS.success};color:${COLORS.background};padding:4px 14px;border-radius:4px;font-family:${FONT};font-size:13px;font-weight:900;`);
    arr.forEach((v, i) => console.log('%c ' + (i+1) + ' %c ' + v, STYLE.tag('rgba(92,99,112,0.2)', COLORS.dim), STYLE.text(COLORS.successText, 600)));
  }
  function pMFMQ(q, a) {
    const arr = Array.isArray(a) ? a.filter((v) => v !== null) : [a];
    console.log('%c JAWABAN %c ' + arr.join(' , ') + ' ', STYLE.tag(COLORS.successBg, COLORS.success), `background:${COLORS.success};color:${COLORS.background};padding:4px 14px;border-radius:4px;font-family:${FONT};font-size:13px;font-weight:900;`);
  }

  // ── Fill (auto) ──
  function fillMCQSA(q, a) {
    const key = String(a).trim().toUpperCase();
    let r = document.querySelector('input[name="choice[' + q.id + ']"][value="' + key + '"]');
    if (!r) { const all = document.querySelectorAll('input[name="choice[' + q.id + ']"]'); const idx = key.charCodeAt(0) - 65; if (all[idx]) r = all[idx]; }
    if (!r) return false;
    r.checked = true; r.click(); try { r.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
    return true;
  }
  function fillCQ(q, a) {
    const arr = Array.isArray(a) ? a.map((x) => String(x).trim().toUpperCase()) : String(a).split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
    let ok = false;
    for (const v of arr) {
      const cb = document.querySelector('input.select-answer-cq-' + q.id + '[value="' + v + '"]') || document.querySelector('input[type="checkbox"][name="choice[' + q.id + ']"][value="' + v + '"]');
      if (cb && !cb.checked) { cb.click(); ok = true; }
    }
    return ok;
  }
  function fillTFQMA(q, m) {
    let ok = false;
    for (const [num, val] of Object.entries(m)) {
      const v = val ? 'true' : 'false';
      const r = document.querySelector('input[name="tfqma-' + q.id + '-' + num + '"][value="' + v + '"]');
      if (r) { r.checked = true; r.click(); ok = true; }
    }
    return ok;
  }
  function fillMQIA(q, a) {
    const inputs = Array.from(document.querySelectorAll('input.input-mqia-' + q.id));
    const arr = Array.isArray(a) ? a : [a];
    let ok = true;
    for (let i = 0; i < inputs.length; i++) {
      const v = arr[i] !== undefined ? arr[i] : arr[arr.length - 1];
      const input = inputs[i];
      if (!input) continue;
      input.removeAttribute('readonly');
      input.focus(); input.click();
      try { input.value = String(v).trim(); } catch {}
      try {
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
        if (setter) setter.call(input, String(v).trim());
      } catch {}
      ['input', 'change', 'keyup'].forEach((ev) => input.dispatchEvent(new Event(ev, { bubbles: true })));
      if (input.value !== String(v).trim()) ok = false;
    }
    return ok;
  }
  function fillQSAT(q, a) {
    const panel = document.getElementById('question-panel-' + window.questionKey) || document;
    const input = panel.querySelector('textarea,input[type="text"],input[type="number"],.answer-input,.form-control') || document.querySelector('#input-' + q.id);
    if (!input) return false;
    const v = Array.isArray(a) ? a.join(' ') : String(a).trim();
    input.removeAttribute('readonly');
    input.focus(); input.click();
    try { input.value = v; } catch {}
    try {
      const s = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
      if (s) s.call(input, v);
    } catch {}
    ['input', 'change', 'keyup', 'blur'].forEach((ev) => input.dispatchEvent(new Event(ev, { bubbles: true })));
    return input.value === v;
  }
  async function fillSSQ(q, a) {
    const qid = q.id;
    const panel = document.querySelector('.sort-paragraf-panel-' + qid);
    if (!panel) return false;
    const rows = () => Array.from(panel.querySelectorAll(':scope > .sort-paragraf-' + qid));
    const isCorrect = () => rows().every((r, i) => parseInt(r.dataset.answer) === i + 1);
    if (isCorrect()) return true;
    const n = rows().length;
    for (let pos = 0; pos < n; pos++) {
      let guard = 0;
      while (guard++ < n * 2) {
        const rs = rows();
        const row = rs.find((r) => parseInt(r.dataset.answer) === pos + 1);
        if (!row || rs.indexOf(row) === pos) break;
        const up = row.querySelector('.arrow-up:not(.none)');
        if (up) up.click();
        else {
          const from = row.getBoundingClientRect();
          const to = rs[pos].getBoundingClientRect();
          row.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: from.x + 10, clientY: from.y + 10 }));
          document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: to.x + 10, clientY: to.y + 10 }));
          document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: to.x + 10, clientY: to.y + 10 }));
        }
        await sleep(60);
      }
    }
    return isCorrect();
  }
  async function fillMQ(q, mapping) {
    const qid = q.id;
    const zones = document.querySelectorAll('.answer-selected-' + qid);
    if (!zones.length) return 0;
    const jq = window.jQuery || window.$;
    let done = 0;
    for (const leftId of Object.keys(q.choices[0] || {})) {
      const idx = Object.keys(q.choices[0] || {}).indexOf(leftId);
      const zone = zones[idx];
      if (!zone || zone.querySelector('.answer-list')) { done++; continue; }
      const rightId = mapping[leftId];
      if (!rightId) continue;
      let card = null;
      for (const el of document.querySelectorAll('.answer-list-' + qid + '[data-key="' + rightId + '"]')) {
        if (!el.closest('.answer-selected') && !el.classList.contains('ui-draggable-dragging')) { card = el; break; }
      }
      if (!card) card = document.querySelector('.answer-list-' + qid + '[data-key="' + rightId + '"]');
      if (!card) continue;
      let moved = false;
      try {
        if (jq && jq.fn && jq.fn.droppable) {
          const $zone = jq(zone);
          const dropFn = $zone.droppable('option', 'drop');
          if (typeof dropFn === 'function') {
            const $card = jq(card);
            dropFn.call(zone, jq.Event('drop'), { helper: $card.clone(), draggable: $card });
            moved = !!zone.querySelector('.answer-list');
          }
        }
      } catch {}
      if (!moved) { zone.appendChild(card); moved = true; }
      if (moved) done++;
      await sleep(120);
    }
    document.querySelectorAll('svg,canvas,[class*="jsplumb"],[class*="connector"]').forEach((el) => { try { el.remove(); } catch {} });
    const total = document.querySelectorAll('.answer-selected-' + qid).length;
    const filled = document.querySelectorAll('.answer-selected-' + qid + ' .answer-list-' + qid).length;
    if (total && total === filled) {
      const jq2 = window.jQuery || window.$;
      if (jq2) try { jq2('.check-answer').prop('disabled', false).removeClass('disabled'); } catch {}
      document.querySelectorAll('.check-answer').forEach((b) => { b.removeAttribute('disabled'); b.classList.remove('disabled'); b.disabled = false; });
    }
    return done;
  }
  function fillCTQ(q, a) {
    const arr = Array.isArray(a) ? a : String(a || '').split(',').map((x) => x.trim()).filter(Boolean);
    // Cari panel soal ini saja
    const qPanel = document.querySelector('.question-panel-' + window.questionKey)
      || document.querySelector('[id*="question-panel-' + window.questionKey + '"]')
      || document;
    // Cari tabel jawaban (bukan tabel referensi) — cari tabel yang ada input di td
    const tables = qPanel.querySelectorAll('table');
    let answerInputs = [];
    for (const table of tables) {
      const rows = table.querySelectorAll('tbody tr, tr');
      for (const row of rows) {
        const tds = row.querySelectorAll('td');
        if (tds.length >= 2) {
          const lastTd = tds[tds.length - 1];
          const inp = lastTd.querySelector('input');
          if (inp) answerInputs.push(inp);
        }
      }
    }
    // Fallback: kalau ga ketemu pakai cara di atas, cari semua input di area kanan
    if (!answerInputs.length) {
      const allTables = qPanel.querySelectorAll('table');
      const lastTable = allTables[allTables.length - 1];
      if (lastTable) {
        answerInputs = Array.from(lastTable.querySelectorAll('input'));
      }
    }
    Logger.info('CTQ input ditemukan: ' + answerInputs.length + ' | jawaban: ' + arr.length);
    if (!answerInputs.length) {
      Logger.warn('CTQ input tidak ditemukan untuk ' + q.id);
      return false;
    }
    let ok = false;
    answerInputs.forEach((inp, i) => {
      if (i < arr.length) {
        const v = arr[i];
        inp.removeAttribute('readonly');
        inp.removeAttribute('disabled');
        inp.focus(); inp.click();
        try { inp.value = v; } catch {}
        try {
          const s = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), 'value')?.set;
          if (s) s.call(inp, v);
        } catch {}
        ['input', 'change', 'keyup', 'blur'].forEach((ev) => inp.dispatchEvent(new Event(ev, { bubbles: true })));
        ok = true;
      }
    });
    return ok;
  }

  function fillLUQ(q, a) {
    function s(v){ if(v==null) return ''; if(typeof v==='string') return v.trim(); if(typeof v==='object'){ if('answer' in v) return s(v.answer); if('value' in v) return s(v.value); return String(v); } return String(v).trim(); }
    const arr = Array.isArray(a) ? a.map(s) : String(s(a) || '').split('|').map(x => x.trim()).filter(Boolean);
    // LUQ: 5 input di dalam panel soal (screenshot Percakapan Sehari-hari)
    const qPanel = document.getElementById('question-panel-' + window.questionKey) || document.querySelector('.question-panel-' + window.questionKey) || document;
    let inputs = Array.from(qPanel.querySelectorAll('input[type="text"], input:not([type]), textarea'));
    if (!inputs.length) inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])')).filter(inp => inp.offsetParent !== null && !inp.classList.contains('d-none'));
    // Filter visible only
    inputs = inputs.filter(inp => {
      const st = window.getComputedStyle(inp);
      return st.display !== 'none' && st.visibility !== 'hidden' && inp.getBoundingClientRect().width > 0;
    });
    Logger.info('LUQ input ditemukan: ' + inputs.length + ' | jawaban: ' + arr.length);
    if (!inputs.length) { Logger.warn('LUQ input tidak ditemukan'); return false; }
    let ok = false;
    const n = Math.min(inputs.length, arr.length);
    for (let i = 0; i < n; i++) {
      const inp = inputs[i], v = arr[i];
      inp.removeAttribute('readonly'); inp.removeAttribute('disabled');
      inp.focus(); inp.click();
      try { inp.value = String(v).trim(); } catch {}
      try { const s = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), 'value')?.set; if (s) s.call(inp, String(v).trim()); } catch {}
      ['input','change','keyup','blur'].forEach(ev => inp.dispatchEvent(new Event(ev, { bubbles: true })));
      ok = true;
    }
    return ok;
  }

  // ── Fill MFMQ (bilangan: isi input yang visible only) ──
  function fillMFMQ(q, a) {
    const arr = Array.isArray(a) ? a.filter((v) => v !== null) : [a];
    // Cari semua input di panel soal, filter yang visible
    const allInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])'));
    const visibleInputs = allInputs.filter((inp) => {
      if (inp.offsetParent === null) return false;
      if (inp.classList.contains('d-none') || inp.style.display === 'none') return false;
      return true;
    });
    if (!visibleInputs.length) return false;
    let ok = false;
    visibleInputs.forEach((inp, i) => {
      if (i < arr.length) {
        const v = arr[i];
        inp.removeAttribute('readonly');
        inp.removeAttribute('disabled');
        inp.focus(); inp.click();
        try { inp.value = String(v).trim(); } catch {}
        try {
          const s = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), 'value')?.set;
          if (s) s.call(inp, String(v).trim());
        } catch {}
        ['input', 'change', 'keyup'].forEach((ev) => inp.dispatchEvent(new Event(ev, { bubbles: true })));
        ok = true;
      }
    });
    return ok;
  }

  // ── Helpers Auto ──
  function findNextButton() {
    const check = document.querySelector('.check-answer');
    if (check && !check.disabled && !check.classList.contains('disabled') && check.offsetParent !== null) return check;
    const next = document.querySelector('.next-question');
    if (next && next.offsetParent !== null) return next;
    const finish = document.querySelector('.finish-question');
    if (finish && finish.offsetParent !== null) return finish;
    const byText = Array.from(document.querySelectorAll('button')).find((b) => {
      const t = (b.innerText || '').trim().toUpperCase();
      return t.includes('SELANJUTNYA') || t === 'SELESAI' || t === 'CEK JAWABAN';
    });
    if (byText && !byText.disabled && byText.offsetParent !== null) return byText;
    return null;
  }

  function clickButton(button) {
    Logger.click((button.innerText || button.textContent || '').trim().slice(0, 24) || button.className.slice(0, 20));
    try { button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); } catch { try { button.click(); } catch {} }
  }

  // ── Helper: tunggu elemen muncul pakai MutationObserver ──
  function waitForElement(selector, timeout = 15000) {
    return new Promise((resolve) => {
      const found = document.querySelector(selector);
      if (found) return resolve(found);
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(document.querySelector(selector) || null);
      }, timeout);
    });
  }

  const PROGRAM_PACKAGE_ID = 'e6ddd73e-b6ee-412b-9bb8-7247a2ef9f88'; // fallback Matrikulasi terbaru
  function getProgramPackageId() {
    const m = location.href.match(/program-package\/([a-f0-9-]{36})/);
    return m ? m[1] : PROGRAM_PACKAGE_ID;
  }

  function getCardValue(card) {
    const scoreEl = card.querySelector('.h5-reg');
    if (scoreEl) {
      const text = (scoreEl.textContent || '').trim();
      const m = text.match(/(\d+\.?\d*)/);
      if (m) return { text: m[1], value: parseFloat(m[1]) };
    }
    return { text: null, value: null };
  }

  function getCardName(card) {
    const nameEl = card.querySelector('.h5-semibold');
    if (nameEl) return (nameEl.textContent || '').trim();
    const lines = (card.innerText || '').split('\n').map((l) => l.trim()).filter(Boolean);
    return lines[0] || 'Aktivitas';
  }

  // ── Daftar Paket — auto-click card prioritas ──
  async function handleDaftarPaket() {
    Logger.info('Daftar paket terdeteksi — cari card <100 → belum');
    for (let i = 0; i < 20; i++) {
      if (document.querySelector('.exercise-card, .panel-card-stats, a.list-group-item-revamp-penilaian, .panel.panel-card-stats')) break;
      await sleep(500);
    }
    const cards = Array.from(document.querySelectorAll('.exercise-card, .panel-card-stats, a.list-group-item-revamp-penilaian, .panel.panel-card-stats'));
    if (!cards.length) {
      Logger.warn('Card aktivitas tidak ditemukan');
      return;
    }
    let target = null;
    let reason = '';
    // Prioritas 1: nilai < 100
    for (const card of cards) {
      const { text, value } = getCardValue(card);
      if (value !== null && value < 100) { target = card; reason = 'nilai ' + text + ' (<100)'; break; }
    }
    // Prioritas 2: belum dikerjakan (tidak ada .h5-reg)
    if (!target) {
      for (const card of cards) {
        const { value } = getCardValue(card);
        if (value === null) { target = card; reason = 'belum dikerjakan'; break; }
      }
    }
    if (!target) {
      Logger.info('Semua nilai 100 — tidak ada yang perlu dikerjakan');
      console.log('__AKM_ALL_DONE__');
      return;
    }
    const name = getCardName(target);
    Logger.info('Target: "' + name + '" — ' + reason);
    Logger.click('Buka ' + name);
    target.scrollIntoView({ behavior: 'instant', block: 'center' });
    await sleep(300);
    try { target.click(); } catch {}
    try { target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); } catch {}
    const href = target.getAttribute('href') || target.querySelector('a')?.getAttribute('href');
    if (href && href.includes('/activities/')) {
      await sleep(400);
      if (!location.href.includes(href)) location.href = href;
    }
  }

  // ── Halaman Materi — pakai pola review-checkbox-0 / next-button-0 (sesuai request user) ──
  async function autoClickSequence() {
    let index = 0;
    while (true) {
      const checkbox = document.getElementById(`review-checkbox-${index}`) || document.querySelector(`input[data-checkbox="${index}"]`);
      const nextButton = document.getElementById(`next-button-${index}`);
      if (checkbox) {
        try { checkbox.scrollIntoView({ behavior: 'instant', block: 'center' }); } catch {}
        checkbox.click();
        try { checkbox.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
        Logger.click(`Checkbox ${index} dicentang (review-checkbox-${index})`);
        await sleep(300);
      }
      if (nextButton) {
        try { nextButton.scrollIntoView({ behavior: 'instant', block: 'center' }); } catch {}
        try { nextButton.removeAttribute('disabled'); nextButton.classList.remove('disabled'); nextButton.disabled = false; } catch {}
        nextButton.click();
        try { nextButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); } catch {}
        Logger.click(`Tombol selanjutnya ${index} diklik (next-button-${index})`);
        await sleep(500);
        index++;
      } else if (!checkbox) {
        if (index === 0) return 0;
        Logger.info('=== Proses otomatisasi selesai (' + index + ' halaman) ===');
        break;
      } else {
        const nextCb = document.getElementById(`review-checkbox-${index + 1}`) || document.querySelector(`input[data-checkbox="${index + 1}"]`);
        const nextBtn2 = document.getElementById(`next-button-${index + 1}`);
        if (!nextCb && !nextBtn2) {
          Logger.info('=== Proses otomatisasi selesai (' + (index + 1) + ' halaman) ===');
          break;
        }
        index++;
      }
    }
    return index;
  }

  async function handleReadingLoop() {
    if (!document.body.innerText.includes('Saya sudah selesai membaca')) return 0;
    Logger.info('Halaman materi terdeteksi — jalankan autoClickSequence');
    const n = await autoClickSequence();
    // Jika pola index tidak ditemukan (n===0), coba sekali dengan selector generik
    if (n === 0 && document.body.innerText.includes('Saya sudah selesai membaca')) {
      const cb = document.querySelector('input[type="checkbox"]');
      const btn = document.querySelector('button');
      if (cb) { cb.click(); await sleep(300); }
      const nextBtn = Array.from(document.querySelectorAll('button, a')).find(b => /SELANJUTNYA|MULAI/i.test(b.innerText));
      if (nextBtn) { nextBtn.click(); await sleep(500); return 1; }
    }
    return n;
  }

  // ── Main Auto Loop ──
  async function run() {
    console.clear();
    Logger.brand();
    Logger.rule();

    // Prioritas 0: halaman materi — pakai autoClickSequence
    try {
      if (document.body.innerText.includes('Saya sudah selesai membaca')) {
        const n = await handleReadingLoop();
        if (n > 0) await sleep(900);
      }
    } catch {}

    const isFinishPage = location.href.includes('/finish');

    if (isFinishPage) {
      Logger.info('Halaman finish terdeteksi - balik ke daftar paket');
      const m = location.href.match(/list-subjects\/([a-f0-9-]{36})\//);
      const prog = getProgramPackageId();
      const url = m ? 'https://app.kejar.id/student/program-package/' + prog + '/list-subjects/' + m[1] + '/packages' : null;
      if (url) {
        Logger.info('Balik ke daftar paket: ' + prog);
        location.href = url;
      }
      return;
    }

    // Cek daftar paket
    if (!Array.isArray(window.questions) || !window.questions.length) {
      const isDaftarPaket = document.querySelector('.exercise-card, .panel-card-stats, .list-group-item-revamp-penilaian') || (location.href.includes('/packages') && !location.href.includes('/exercise')) || (location.href.includes('/activities') && !location.href.includes('/exercise'));
      if (isDaftarPaket) {
        await handleDaftarPaket();
        return;
      }
      Logger.warn('window.questions tidak ditemukan.');
      return;
    }

    const total = window.questions.length;
    Logger.info(total + ' soal • One Dark • auto 8 tipe');
    Logger.rule();

    let success = 0;
    while (true) {
      if (location.href.includes('/finish') || document.querySelector('button.next-activity-btn')) {
        break;
      }

      const idx = parseInt(window.questionKey) || 0;
      if (idx >= total) {
        Logger.info('Semua soal diproses — ' + success + '/' + total);
        for (let w = 0; w < 10; w++) {
          const fin = document.querySelector('.finish-question:not([style*="display: none"])') || document.getElementById('btn-next');
          if (fin && fin.offsetParent !== null && !fin.disabled) { clickButton(fin); break; }
          await sleep(300);
        }
        break;
      }

      const q = window.questions[idx];
      const supported = new Set(['MCQSA', 'CQ', 'TFQMA', 'MQIA', 'QSAT', 'LUQ', 'SSQ', 'MQ', 'CTQ', 'MFMQ']);
      if (!supported.has(q.type)) {
        Logger.warn('Soal ' + (idx + 1) + ' skip (' + q.type + ')');
        const btn = findNextButton();
        if (btn) { clickButton(btn); await sleep(800); continue; }
        break;
      }

      // header
      const labels = { MCQSA: 'PILIHAN GANDA', CQ: 'KOMPLEKS', TFQMA: 'BENAR/SALAH', MQIA: 'ISIAN', QSAT: 'SINGKAT', LUQ: 'KATA BAKU', SSQ: 'URUTKAN', MQ: 'JODOHKAN', CTQ: 'TABEL', MFMQ: 'BILANGAN' };
      console.log('%c SOAL ' + (idx + 1) + '/' + total + ' %c ' + (labels[q.type] || q.type) + ' %c ' + q.type + ' ', STYLE.tag(COLORS.successBg, COLORS.success), STYLE.tag(COLORS.infoBg, COLORS.info), STYLE.tag('rgba(92,99,112,0.3)', COLORS.foreground));

      let kunci = null;
      try { kunci = await extract(q); } catch (e) { Logger.error(e?.message || e); }

      const empty = kunci == null || (typeof kunci === 'string' && !kunci.trim()) || (Array.isArray(kunci) && !kunci.length) || (typeof kunci === 'object' && !Array.isArray(kunci) && !Object.keys(kunci).length);
      if (empty) {
        Logger.warn('Kunci tidak bocor, lewati');
        const btn = findNextButton();
        if (btn) { clickButton(btn); await sleep(700); continue; }
        break;
      }

      // display
      if (q.type === 'MCQSA') pMCQSA(q, kunci);
      else if (q.type === 'CQ') pCQ(q, kunci);
      else if (q.type === 'TFQMA') pTFQMA(q, kunci);
      else if (q.type === 'MQIA') pMQIA(q, kunci);
      else if (q.type === 'QSAT') pQSAT(q, kunci);
      else if (q.type === 'LUQ') pLUQ(q, kunci);
      else if (q.type === 'SSQ') pSSQ(q, kunci);
      else if (q.type === 'MQ') pMQ(q, kunci);
      else if (q.type === 'CTQ') pCTQ(q, kunci);
      else if (q.type === 'MFMQ') pMFMQ(q, kunci);

      // auto fill
      let filled = false;
      if (q.type === 'MCQSA') filled = fillMCQSA(q, kunci);
      else if (q.type === 'CQ') filled = fillCQ(q, kunci);
      else if (q.type === 'TFQMA') filled = fillTFQMA(q, kunci);
      else if (q.type === 'MQIA') filled = fillMQIA(q, kunci);
      else if (q.type === 'QSAT') filled = fillQSAT(q, kunci);
      else if (q.type === 'LUQ') filled = fillLUQ(q, kunci);
      else if (q.type === 'SSQ') filled = await fillSSQ(q, kunci);
      else if (q.type === 'MQ') filled = (await fillMQ(q, kunci)) > 0;
      else if (q.type === 'CTQ') filled = fillCTQ(q, kunci);
      else if (q.type === 'MFMQ') filled = fillMFMQ(q, kunci);

      Logger.info(filled ? 'Terisi ✓' : 'Gagal isi');
      await sleep(350);

      // auto click CEK / SELANJUTNYA / SELESAI
      const btn = findNextButton();
      if (!btn) { Logger.warn('Tombol tidak ketemu'); break; }

      const isLast = idx === total - 1;
      const isFinishBtn = btn.classList.contains('finish-question') || (btn.innerText || '').trim().toUpperCase().includes('SELESAI');
      clickButton(btn);
      await sleep(400);

      if (isFinishBtn) { success++; break; }

      if (isLast) {
        for (let w = 0; w < 10; w++) {
          const fin = document.querySelector('.finish-question:not([style*="display: none"])') || document.getElementById('btn-next');
          if (fin && fin.offsetParent !== null && !fin.disabled) { clickButton(fin); break; }
          await sleep(150);
        }
        success++;
        break;
      }

      const start = Date.now();
      while (Date.now() - start < 2500) {
        if (parseInt(window.questionKey) > idx) break;
        if (location.href.includes('/finish')) break;
        await sleep(80);
      }
      success++;
      Logger.rule();
      await sleep(200);
    }

    console.log('%c RINGKASAN %c ' + success + '/' + total + ' diproses ', STYLE.tag(COLORS.successBg, COLORS.success), `background:${COLORS.background};color:${COLORS.foreground};padding:4px 10px;border-radius:0 6px 6px 0;font-family:${FONT};font-size:11px;border:1px solid ${COLORS.border};border-left:none;`);
    Logger.rule();
    window.__RAZOR_DISPLAY_RUN = run;
  }

  window.__RAZOR_DISPLAY_RUN = run;

  // Fallback handler Lanjut Latihan (prevent ReferenceError)
  function handleLanjutLatihan() {
    const btn = document.querySelector('.next-activity-btn, [class*="next-activity-btn"]') || Array.from(document.querySelectorAll('button, a')).find((b) => (b.innerText || '').trim().toUpperCase() === 'LANJUT LATIHAN');
    if (btn && btn.offsetParent !== null) {
      Logger.click('LANJUT LATIHAN');
      try { btn.click(); } catch {}
      try { btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); } catch {}
    }
  }

  (async () => {
    for (let i = 0; i < 20; i++) {
      if (document.body.innerText.includes('Saya sudah selesai membaca')) { await handleReadingLoop(); break; }
      if (Array.isArray(window.questions) && window.questions.length) break;
      if (document.querySelector('.next-activity-btn, [class*="next-activity-btn"]')) break;
      if (document.querySelector('.exercise-card, .panel-card-stats, .list-group-item-revamp-penilaian')) break;
      if (location.href.includes('/packages') || location.href.includes('/activities') || location.href.includes('/finish')) break;
      await sleep(400);
    }
    await run();
  })();

  // keep watching — Tangani Tampermonkey inject pas halaman masih loading (konten fetch belakangan)
  let lastLanjutAt = 0;
  let lastReadingAt = 0;
  let readingLoopLock = false;
  try {
    const lanjutObserver = new MutationObserver(() => {
      if (!readingLoopLock && Date.now() - lastReadingAt > 2500 && document.body.innerText.includes('Saya sudah selesai membaca')) {
        const hasIndex = document.getElementById('review-checkbox-0') || document.querySelector('input[data-checkbox="0"]') || document.getElementById('next-button-0');
        const hasGeneric = !!document.querySelector('input[type="checkbox"]');
        if (hasIndex || hasGeneric) {
          lastReadingAt = Date.now();
          readingLoopLock = true;
          handleReadingLoop().finally(() => { readingLoopLock = false; lastReadingAt = Date.now(); });
        }
      }
      if (Date.now() - lastLanjutAt < 6000) return;
      const hasBtn = document.querySelector('.next-activity-btn, [class*="next-activity-btn"]') || Array.from(document.querySelectorAll('button, a')).some((b) => (b.innerText || '').trim().toUpperCase() === 'LANJUT LATIHAN');
      if (hasBtn && (location.href.includes('/packages') || location.href.includes('/finish') || location.href.includes('/activities'))) {
        const visible = hasBtn.offsetParent !== null || window.getComputedStyle(hasBtn).display !== 'none';
        if (visible) {
          lastLanjutAt = Date.now();
          handleLanjutLatihan();
        }
      }
    });
    lanjutObserver.observe(document.body, { childList: true, subtree: true });
  } catch {}
  // fallback polling untuk SPA navigation
  setInterval(() => {
    if (!readingLoopLock && Date.now() - lastReadingAt > 3500 && document.body.innerText.includes('Saya sudah selesai membaca')) {
      const hasIndex = document.getElementById('review-checkbox-0') || document.querySelector('input[data-checkbox="0"]');
      if (hasIndex) { lastReadingAt = Date.now(); readingLoopLock = true; handleReadingLoop().finally(() => { readingLoopLock = false; lastReadingAt = Date.now(); }); return; }
      const cb = document.querySelector('input[type="checkbox"]');
      if (cb && !cb.checked) { lastReadingAt = Date.now(); readingLoopLock = true; handleReadingLoop().finally(() => { readingLoopLock = false; lastReadingAt = Date.now(); }); return; }
    }
    if (Date.now() - lastLanjutAt < 8000) return;
    const btn = document.querySelector('.next-activity-btn, [class*="next-activity-btn"]') || Array.from(document.querySelectorAll('button, a')).find((b) => (b.innerText || '').trim().toUpperCase() === 'LANJUT LATIHAN');
    if (btn && (btn.offsetParent !== null || window.getComputedStyle(btn).display !== 'none') && (location.href.includes('/packages') || location.href.includes('/finish'))) {
      lastLanjutAt = Date.now();
      handleLanjutLatihan();
    }
  }, 2000);
})();
