(function() {
    'use strict';

    // ==========================================
    // PROGRESS REPORTING
    // ==========================================
    const reportJurnalProgress = (data) => {
        try {
            const progressData = { type: 'jurnal', ...data };
            window.dispatchEvent(
                new CustomEvent('soal-jurnal-progress', {
                    detail: progressData
                })
            );
            console.debug('[SOAL-PROGRESS]', progressData);
        } catch(e) {}
    };

    let scriptSudahSelesai = false;

    // =========================================================================
    // CONFIGURATION 1: SETTING HARI PELAKSANAAN KEGIATAN MINGGUAN
    // =========================================================================
    const SETTING_HARI_KEGIATAN = {
        'sholat jumat': 'Jm',
        'puasa sunnah': 'Sn',
        'tadabur': 'Km',
        'infaq': 'Jm',
        'olah napas': 'Km',
        'aktivitas fisik': 'Sb',
        'kuku': 'Sb',
        'sarapan': 'Jm',
        'ekstrakurikuler': 'Jm',
        'seni budaya': 'Rb',
        'bimbingan konseling': 'Km',
        'mencuci baju': 'Sb',
        'membantu memasak': 'Sb',
        'membersihkan rumah': 'Sb',
        'daur ulang': 'Rb',
        'kumpul rayon': 'Jm',
        'leadership': 'Sl',
        'piket rayon': 'Sn',
    };

    // =========================================================================
    // CONFIGURATION 2: SETTING SAKSI PER KEGIATAN MINGGUAN
    // =========================================================================
    const SETTING_SAKSI = {
        'sholat jumat': { tipe: 'FRIEND', nama: 'ardi' },
        'puasa sunnah': { tipe: 'PARENT', nama: '' },
        'tadabur': { tipe: 'FRIEND', nama: 'ardi' },
        'infaq': { tipe: 'FRIEND', nama: 'ardi' },
        'olah napas': { tipe: 'FRIEND', nama: 'ardi' },
        'aktivitas fisik': { tipe: 'PARENT', nama: '' },
        'kuku': { tipe: 'PARENT', nama: '' },
        'sarapan': { tipe: 'FRIEND', nama: 'ardi' },
        'ekstrakurikuler': { tipe: 'FRIEND', nama: 'ajmal' },
        'seni budaya': { tipe: 'FRIEND', nama: 'ajmal' },
        'bimbingan konseling': { tipe: 'FRIEND', nama: 'ardi' },
        'mencuci baju': { tipe: 'PARENT', nama: '' },
        'membantu memasak': { tipe: 'PARENT', nama: '' },
        'membersihkan rumah': { tipe: 'PARENT', nama: '' },
        'daur ulang': { tipe: 'PARENT', nama: '' },
        'kumpul rayon': { tipe: 'FRIEND', nama: 'nandio' },
        'leadership': { tipe: 'FRIEND', nama: 'nazril' },
        'piket rayon': { tipe: 'FRIEND', nama: 'nandio' },
    };

    // ==========================================
    // TAMPILAN CONSOLE — CLEAN / MINIMAL
    // ==========================================
    const C = {
        logo: [
            'color:#00d9ff',
            'font-size:12px',
            'font-weight:700',
            'font-family:monospace',
            'line-height:1.15',
            'letter-spacing:0'
        ].join(';'),

        title: [
            'color:#00d9ff',
            'font-size:16px',
            'font-weight:800',
            'font-family:system-ui,sans-serif',
            'letter-spacing:.4px'
        ].join(';'),

        subtitle: [
            'color:#94a3b8',
            'font-size:11px',
            'font-family:system-ui,sans-serif'
        ].join(';'),

        section: [
            'background:#0f172a',
            'color:#38bdf8',
            'padding:5px 10px',
            'border-radius:6px',
            'border:1px solid #164e63',
            'font-family:system-ui,sans-serif',
            'font-size:12px',
            'font-weight:700'
        ].join(';'),

        infoLabel: [
            'color:#94a3b8',
            'font-family:system-ui,sans-serif',
            'font-size:12px'
        ].join(';'),

        infoValue: [
            'color:#e0f2fe',
            'font-family:system-ui,sans-serif',
            'font-size:12px',
            'font-weight:700'
        ].join(';'),

        action: [
            'color:#60a5fa',
            'font-family:system-ui,sans-serif',
            'font-size:12px'
        ].join(';'),

        success: [
            'color:#22d3ee',
            'font-family:system-ui,sans-serif',
            'font-size:12px',
            'font-weight:700'
        ].join(';'),

        warning: [
            'color:#fbbf24',
            'font-family:system-ui,sans-serif',
            'font-size:12px'
        ].join(';'),

        error: [
            'color:#f87171',
            'font-family:system-ui,sans-serif',
            'font-size:12px',
            'font-weight:700'
        ].join(';'),

        muted: [
            'color:#64748b',
            'font-family:system-ui,sans-serif',
            'font-size:11px'
        ].join(';'),

        progressFill: [
            'color:#22d3ee',
            'font-family:monospace',
            'font-size:13px',
            'font-weight:700'
        ].join(';'),

        progressEmpty: [
            'color:#334155',
            'font-family:monospace',
            'font-size:13px'
        ].join(';')
    };

    const LOGO = [
        '▄▄▄▄▄▄▄▄▄▄    ▄▄▄▄▄▄▄▄▄    ▄▄▄▄▄▄▄▄▄▄    ▄▄▄▄▄▄▄▄▄    ▄▄▄▄▄▄▄▄▄▄  ',
        '███▓┌─ ███▓┐ ███▓┌─ ███▓┐ ▓███┌─ ▓███│ ▄▓█▓┌─ ███▓┐ ███▓┌─ ███▓┐',
        '████▄▄▄██▀┌┘ ███▓│▄▄████│  ▄▄▄▄▄▄██▓ ┘ ███▓│  ████│ ████▄▄▄██▀┌┘',
        '███▓┌─ ███▄┐ ███▓├─ ████│ ▓███┌─ ▄▄▄▄┐ ███▓│  ███▓│ ███▓┌─ ███▄┐',
        '▓███│  ███▓│ ▓██▓│  ▓██▓│ ████▄▄▄███▓│ └▓██▄▄▄█▓┌─┘ ▓███│  ███▓│',
        ' ───┘   ───┘  ───┘   ───┘  ──────────┘   ───────┘    ───┘   ───┘'
    ];

    // ==========================================
    // CONSOLE HEADER & UTILS
    // ==========================================
    const cetakBanner = () => {
        console.clear();
        console.info('%c' + LOGO.join('\n'), C.logo);
        console.info('');
        console.info('%cAKSARA %c• JURNAL AUTOMATION', C.title, C.subtitle);
        console.info('%cOtomatisasi pengisian jurnal harian & mingguan', C.subtitle);
        console.info('');
        console.info('%cTotal Hari%c  7    %cMulai%c  1', C.infoLabel, C.infoValue, C.infoLabel, C.infoValue);
        console.info('');
    };

    const seksi = (judul, sub = '') => {
        console.info('%c %s %c %s', C.section, judul, C.subtitle, sub);
    };

    const barisAksi = (teks) => console.info('%c▶  %s', C.action, teks);
    const barisSukses = (teks) => console.info('%c✓  %s', C.success, teks);
    const barisWarn = (teks) => console.warn('%c⚠  %s', C.warning, teks);
    const barisError = (teks) => console.error('%c✕  %s', C.error, teks);

    const garisKecil = () => console.info('%c· · · · · · · · · · · · · · · · · · · ·', C.muted);
    const cetakGaris = garisKecil;

    const cetakBarProgres = (label, selesai, total) => {
        const lebar = 24;
        const persen = Math.max(0, Math.min(100, Math.round((selesai / total) * 100)));
        const isi = Math.round((persen / 100) * lebar);
        const filled = '━'.repeat(isi);
        const empty = '─'.repeat(lebar - isi);

        console.info('%c%s%c  %c%s%c%c%s%c  %c%s',
            C.infoLabel, label,
            C.muted,
            C.progressFill, filled,
            C.progressFill,
            C.progressEmpty, empty,
            C.muted,
            C.infoValue, persen + '%'
        );
        console.info('%c   %s / %s hari', C.subtitle, selesai, total);
    };

    const delay = ms => new Promise(r => setTimeout(r, ms));

    function getPageType() {
        const path = window.location.pathname;
        if (path.includes('/journal') || path.includes('/jurnal') || document.querySelector('.daily-habit-edit-button') || document.querySelector('table')) {
            return 'journal';
        }
        return 'unknown';
    }

    const triggerPilihanTigaKali = async (radioId, labelSelector) => {
        const radio = document.getElementById(radioId);
        const label = document.querySelector(labelSelector);
        if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event('input', { bubbles: true }));
            radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (label) label.click();
    };

    const triggerPilihanSaksiBerdasarkanKode = async (kodeInggris) => {
        const kamusTeks = { 'PARENT': 'Orang Tua', 'TEACHER': 'Guru', 'FRIEND': 'Teman' };
        const teksIndonesia = kamusTeks[kodeInggris] || 'Orang Tua';
        const fallbackId = `witness-type-${kodeInggris}`;
        const radioInternal = document.getElementById(fallbackId) || document.querySelector(`input[value="${kodeInggris}"]`);
        
        if (radioInternal) {
            radioInternal.checked = true;
            radioInternal.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const semuaElemen = Array.from(document.querySelectorAll('button, label, div, span, .btn'));
        const tombolKetemu = semuaElemen.find(el => el.textContent.trim().toLowerCase() === teksIndonesia.toLowerCase());
        
        if (tombolKetemu) {
            tombolKetemu.click();
        } else {
            await triggerPilihanTigaKali(fallbackId, `label[for="${fallbackId}"]`);
        }
    };

    const triggerPilihanHariBerdasarkanTeks = async (inisialHari) => {
        const semuaTombolHari = Array.from(document.querySelectorAll('button, label, div, span, .btn'));
        const tombolHariKetemu = semuaTombolHari.find(el => el.textContent.trim() === inisialHari);
        if (tombolHariKetemu) {
            tombolHariKetemu.click();
            const inputHari = tombolHariKetemu.querySelector('input') || tombolHariKetemu.parentElement.querySelector('input');
            if (inputHari) {
                inputHari.checked = true;
                inputHari.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    };

    const ketikNamaSaksiLengkap = async (teks) => {
        const input = document.querySelector('.witness-name-input input') || document.querySelector('input.witness-name-weekly');
        if (!input) return;
        input.focus();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        if (setter) setter.call(input, teks); else input.value = teks;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
    };

    const eksekusiSimpanMingguan = async (kegiatanNama) => {
        const tombolSimpan = document.getElementById('buttonCreateWeekly') || document.querySelector('.button-create-weekly button');
        if (tombolSimpan) {
            tombolSimpan.removeAttribute('disabled');
            tombolSimpan.classList.remove('btn-primary-disable');
            tombolSimpan.click();
        }
    };

    const dapatkanTombolIsiMingguan = (keyword) => {
        const barisTabel = Array.from(document.querySelectorAll('table tbody tr, .table tbody tr'));
        const barisKetemu = barisTabel.find(tr => tr.children[0]?.textContent.trim().toLowerCase().includes(keyword.toLowerCase()));
        return barisKetemu ? barisKetemu.querySelector('a.habit-weekly, a') : null;
    };

    const prosesKegiatanMingguanBiasa = async (keyword, labelNama) => {
        if (scriptSudahSelesai) return;
        const tombol = dapatkanTombolIsiMingguan(keyword);
        if (tombol) {
            barisAksi('Mengisi: ' + labelNama);
            tombol.click();
            await delay(50);
            
            await triggerPilihanTigaKali('detailType-doing', 'label.detailType-doing');
            const hariTarget = SETTING_HARI_KEGIATAN[keyword] || 'Sn';
            await triggerPilihanHariBerdasarkanTeks(hariTarget);
            
            const configSaksi = SETTING_SAKSI[keyword] || { tipe: 'PARENT', nama: '' };
            await triggerPilihanSaksiBerdasarkanKode(configSaksi.tipe);
            await ketikNamaSaksiLengkap(configSaksi.nama);
            
            await eksekusiSimpanMingguan(labelNama);
            barisSukses(labelNama + ' selesai ✓');
            await delay(50); 
        }
    };

    const prosesKegiatanTidakMelaksanakan = async (keyword, labelNama) => {
        if (scriptSudahSelesai) return;
        const tombol = dapatkanTombolIsiMingguan(keyword);
        if (tombol) {
            barisAksi('Mengisi: ' + labelNama + ' (tidak melaksanakan)');
            tombol.click();
            await delay(50);

            const labelTidak = document.querySelector('label.detailType-undone') || 
                               document.querySelector('label.detailType-not_doing') || 
                               Array.from(document.querySelectorAll('label')).find(el => {
                                   const txt = el.textContent.replace(/\s+/g, ' ').trim();
                                   return txt.includes('(0)') || txt.toLowerCase().includes('tidak melaksanakan');
                               });

            if (labelTidak) {
                const targetId = labelTidak.getAttribute('for');
                const radioInput = targetId ? document.getElementById(targetId) : labelTidak.querySelector('input[type="radio"]');

                labelTidak.click();

                if (radioInput) {
                    radioInput.checked = true;
                    radioInput.dispatchEvent(new Event('input', { bubbles: true }));
                    radioInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            } else {
                const radioTidak = document.getElementById('detailType-not_doing') || document.querySelector('input[value="NOT_DOING"]');
                if (radioTidak) {
                    radioTidak.checked = true;
                    radioTidak.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            await delay(30);
            const tombolSimpan = document.getElementById('buttonCreateWeekly') || document.querySelector('.button-create-weekly button');
            if (tombolSimpan) {
                tombolSimpan.removeAttribute('disabled');
                tombolSimpan.classList.remove('btn-primary-disable', 'disabled');
                tombolSimpan.click();
            }
            barisSukses(labelNama + ' selesai ✓');
            await delay(50);
        }
    };

    async function mulaiMengeksekusiJurnalMingguan() {
        if (scriptSudahSelesai) return;
        cetakGaris();
        seksi('MINGGUAN', 'Kegiatan & Latihan');
        reportJurnalProgress({ status: 'weekly', text: 'Mengisi jurnal mingguan...' });

        await prosesKegiatanMingguanBiasa('sholat jumat', 'Sholat Jumat');
        await prosesKegiatanTidakMelaksanakan('puasa sunnah', 'Puasa Sunnah');

        await prosesKegiatanTidakMelaksanakan('latihan literasi', 'Latihan Literasi (AKM/TKA)');
        await prosesKegiatanTidakMelaksanakan('latihan numerasi', 'Latihan Numerasi (AKM/TKA)');
        await prosesKegiatanTidakMelaksanakan('latihan b. inggris', 'Latihan B. Inggris (TOEIC/TKA)');

        const listMingguan = [
            ['tadabur', 'Tadabur Alquran'], ['infaq', 'Berinfaq'], ['olah napas', 'Olah Napas'],
            ['aktivitas fisik', 'Aktivitas Fisik'], ['kuku', 'Potong Kuku'], ['sarapan', 'Sarapan'],
            ['ekstrakurikuler', 'Ekstrakurikuler'], ['seni budaya', 'Seni Budaya'], ['bimbingan konseling', 'BK'],
            ['mencuci baju', 'Cuci Baju'], ['membantu memasak', 'Bantu Memasak'], ['membersihkan rumah', 'Bersih Rumah'],
            ['daur ulang', 'Daur Ulang'], ['kumpul rayon', 'Kumpul Rayon'], ['leadership', 'Leadership'], ['piket rayon', 'Piket Rayon']
        ];

        for (const item of listMingguan) {
            await prosesKegiatanMingguanBiasa(item[0], item[1]);
        }

        cetakGaris();
        seksi('SYSTEM', 'Semua Jurnal Selesai Diproses');
        reportJurnalProgress({ status: 'complete', text: '✓ Jurnal selesai' });
        console.debug('[SOAL-JURNAL-DONE]');
        scriptSudahSelesai = true; 
    }

    // ==========================================
    // SEKSI DROPDOWN HARIAN TURBO
    // ==========================================
    const targetDropdownHabits = [
        "Sholat Dhuha", "Mengaji atau tilawah Alquran", "Tidur sebelum pukul 22.00",
        "Bangun Sebelum Pukul 05.00", "Makan gizi seimbang", "Minum Air Putih", 
        "Peregangan", "Grooming Diri", "Aktif dalam Kelompok Belajar", "Berbincang dengan Anggota Keluarga",
        "Tumbler", "Membersihkan dan merapikan meja", "Memilah sampah"
    ];

    async function prosesDropdownBagianBawah(indeksHari, semuaBarisTabel) {
        if (scriptSudahSelesai) return;
        
        for (const row of semuaBarisTabel) {
            const firstCell = row.querySelector('td, th');
            if (!firstCell) continue;
            const habitName = firstCell.textContent.trim();
            
            if (targetDropdownHabits.some(target => habitName.includes(target))) {
                barisAksi('Dropdown: ' + habitName);
                const cells = row.querySelectorAll('td');
                
                for (const cell of cells) {
                    if (cell.textContent.trim().toLowerCase().includes('isi') && !cell.classList.contains('cursor-not-allowed')) {
                        const container = cell.querySelector('.dropdown') || cell;
                        const toggleBtn = container.querySelector('[data-toggle="dropdown"]') || container.querySelector('a, button, span');
                        if (toggleBtn) {
                            toggleBtn.click();
                            await delay(20);
                            const dropdownMenu = container.querySelector('.dropdown-menu');
                            if (dropdownMenu) {
                                const options = dropdownMenu.querySelectorAll('.dropdown-item, a, button');
                                if (options.length > 0) {
                                    let optionToClick = null;
                                    const isDhuha = habitName.includes("Sholat Dhuha");
                                    for (const option of options) {
                                        const txt = option.textContent.toLowerCase().trim();
                                        if (isDhuha && txt.includes('4 rakaat')) { optionToClick = option; break; }
                                        if (!isDhuha && (txt.includes('melaksanakan') || txt.includes('sebelum') || txt.includes('makan') || txt.includes('minum') || txt.includes('aktif') || txt.includes('berbincang'))) {
                                            optionToClick = option; break;
                                        }
                                    }
                                    if (!optionToClick) optionToClick = options[0];
                                    if (optionToClick) optionToClick.click();
                                }
                            }
                        }
                        await delay(30); 
                    }
                }
            }
        }
        
        await delay(30); 
        mulaiPengisianHari(indeksHari + 1);
    }

    // =========================================================================
    // POP-UP HARIAN (ADAPTIF UNTUK SALAT WAJIB, SALAT MALAM, DAN ZIKIR)
    // =========================================================================
    async function prosesModal(indeksHari, semuaBarisTabel, targetCells) {
        if (scriptSudahSelesai) return;

        for (let i = 0; i < targetCells.length; i++) {
            const cellTarget = targetCells[i];
            
            if (!cellTarget.textContent.trim().toLowerCase().includes('isi') || cellTarget.classList.contains('cursor-not-allowed')) {
                continue; 
            }

            const klikable = cellTarget.querySelector('a, button, span') || cellTarget;
            klikable.click();
            
            await delay(80);

            const container = document.getElementById('modal-salat-zikir') || document.querySelector('.modal.show, .modal.in, .modal');
            if (container) {
                const elemenJudul = container.querySelector('h5, div.modal-body p b, .modal-body div, .modal-header .modal-title');
                const teksJudulLengkap = elemenJudul ? elemenJudul.textContent.trim() : '';
                const teksJudul = teksJudulLengkap.toLowerCase();
                const tombolSimpan = container.querySelector('button.create-salat-zikir, button[type="submit"]') || document.querySelector('button.create-salat-zikir');

                barisAksi('Pop-up: "' + teksJudulLengkap + '"');

                const eksekusiKlik = (el) => {
                    if (!el) return;
                    el.click();
                    const targetId = el.getAttribute('for');
                    const radioInput = targetId ? document.getElementById(targetId) : el.querySelector('input[type="radio"]');
                    if (radioInput) {
                        radioInput.checked = true;
                        radioInput.dispatchEvent(new Event('input', { bubbles: true }));
                        radioInput.dispatchEvent(new Event('change', { bubbles: true }));
                        radioInput.click();
                    }
                };

                const semuaLabel = Array.from(container.querySelectorAll('label, button, div.btn'));

                // 1. KONDISI UNTUK SALAT MALAM / TAHAJUD
                if (teksJudul.includes('salat malam') || teksJudul.includes('tahajud')) {
                    const tombol2Rakaat = semuaLabel.find(el => {
                        const txt = el.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
                        return txt.includes('2 rakaat');
                    });
                    if (tombol2Rakaat) eksekusiKlik(tombol2Rakaat);
                } 
                // 2. KONDISI UNTUK ZIKIR PAGI / ZIKIR SORE
                else if (teksJudul.includes('zikir')) {
                    const tombolMendengarkan = semuaLabel.find(el => {
                        const txt = el.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
                        return txt.includes('mendengarkan') || txt.includes('membaca');
                    });
                    const tombolTidak = semuaLabel.find(el => {
                        const txt = el.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
                        return txt.includes('tidak melaksanakan');
                    });

                    if (tombolMendengarkan) {
                        eksekusiKlik(tombolMendengarkan);
                    } else if (tombolTidak) {
                        eksekusiKlik(tombolTidak);
                    }
                } 
                // 3. KONDISI UNTUK SALAT WAJIB (SUBUH, ZUHUR, ASAR, MAGRIB, ISYA)
                else {
                    const tombolMelaksanakan = semuaLabel.find(el => {
                        const txt = el.textContent.replace(/\s+/g, ' ').trim();
                        return txt.includes('(1)') && txt.toLowerCase().includes('ya') && !txt.toLowerCase().includes('masbuk');
                    });
                    if (tombolMelaksanakan) {
                        eksekusiKlik(tombolMelaksanakan);
                    }

                    await delay(30);

                    const tombolBerjamaah = semuaLabel.find(el => {
                        const txt = el.textContent.replace(/\s+/g, ' ').trim();
                        return txt.includes('(2)') && txt.toLowerCase().includes('ya');
                    });
                    if (tombolBerjamaah) {
                        eksekusiKlik(tombolBerjamaah);
                    }
                }

                await delay(50);

                if (tombolSimpan) {
                    tombolSimpan.removeAttribute('disabled');
                    tombolSimpan.classList.remove('btn-primary-disable', 'disabled', 'disabled-btn');

                    let attempts = 0;
                    while ((tombolSimpan.disabled || tombolSimpan.classList.contains('btn-primary-disable')) && attempts < 10) {
                        await delay(20); 
                        attempts++;
                    }
                    
                    tombolSimpan.click();
                    barisSukses(teksJudulLengkap + ' selesai ✓');
                    await delay(80); 
                } else {
                    const tombolClose = container.querySelector('.close, [data-dismiss="modal"]');
                    if (tombolClose) tombolClose.click();
                    await delay(30);
                }
            } else {
                await delay(30);
            }
        }

        prosesDropdownBagianBawah(indeksHari, semuaBarisTabel);
    }

    async function mulaiPengisianHari(indeksHari) {
        if (scriptSudahSelesai) return;
        
        if (indeksHari >= 7) { 
            await mulaiMengeksekusiJurnalMingguan();
            return; 
        }

        reportJurnalProgress({ status: 'daily', day: indeksHari + 1, total: 7, text: 'Hari ke-' + (indeksHari + 1) + '/7' });
        seksi('HARI ' + (indeksHari + 1), 'Harian');
        cetakBarProgres('Hari ke-' + (indeksHari + 1), indeksHari + 1, 7);
        
        const semuaTombolPensil = document.querySelectorAll('.daily-habit-edit-button');
        
        if (semuaTombolPensil.length > 0 && semuaTombolPensil[indeksHari]) {
            if (semuaTombolPensil[indeksHari].disabled || semuaTombolPensil[indeksHari].classList.contains('cursor-not-allowed')) {
                mulaiPengisianHari(indeksHari + 1);
                return;
            }
            
            semuaTombolPensil[indeksHari].click();
            
            setTimeout(() => {
                const semuaBarisTabel = document.querySelectorAll('table tbody tr');
                const targetCells = [];
                let ditemukanKataIsi = false;
                
                semuaBarisTabel.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    cells.forEach(cellSekarang => {
                        const teksCell = cellSekarang.textContent.trim().toLowerCase();
                        if (teksCell.includes('isi') && !cellSekarang.classList.contains('cursor-not-allowed')) {
                            ditemukanKataIsi = true;
                            if (cellSekarang.classList.contains('column-daily-habit') || cellSekarang.getAttribute('id') === 'habbit') {
                                targetCells.push(cellSekarang);
                            }
                        }
                    });
                });
                
                if (!ditemukanKataIsi) {
                    mulaiPengisianHari(indeksHari + 1);
                } else {
                    if (targetCells.length === 0) { 
                        prosesDropdownBagianBawah(indeksHari, semuaBarisTabel); 
                    } else { 
                        prosesModal(indeksHari, semuaBarisTabel, targetCells); 
                    }
                }
            }, 80);
        } else {
            if ((indeksHari + 1) < 7) {
                mulaiPengisianHari(indeksHari + 1);
            } else {
                await mulaiMengeksekusiJurnalMingguan();
            }
        }
    }

    function navigate() {
        if (scriptSudahSelesai) return;
        if (getPageType() === 'journal') {
            cetakBanner();
            seksi('HARIAN', 'Pengisian Hari 1 s.d. 7');
            reportJurnalProgress({ status: 'started', text: 'Memulai jurnal...' });
            mulaiPengisianHari(0);
        }
    }

    setTimeout(navigate, 80);
})();