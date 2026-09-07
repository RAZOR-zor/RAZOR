
(async function() {
  console.clear();
  if (window.__RAZOR_ME) return;
  window.__RAZOR_ME = true;

  const FONT = "'JetBrains Mono','Cascadia Code','Consolas','SF Mono',monospace";
  const ST = {
    tag: (bg, fg) => `background:${bg};color:${fg};padding:1px 7px;border-radius:3px;font-family:${FONT};font-size:11px;font-weight:800;`,
    txt: (fg) => `font-family:${FONT};font-size:11px;color:${fg};`,
    dim: `color:#1E293B;font-family:${FONT};font-size:10px;`
  };
  const CLR = {
    ok: '#22C55E', okTxt: '#86EFAC', okBg: 'rgba(34,197,94,0.12)',
    warn: '#FBBF24', warnBg: 'rgba(251,191,36,0.12)',
    err: '#EF4444', errBg: 'rgba(239,68,68,0.12)',
    info: '#38BDF8', infoBg: 'rgba(56,189,248,0.12)',
    dim2: '#94A3B8'
  };
  const LOG = {
    brand:  (m) => console.log('%c RAZOR %c ' + m + ' ',
              `background:linear-gradient(135deg,#22C55E,#4ADE80);color:#052E16;font-weight:900;padding:5px 12px;border-radius:6px 0 0 6px;font-family:${FONT};font-size:12px;letter-spacing:1px;`,
              `background:#0F172A;color:#F8FAFC;padding:5px 12px;border-radius:0 6px 6px 0;font-family:${FONT};font-size:12px;border:1px solid #334155;border-left:none;`),
    ok:     (m) => console.log('%c ✔ %c ' + m, ST.tag(CLR.okBg, CLR.ok), ST.txt(CLR.okTxt)),
    act:    (m) => console.log('%c › %c ' + m, ST.tag('rgba(148,163,184,0.10)', '#7A8699'), ST.txt('#8B96A8')),
    warn:   (m) => console.log('%c ⚠ %c ' + m, ST.tag(CLR.warnBg, CLR.warn), ST.txt(CLR.warn)),
    err:    (m) => console.log('%c ✖ %c ' + m, ST.tag(CLR.errBg, CLR.err), ST.txt(CLR.err)),
    info:   (m) => console.log('%c ℹ %c ' + m, ST.tag(CLR.infoBg, CLR.info), ST.txt(CLR.info)),
    dim:    (m) => console.log('%c' + m, ST.txt(CLR.dim2)),
    rule:   ()  => console.log('%c' + '─'.repeat(56), ST.dim)
  };

  console.log('');
  LOG.brand('AUTO ANSWER');
  LOG.rule();

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const url   = location.href;

  function isiInput(el, txt) {
    if (!el) return;
    el.removeAttribute('readonly');
    el.focus();
    try {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const s = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (s) s.call(el, txt);
      else el.value = txt;
    } catch(e) { el.value = txt; }
    ['input', 'change', 'keyup', 'keydown'].forEach(ev => el.dispatchEvent(new Event(ev, { bubbles: true })));
    if (typeof $ !== 'undefined') $(el).trigger('change');
  }

  // ══════════════════════════════════════════════
  //  Cari soal visible
  // ══════════════════════════════════════════════
  function getVisible() {
    return [...document.querySelectorAll('.question-item, .question-group')].find(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && el.offsetParent !== null;
    });
  }

  // ══════════════════════════════════════════════
  //  Tunggu soal berikutnya
  // ══════════════════════════════════════════════
  function waitForNext(currentId) {
    return new Promise(resolve => {
      const t = setInterval(() => {
        const v = getVisible();
        if (!v || v.dataset.id !== currentId) {
          clearInterval(t);
          resolve();
        }
      }, 100);
    });
  }

  // ══════════════════════════════════════════════
  //  MODE 0 — HALAMAN HASIL (close)
  // ══════════════════════════════════════════════
  const closeBtn = document.querySelector('i.kejar-close.close-position');
  if (closeBtn) {
    LOG.info('Mode: HASIL — close diklik');
    setTimeout(() => {
      try { closeBtn.click(); LOG.ok('Close diklik — balik ke daftar ronde'); } catch(e) {}
    }, 800);
    return;
  }

  // ══════════════════════════════════════════════
  //  MODE 1A — BILANGAN GAME (level 1-6)
  // ══════════════════════════════════════════════
  const isBilangan = /\/games\/bilangan_level_\d+\//i.test(url);
  const hasBodyQuestion = document.querySelector('[id^="body-question-"]');

  if (isBilangan && hasBodyQuestion) {
    LOG.info('Mode: BILANGAN GAME');

    const urlMatch = url.match(/\/games\/([^/]+)\/stages\/([^/]+)\/rounds\/([^/]+)\//);
    const game = urlMatch[1];
    const stageId = urlMatch[2];
    const roundId = urlMatch[3];
    const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
    const questions = window.question;

    if (!questions || !Array.isArray(questions)) { LOG.err('window.question tidak ditemukan'); return; }
    LOG.info(questions.length + ' soal — proses satu per satu');

    function getBilanganVisible() {
      const all = document.querySelectorAll('[id^="body-question-"]');
      for (const el of all) {
        if (!el.classList.contains('d-none')) {
          const m = el.id.match(/body-question-(\d+)/);
          return m ? { el, idx: parseInt(m[1]) } : null;
        }
      }
      return null;
    }

    function waitForNextBilangan(currentIdx) {
      return new Promise(resolve => {
        const t = setInterval(() => {
          const v = getBilanganVisible();
          if (!v || v.idx !== currentIdx) { clearInterval(t); resolve(); }
        }, 30);
      });
    }

    async function fetchBilanganKunci(taskId, answerId, qType, wrongAnswer) {
      const checkUrl = `/student/games/${game}/stages/${stageId}/rounds/${roundId}/question-type`;
      let body;
      if (qType === 'MCQSA') {
        body = `_token=${encodeURIComponent(token)}&taskId=${encodeURIComponent(taskId)}&answerId=${encodeURIComponent(answerId)}&answer=${encodeURIComponent(wrongAnswer)}&questionType=${encodeURIComponent(qType)}&multipleAnswer=false`;
      } else {
        body = `_token=${encodeURIComponent(token)}&taskId=${encodeURIComponent(taskId)}&answerId=${encodeURIComponent(answerId)}&answer%5B%5D=zzz&questionType=${encodeURIComponent(qType)}&multipleAnswer=true`;
      }
      try {
        const res = await fetch(checkUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': token },
          body: body,
          credentials: 'include'
        });
        const d = await res.json();
        if (d.taskDetail && d.taskDetail.correct_answer) {
          const ca = d.taskDetail.correct_answer;
          return Array.isArray(ca) ? ca[0] : ca;
        }
        return null;
      } catch(e) { return null; }
    }

    let solved = 0;

    async function prosesBilangan() {
      const visible = getBilanganVisible();
      if (!visible) {
        LOG.brand('SEMUA SOAL SELESAI — ' + solved + '/' + questions.length);
        for (let i = 0; i < 48; i++) {
          await sleep(250);
          const close = document.querySelector('i.kejar-close.close-position');
          if (close) { close.click(); LOG.ok('Close diklik'); break; }
        }
        return;
      }

      const { el, idx } = visible;
      const q = questions[idx];
      const btn = el.querySelector('.check-and-set-question');
      const taskId = q.task_id || btn?.getAttribute('data-task-id') || q.id;
      const answerId = q.id;
      const qType = q.type || btn?.getAttribute('data-type') || 'MQIA';

      LOG.act('Soal ' + (idx + 1) + ': ' + qType);

      let ok = false;

      if (qType === 'MFMQ') {
        const ca = q.correct_answer;
        if (ca) {
          const vals = ca.filter(v => v !== null);
          const inputs = [...el.querySelectorAll('.answer-input')].filter(inp => {
            return inp.offsetParent !== null && !inp.closest('.d-none');
          });
          inputs.forEach((inp, i) => {
            if (vals[i] !== undefined) isiInput(inp, String(vals[i]));
          });
          ok = true;
          LOG.ok('Soal ' + (idx + 1) + ' ✔ "' + vals.join('/') + '"');
        }
      } else {
        let wrongAnswer = qType === 'MCQSA' ? 'A' : 'zzz';
        let kunci = await fetchBilanganKunci(taskId, answerId, qType, wrongAnswer);
        if (!kunci) {
          wrongAnswer = qType === 'MCQSA' ? 'B' : 'zzz2';
          kunci = await fetchBilanganKunci(taskId, answerId, qType, wrongAnswer);
        }
        if (kunci) {
          solved++;
          if (qType === 'MCQSA') {
            const choice = el.querySelector(`.choices-check[data-key="${kunci.toLowerCase()}"]`);
            if (choice) choice.click();
          } else {
            const input = el.querySelector('.answer-input');
            if (input) isiInput(input, String(kunci));
          }
          ok = true;
          LOG.ok('Soal ' + (idx + 1) + ' ✔ "' + String(kunci).slice(0, 40) + '"');
        }
      }

      if (!ok) LOG.err('Soal ' + (idx + 1) + ': gagal');

      await sleep(30);
      if (btn) btn.click();
      await waitForNextBilangan(idx);
      await prosesBilangan();
    }

    await prosesBilangan();
    return;
  }

  // ══════════════════════════════════════════════
  //  MODE 1 — HALAMAN EXAM (ada form soal)
  // ══════════════════════════════════════════════
  const form = document.querySelector('form[data-check]');
  if (form && form.dataset.check) {
    const NAMA_GAME = {
      menulisefektif: 'Menulis Efektif',
      vocabulary: 'Vocabulary',
      toeicwords: 'TOEIC Words',
      toeic_reading_preparation: 'TOEIC Reading Preparations',
      operasibilanganriil: 'Operasi Bilangan Riil',
      katabaku: 'Kata Baku',
      soalcerita: 'Soal Cerita',
      geometri_pengukuran: 'Geometri Pengukuran',
      kemampuan_numerik: 'Kemampuan Numerik',
      kemampuan_verbal: 'Kemampuan Verbal',
      kemampuan_penalaran: 'Kemampuan Penalaran'
    };
    const mGame = location.href.match(/\/games\/([a-z0-9_]+)\//i);
    const gameKey = mGame ? mGame[1].toLowerCase() : '';
    const namaGame = NAMA_GAME[gameKey] || gameKey || 'Game';
    const useArrayAnswer = ['soalcerita', 'geometri_pengukuran'].includes(gameKey);
    LOG.info('Mode: EXAM [' + namaGame + ']');

    const checkUrl = form.dataset.check;
    const taskId   = form.dataset.task;
    const token    = form.querySelector('input[name="_token"]')?.value
                  || document.querySelector('meta[name="csrf-token"]')?.content;
    const totalSoal = form.querySelectorAll('.question-item, .question-group').length;
    LOG.info(totalSoal + ' soal — proses satu per satu');

    // ══════════════════════════════════════════════
    //  Fungsi: fetch jawaban dari API
    // ══════════════════════════════════════════════
    function getQType(item) {
      const isRadio = !!item.querySelector('input[type="radio"]');
      const isCheck = !!item.querySelector('input[type="checkbox"]');
      if (isRadio) return 'pg';
      if (isCheck) return 'checkbox';
      return 'isian_matematika';
    }

    async function fetchKunci(qid, wrongAnswer, item) {
      try {
        const inputCount = item.querySelectorAll('.answer-input, input[type="text"], input[type="number"], textarea').length || 1;
        let body;
        if (useArrayAnswer) {
          const p = new URLSearchParams();
          p.append('_token', token);
          p.append('id', qid);
          p.append('task_id', taskId);
          for (let i = 0; i < inputCount; i++) p.append('answer[]', wrongAnswer);
          p.append('repeatance', false);
          p.append('type', getQType(item));
          body = p.toString();
        } else {
          body = new URLSearchParams({
            _token: token, id: qid, task_id: taskId,
            answer: wrongAnswer, repeatance: 'false'
          }).toString();
        }

        const res = await fetch(checkUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: body,
          credentials: 'include'
        });
        const d = await res.json();
        // Return array lengkap: ["3", "160"] atau string "5"
        return d.answer;
      } catch(e) {
        return null;
      }
    }

    // ══════════════════════════════════════════════
    //  Proses satu per satu: fetch → fill → CEK → LANJUT
    // ══════════════════════════════════════════════
    let solved = 0;

    async function prosesSoal() {
      const visible = getVisible();
      if (!visible) {
        LOG.brand('SEMUA SOAL SELESAI — ' + solved + '/' + totalSoal + ' benar');
        // Tunggu halaman hasil
        for (let i = 0; i < 48; i++) {
          await sleep(250);
          const close = document.querySelector('i.kejar-close.close-position');
          if (close) { close.click(); LOG.ok('Close diklik'); break; }
        }
        return;
      }

      const qid = visible.dataset.id;
      const adaRadio = !!visible.querySelector('input[type="radio"]');
      const wrongAnswer = adaRadio ? 'A' : 'zzz salah';

      // 1. Fetch kunci
      let kunci = await fetchKunci(qid, wrongAnswer, visible);
      if (!kunci) {
        const kunci2 = await fetchKunci(qid, adaRadio ? 'B' : 'zzz salah dua', visible);
        if (kunci2) kunci = kunci2;
      }
      await sleep(50);

      if (kunci) {
        solved++;
        LOG.ok('Soal ' + solved + ' ✔ "' + String(kunci).slice(0, 40) + '…"');

        // 2. Fill jawaban
        const isRadio = !!visible.querySelector('input[type="radio"]');
        const isCheck = !!visible.querySelector('input[type="checkbox"]');

        if (isRadio) {
          const radio = visible.querySelector('input[type="radio"][value="' + CSS.escape(kunci) + '"]');
          if (radio) {
            radio.click();
            radio.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else if (isCheck) {
          const labels = visible.querySelectorAll('label');
          const jawabArr = Array.isArray(kunci) ? kunci : String(kunci).split(',').map(s => s.trim().toUpperCase());
          for (const lbl of labels) {
            const m = lbl.textContent.trim().match(/^([A-Z])[\.\)]\s*/);
            if (m && jawabArr.includes(m[1])) lbl.click();
          }
        } else {
          // Isi semua input/textarea — handle array (multi-input) atau string
          const allInputs = visible.querySelectorAll('.answer-input, input[type="text"], input[type="number"], textarea');
          const jawabArr = Array.isArray(kunci) ? kunci : [kunci];
          allInputs.forEach((inp, idx) => {
            const val = jawabArr[idx] !== undefined ? jawabArr[idx] : jawabArr[0];
            if (val !== undefined && val !== null) isiInput(inp, String(val));
          });
        }
        await sleep(100);
      } else {
        LOG.err('Soal: kunci gak bocor — skip');
      }

      // 3. Klik tombol aksi utama (CEK / JAWABAN / SUBMIT / KIRIM / dst)
      const semuaBtn = [...visible.querySelectorAll('button, .btn, input[type="button"], a.btn')];
      const btnCek = semuaBtn.find(el => {
        const t = (el.innerText || el.value || '').toUpperCase();
        return t.includes('CEK') || t.includes('JAWABAN') || t.includes('SUBMIT') || t.includes('KIRIM') || t.includes('CHECK');
      }) || semuaBtn.find(el => el.offsetParent !== null && !el.disabled);

      if (btnCek) {
        const label = (btnCek.innerText || btnCek.value || '').trim();
        btnCek.click();
        LOG.act('Tombol diklik: ' + label);
      }

      await sleep(50);

      // 4. Tunggu & klik tombol lanjut
      let btnLanjut = null;
      for (let w = 0; w < 30; w++) {
        btnLanjut = [...document.querySelectorAll('button, .btn, a.btn')].find(el => {
          const t = (el.innerText || '').toUpperCase();
          return (t.includes('LANJUT') || t.includes('NEXT') || t.includes('SELESAI')) && el.offsetParent !== null;
        });
        if (btnLanjut) break;
        await sleep(50);
      }
      if (btnLanjut) {
        btnLanjut.click();
        LOG.act('Lanjut diklik');
      }

      // 5. Tunggu soal berikutnya
      await waitForNext(qid);
      await sleep(100);

      // 6. Proses soal berikutnya
      await prosesSoal();
    }

    await prosesSoal();
    return;
  }

  // ══════════════════════════════════════════════
  //  MODE 2 — ONBOARDING (klik MULAI)
  // ══════════════════════════════════════════════
  if (url.includes('/onboardings')) {
    LOG.info('Mode: ONBOARDING');
    for (let i = 0; i < 10; i++) {
      const btn = Array.from(document.querySelectorAll('button, a'))
        .find(b => (b.innerText || '').trim().toLowerCase() === 'mulai');
      if (btn) {
        LOG.act('MULAI diklik');
        btn.click();
        return;
      }
      await sleep(400);
    }
    LOG.warn('Tombol MULAI gak ketemu');
    return;
  }

  // ══════════════════════════════════════════════
  //  MODE 3 — DAFTAR RONDE (bintang < 3 → kerjakan)
  // ══════════════════════════════════════════════
  if (url.includes('/rounds') && !url.includes('/exams') && !url.includes('/onboardings')) {
    LOG.info('Mode: DAFTAR RONDE');
    for (let t = 0; t < 10; t++) {
      const rounds = Array.from(document.querySelectorAll('a[href*="/rounds/"]'));
      if (rounds.length) {
        let target = null;
        for (const r of rounds) {
          const bintang = r.querySelectorAll('svg.fill-yellow').length;
          const judul = (r.querySelector('h4, h3, [class*="title"]')?.innerText || r.innerText).trim().split('\n')[0];
          if (bintang < 3) {
            LOG.act('Ronde: "' + judul + '" (' + bintang + '★) — dikerjakan');
            target = r;
            break;
          } else {
            LOG.dim('Skip: "' + judul + '" (3★)');
          }
        }
        if (target) { target.click(); return; }
        LOG.brand('SEMUA RONDE 3★ — BABAK INI BERES');
        console.log('__SOAL_ALL_DONE__');
        return;
      }
      await sleep(400);
    }
    LOG.warn('Daftar ronde gak ketemu');
    return;
  }

  // ══════════════════════════════════════════════
  //  MODE 4 — DAFTAR BABAK (buka babak berikutnya)
  // ══════════════════════════════════════════════
  if (/\/stages\/?$/.test(url)) {
    LOG.info('Mode: DAFTAR BABAK');
    for (let t = 0; t < 10; t++) {
      const babaks = Array.from(document.querySelectorAll('a[href*="/rounds"]'));
      if (babaks.length) {
        const idx = parseInt(sessionStorage.getItem('ME_BABAK_IDX') || '0');
        if (idx >= babaks.length) {
          sessionStorage.removeItem('ME_BABAK_IDX');
          LOG.brand('SEMUA BABAK SELESAI');
          return;
        }
        const judul = (babaks[idx].querySelector('h4')?.innerText || '').trim();
        LOG.act('Babak ' + (idx + 1) + ': "' + judul + '" — dibuka');
        babaks[idx].click();
        return;
      }
      await sleep(400);
    }
    LOG.warn('Daftar babak gak ketemu');
    return;
  }

  LOG.warn('Halaman gak dikenali');
})();
