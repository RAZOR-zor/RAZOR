(function () {
    'use strict';

    // ============================================================
    // JURNAL HARIAN + MINGGUAN AUTOMATION
    // ============================================================

    const CONFIG = {

        // ========================================================
        // ==================== HARIAN ============================
        // ========================================================

        // SALAT MALAM
        // 00 = jangan klik Isi
        // 0  = Tidak
        // 2  = 2 rakaat
        // 4  = 4 rakaat
        // 8  = 8 rakaat
        MALAM: 2,

        // SUBUH
        // M = pelaksanaan
        // B = berjamaah
        // M: 1 Ya | 0 Tidak | 00 jangan klik Isi
        // B: 2 Ya | 1 Ya, Masbuk | 0 Tidak | 00 jangan klik Isi
        SUBUH_M: 1,
        SUBUH_B: 2,

        // ZIKIR PAGI
        // 1 = Mendengarkan
        // 2 = Membaca
        // 0 = Tidak Melaksanakan
        // 00 = jangan klik Isi
        ZIKIR_PAGI: 1,

        // ZUHUR
        ZUHUR_M: 1,
        ZUHUR_B: 2,

        // ASAR
        ASAR_M: 1,
        ASAR_B: 2,

        // ZIKIR SORE
        ZIKIR_SORE: 1,

        // MAGRIB
        MAGRIB_M: 1,
        MAGRIB_B: 2,

        // ISYA
        ISYA_M: 1,
        ISYA_B: 2,

        // DHUHA
        // 8 / 4 / 2 rakaat
        // 00 = jangan klik Isi
        DHUHA: 8,

        // TILAWAH
        // 1 = Melaksanakan
        // 0 = Tidak melaksanakan
        // 00 = jangan klik Isi
        TILAWAH: 1,

        // MEMILAH SAMPAH
        // 1 = Melaksanakan
        // 0 = Tidak melaksanakan
        MEMILAH: 1
    };


    // ============================================================
    // ==================== STATUS ================================
    // ============================================================

    let prosesSelesai = false;
    let sedangMemprosesHarian = false;
    let sedangMemprosesMingguan = false;


    // ============================================================
    // DELAY
    // ============================================================

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    // ============================================================
    // PROGRESS
    // ============================================================

    function progress(data) {

        try {

            window.dispatchEvent(
                new CustomEvent(
                    'soal-jurnal-progress',
                    {
                        detail: {
                            type: 'jurnal',
                            ...data
                        }
                    }
                )
            );

        } catch (e) {}
    }


    // ============================================================
    // CONSOLE
    // ============================================================

    const C = {
        info: 'color:#38bdf8;font-weight:700',
        success: 'color:#34d399;font-weight:700',
        warning: 'color:#fbbf24;font-weight:700',
        error: 'color:#f87171;font-weight:700',
        weekly: 'color:#a78bfa;font-weight:700'
    };


    function logInfo(text) {
        console.log('%c► ' + text, C.info);
    }

    function logSuccess(text) {
        console.log('%c✔ ' + text, C.success);
    }

    function logWarning(text) {
        console.log('%c▲ ' + text, C.warning);
    }

    function logError(text) {
        console.log('%c✖ ' + text, C.error);
    }

    function logWeekly(text) {
        console.log('%c◆ ' + text, C.weekly);
    }


    // ============================================================
    // NORMALISASI TEKS
    // ============================================================

    function cleanText(text) {

        return String(text || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }


    // ============================================================
    // TUNGGU ISI MODAL SIAP
    // ============================================================

    async function waitForModalContent(
        modal,
        maxWait = 1000,
        interval = 50
    ) {

        const start = Date.now();

        while (
            Date.now() - start < maxWait
        ) {

            const choices =
                modal.querySelectorAll(
                    'label, button, div.btn'
                );

            if (choices.length > 0) {
                return true;
            }

            await delay(interval);
        }

        return false;
    }


    // ============================================================
    // SAFE CLICK
    // ============================================================

    function safeClick(element) {

        if (!element) {
            return false;
        }

        try {

            element.click();

            element.dispatchEvent(
                new MouseEvent(
                    'click',
                    {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    }
                )
            );

            return true;

        } catch (e) {

            return false;
        }
    }


    // ============================================================
    // ============================================================
    // ======================= HARIAN =============================
    // ============================================================
    // ============================================================


    // ============================================================
    // CEK CELL ISI
    // ============================================================

    function isCellEditable(cell) {

        if (!cell) {
            return false;
        }

        if (
            cell.classList.contains(
                'cursor-not-allowed'
            )
        ) {
            return false;
        }

        return cleanText(
            cell.textContent
        ).includes('isi');
    }


    // ============================================================
    // CARI TOMBOL ISI
    // ============================================================

    function getIsiButton(cell) {

        if (!cell) {
            return null;
        }

        const elements =
            Array.from(
                cell.querySelectorAll(
                    'a, button, span, div'
                )
            );

        return elements.find(
            el =>
                cleanText(
                    el.textContent
                ) === 'isi'
        ) || null;
    }


    // ============================================================
    // MODAL AKTIF
    // ============================================================

    function getActiveModal() {

        const modal =
            document.getElementById(
                'modal-salat-zikir'
            ) ||

            document.querySelector(
                '.modal.show'
            ) ||

            document.querySelector(
                '.modal.in'
            );

        return modal || null;
    }


    // ============================================================
    // JUDUL MODAL
    // ============================================================

    function getModalTitle(modal) {

        if (!modal) {
            return '';
        }

        const candidates = [

            '.modal-title',

            '.modal-header h5',

            '.modal-header',

            '.modal-body p b',

            '.modal-body'
        ];

        for (
            const selector
            of candidates
        ) {

            const element =
                modal.querySelector(
                    selector
                );

            if (element) {

                const text =
                    cleanText(
                        element.textContent
                    );

                if (text) {
                    return text;
                }
            }
        }

        return '';
    }


    // ============================================================
    // CLICK RADIO / LABEL
    // ============================================================

    function clickChoice(element) {

        if (!element) {
            return false;
        }

        safeClick(element);


        const targetId =
            element.getAttribute(
                'for'
            );


        if (targetId) {

            const input =
                document.getElementById(
                    targetId
                );

            if (input) {

                input.checked = true;

                input.dispatchEvent(
                    new Event(
                        'input',
                        {
                            bubbles: true
                        }
                    )
                );

                input.dispatchEvent(
                    new Event(
                        'change',
                        {
                            bubbles: true
                        }
                    )
                );
            }
        }


        const radio =
            element.querySelector(
                'input[type="radio"]'
            );


        if (radio) {

            radio.checked = true;

            radio.dispatchEvent(
                new Event(
                    'input',
                    {
                        bubbles: true
                    }
                )
            );

            radio.dispatchEvent(
                new Event(
                    'change',
                    {
                        bubbles: true
                    }
                )
            );
        }

        return true;
    }


    // ============================================================
    // PILIH SALAT
    // ============================================================

    function pilihSalat(
        modal,
        settingM,
        settingB
    ) {

        const M = String(settingM);
        const B = String(settingB);


        if (M === '00' && B === '00') {
            logInfo(
                'M = 00 dan B = 00 → tidak ada pilihan'
            );
            return;
        }


        const semua =
            Array.from(
                modal.querySelectorAll(
                    'label, button, div.btn'
                )
            );


        // --------------------------------------------------------
        // M
        // --------------------------------------------------------

        if (M !== '00') {

            let pilihanM = null;

            if (M === '1') {
                pilihanM = semua.find(el => {
                    const text = cleanText(el.textContent);
                    return (
                        text.includes('(1)') &&
                        text.includes('ya') &&
                        !text.includes('masbuk')
                    );
                });
            } else if (M === '0') {
                pilihanM = semua.find(el => {
                    const text = cleanText(el.textContent);
                    return (
                        text.includes('(0)') &&
                        text.includes('tidak')
                    );
                });
            }

            if (pilihanM) {
                clickChoice(pilihanM);
            }
        }


        // --------------------------------------------------------
        // B
        // --------------------------------------------------------

        if (B !== '00') {

            let pilihanB = null;

            if (B === '2') {
                pilihanB = semua.find(el => {
                    const text = cleanText(el.textContent);
                    return (
                        text.includes('(2)') &&
                        text.includes('ya')
                    );
                });
            } else if (B === '1') {
                pilihanB = semua.find(el => {
                    const text = cleanText(el.textContent);
                    return (
                        text.includes('(1)') &&
                        text.includes('masbuk')
                    );
                });
            } else if (B === '0') {
                pilihanB = semua.find(el => {
                    const text = cleanText(el.textContent);
                    return (
                        text.includes('(0)') &&
                        text.includes('tidak')
                    );
                });
            }

            if (pilihanB) {
                clickChoice(pilihanB);
            }
        }

        return true;
    }


    // ============================================================
    // SALAT MALAM
    // ============================================================

    function pilihSalatMalam(modal) {

        const setting =
            CONFIG.MALAM;


        if (
            String(setting) === '00'
        ) {
            return;
        }


        const semua =
            Array.from(
                modal.querySelectorAll(
                    'label, button, div.btn'
                )
            );


        const target =
            semua.find(
                el => {

                    const text =
                        cleanText(
                            el.textContent
                        );

                    return text.includes(
                        `${setting} rakaat`
                    );
                }
            );


        if (target) {
            clickChoice(target);
        }
    }


    // ============================================================
    // ZIKIR
    // ============================================================

    function pilihZikir(
        modal,
        setting
    ) {

        if (
            String(setting) === '00'
        ) {
            return;
        }


        const semua =
            Array.from(
                modal.querySelectorAll(
                    'label, button, div.btn'
                )
            );


        let target = null;


        if (
            Number(setting) === 1
        ) {

            target =
                semua.find(
                    el =>
                        cleanText(
                            el.textContent
                        ).includes(
                            'mendengarkan'
                        )
                );

        } else if (
            Number(setting) === 2
        ) {

            target =
                semua.find(
                    el =>
                        cleanText(
                            el.textContent
                        ).includes(
                            'membaca'
                        )
                );

        } else if (
            Number(setting) === 0
        ) {

            target =
                semua.find(
                    el => {

                        const text =
                            cleanText(
                                el.textContent
                            );

                        return (
                            text.includes(
                                'tidak melaksanakan'
                            ) ||
                            (
                                text.includes(
                                    '(0)'
                                ) &&
                                text.includes(
                                    'tidak'
                                )
                            )
                        );
                    }
                );
        }


        if (target) {
            clickChoice(target);
        }
    }


    // ============================================================
    // SIMPAN POPUP
    // ============================================================

    async function klikSimpanPopup(
        modal
    ) {

        await delay(150);


        let tombolSimpan =
            modal?.querySelector(
                'button.create-salat-zikir'
            );


        if (!tombolSimpan) {

            tombolSimpan =
                modal?.querySelector(
                    'button[data-id].create-salat-zikir'
                );
        }


        if (!tombolSimpan) {

            tombolSimpan =
                document.querySelector(
                    'button.create-salat-zikir'
                );
        }


        if (!tombolSimpan) {

            logWarning(
                'Tombol Simpan popup tidak ditemukan'
            );

            return false;
        }


        // ========================================================
        // PAKSA AKTIF
        // ========================================================

        tombolSimpan.removeAttribute(
            'disabled'
        );

        tombolSimpan.classList.remove(
            'btn-primary-disable',
            'disabled',
            'disabled-btn'
        );


        for (
            let i = 0;
            i < 10;
            i++
        ) {

            if (
                !tombolSimpan.disabled &&
                !tombolSimpan.classList.contains(
                    'btn-primary-disable'
                )
            ) {
                break;
            }

            await delay(30);

            tombolSimpan.removeAttribute(
                'disabled'
            );

            tombolSimpan.classList.remove(
                'btn-primary-disable',
                'disabled',
                'disabled-btn'
            );
        }


        // ========================================================
        // SELALU KLIK SIMPAN
        // ========================================================

        safeClick(
            tombolSimpan
        );


        logSuccess(
            'Tombol Simpan ditekan'
        );


        await delay(120);

        return true;
    }


    // ============================================================
    // PROSES SATU POPUP
    // ============================================================

    async function prosesSatuPopup(
        cell,
        jenis
    ) {

        if (
            !isCellEditable(cell)
        ) {
            return;
        }


        const button =
            getIsiButton(cell);


        if (!button) {
            return;
        }



        logInfo(
            'Membuka popup: ' +
            jenis
        );


        safeClick(button);

        await delay(200);


        const modal =
            getActiveModal();


        if (!modal) {

            logWarning(
                'Modal tidak ditemukan: ' +
                jenis
            );

            return;
        }


        const contentReady =
            await waitForModalContent(
                modal
            );

        if (!contentReady) {

            logWarning(
                'Modal content belum siap: ' +
                jenis
            );

            return;
        }


        logInfo(
            'Popup aktif: ' +
            getModalTitle(modal)
        );


        // --------------------------------------------------------
        // MALAM
        // --------------------------------------------------------

        if (
            jenis === 'malam'
        ) {

            pilihSalatMalam(
                modal
            );

            await klikSimpanPopup(
                modal
            );

            return;
        }


        // --------------------------------------------------------
        // ZIKIR PAGI
        // --------------------------------------------------------

        if (
            jenis === 'zikir-pagi'
        ) {

            pilihZikir(
                modal,
                CONFIG.ZIKIR_PAGI
            );

            await klikSimpanPopup(
                modal
            );

            return;
        }


        // --------------------------------------------------------
        // ZIKIR SORE
        // --------------------------------------------------------

        if (
            jenis === 'zikir-sore'
        ) {

            pilihZikir(
                modal,
                CONFIG.ZIKIR_SORE
            );

            await klikSimpanPopup(
                modal
            );

            return;
        }


        // --------------------------------------------------------
        // SUBUH
        // --------------------------------------------------------

        if (
            jenis === 'subuh'
        ) {

            pilihSalat(
                modal,
                CONFIG.SUBUH_M,
                CONFIG.SUBUH_B
            );

            await klikSimpanPopup(
                modal
            );

            return;
        }


        // --------------------------------------------------------
        // ZUHUR
        // --------------------------------------------------------

        if (
            jenis === 'zuhur'
        ) {

            pilihSalat(
                modal,
                CONFIG.ZUHUR_M,
                CONFIG.ZUHUR_B
            );

            await klikSimpanPopup(
                modal
            );

            return;
        }


        // --------------------------------------------------------
        // ASAR
        // --------------------------------------------------------

        if (
            jenis === 'asar'
        ) {

            pilihSalat(
                modal,
                CONFIG.ASAR_M,
                CONFIG.ASAR_B
            );

            await klikSimpanPopup(
                modal
            );

            return;
        }


        // --------------------------------------------------------
        // MAGRIB
        // --------------------------------------------------------

        if (
            jenis === 'magrib'
        ) {

            pilihSalat(
                modal,
                CONFIG.MAGRIB_M,
                CONFIG.MAGRIB_B
            );

            await klikSimpanPopup(
                modal
            );

            return;
        }


        // --------------------------------------------------------
        // ISYA
        // --------------------------------------------------------

        if (
            jenis === 'isya'
        ) {

            pilihSalat(
                modal,
                CONFIG.ISYA_M,
                CONFIG.ISYA_B
            );

            await klikSimpanPopup(
                modal
            );

            return;
        }
    }


    // ============================================================
    // DROPDOWN HARIAN
    // ============================================================

    const DROPDOWN_CONFIG = [

        {
            name: 'Sholat Dhuha',
            type: 'rakaat',
            setting: () => CONFIG.DHUHA
        },

        {
            name: 'Mengaji atau tilawah Alquran',
            type: 'boolean',
            setting: () => CONFIG.TILAWAH
        },

        {
            name: 'Tidur sebelum pukul 22.00',
            type: 'fixed',
            option: 'Sebelum pukul 22.00'
        },

        {
            name: 'Bangun Sebelum Pukul 05.00',
            type: 'fixed',
            option: 'Sebelum pukul 05.00'
        },

        {
            name: 'Makan gizi seimbang',
            type: 'fixed',
            option: 'Melaksanakan'
        },

        {
            name: 'Minum Air Putih 1,5--2L Sehari',
            type: 'fixed',
            option: 'Melaksanakan'
        },

        {
            name: 'Peregangan',
            type: 'fixed',
            option: 'Melaksanakan'
        },

        {
            name: 'Grooming Diri',
            type: 'fixed',
            option: 'Melaksanakan'
        },

        {
            name: 'Membawa Tumbler',
            type: 'fixed',
            option: 'Melaksanakan'
        },

        {
            name: 'Membersihkan dan merapikan meja',
            type: 'fixed',
            option: 'Melaksanakan'
        },

        {
            name: 'Memilah sampah',
            type: 'boolean',
            setting: () => CONFIG.MEMILAH
        },

        {
            name: 'Aktif dalam Kelompok Belajar',
            type: 'fixed',
            option: 'Melaksanakan'
        },

        {
            name: 'Berbincang dengan Anggota Keluarga',
            type: 'fixed',
            option: 'Melaksanakan'
        }
    ];


    // ============================================================
    // CARI CONFIG DROPDOWN
    // ============================================================

    function getDropdownConfig(
        habitName
    ) {

        const text =
            cleanText(
                habitName
            );


        return DROPDOWN_CONFIG.find(
            config =>
                text.includes(
                    cleanText(
                        config.name
                    )
                )
        ) || null;
    }


    // ============================================================
    // TOGGLE DROPDOWN
    // ============================================================

    function getDropdownToggle(
        cell
    ) {

        if (!cell) {
            return null;
        }


        return (

            cell.querySelector(
                '[data-toggle="dropdown"]'
            ) ||

            cell.querySelector(
                '[data-bs-toggle="dropdown"]'
            ) ||

            cell.querySelector(
                '.dropdown-toggle'
            ) ||

            cell.querySelector(
                'a, button, span'
            )
        );
    }


    // ============================================================
    // CARI OPTION DROPDOWN
    // ============================================================

    function findDropdownOption(
        menu,
        config
    ) {

        if (
            !menu ||
            !config
        ) {
            return null;
        }


        const options =
            Array.from(
                menu.querySelectorAll(
                    '.dropdown-item, a, button, div'
                )
            );


        // --------------------------------------------------------
        // RAKAAT
        // --------------------------------------------------------

        if (
            config.type === 'rakaat'
        ) {

            const setting =
                config.setting();


            if (
                String(setting) === '00'
            ) {
                return null;
            }


            const target =
                `${setting} rakaat`;


            return options.find(
                option =>
                    cleanText(
                        option.textContent
                    ).includes(
                        cleanText(target)
                    )
            ) || null;
        }


        // --------------------------------------------------------
        // BOOLEAN
        // --------------------------------------------------------

        if (
            config.type === 'boolean'
        ) {

            const setting =
                config.setting();


            if (
                String(setting) === '00'
            ) {
                return null;
            }


            const target =
                Number(setting) === 1
                    ? 'melaksanakan'
                    : 'tidak melaksanakan';


            return options.find(
                option =>
                    cleanText(
                        option.textContent
                    ) === cleanText(
                        target
                    )
            ) || null;
        }


        // --------------------------------------------------------
        // FIXED
        // --------------------------------------------------------

        if (
            config.type === 'fixed'
        ) {

            return options.find(
                option =>
                    cleanText(
                        option.textContent
                    ) === cleanText(
                        config.option
                    )
            ) || null;
        }


        return null;
    }


    // ============================================================
    // PROSES SATU DROPDOWN
    // ============================================================

    async function prosesSatuDropdown(
        row,
        config
    ) {

        if (
            !row ||
            !config
        ) {
            return;
        }


        const cells =
            Array.from(
                row.querySelectorAll(
                    'td'
                )
            );


        for (
            const cell
            of cells
        ) {

            if (
                !isCellEditable(cell)
            ) {
                continue;
            }


            if (
                (
                    config.type === 'rakaat' ||
                    config.type === 'boolean'
                ) &&
                String(
                    config.setting()
                ) === '00'
            ) {
                continue;
            }


            const toggle =
                getDropdownToggle(
                    cell
                );


            if (!toggle) {
                continue;
            }


            logInfo(
                'Dropdown: ' +
                config.name
            );


            safeClick(
                toggle
            );


            await delay(50);


            let menu =
                cell.querySelector(
                    '.dropdown-menu.show'
                ) ||

                cell.querySelector(
                    '.dropdown-menu'
                );


            if (!menu) {

                menu =
                    document.querySelector(
                        '.dropdown-menu.show'
                    );
            }


            if (!menu) {

                logWarning(
                    'Menu dropdown tidak ditemukan: ' +
                    config.name
                );

                continue;
            }


            const option =
                findDropdownOption(
                    menu,
                    config
                );


            if (!option) {

                logWarning(
                    'Option tidak ditemukan: ' +
                    config.name
                );

                continue;
            }


            safeClick(
                option
            );


            logSuccess(
                'Dipilih: ' +
                option.textContent.trim()
            );


            await delay(80);
        }
    }


    // ============================================================
    // SEMUA DROPDOWN DALAM HARI
    // ============================================================

    async function prosesSemuaDropdown(
        semuaBaris
    ) {

        for (
            const config
            of DROPDOWN_CONFIG
        ) {

            for (
                const row
                of semuaBaris
            ) {

                const firstCell =
                    row.querySelector(
                        'td, th'
                    );


                if (!firstCell) {
                    continue;
                }


                const habitName =
                    cleanText(
                        firstCell.textContent
                    );


                if (
                    !habitName.includes(
                        cleanText(
                            config.name
                        )
                    )
                ) {
                    continue;
                }


                await prosesSatuDropdown(
                    row,
                    config
                );


                await delay(50);
            }
        }
    }


    // ============================================================
    // CARI ROW
    // ============================================================

    function getRowByKeyword(
        rows,
        keyword
    ) {

        const target =
            cleanText(
                keyword
            );


        return rows.find(
            row =>
                cleanText(
                    row.textContent
                ).includes(
                    target
                )
        ) || null;
    }


    // ============================================================
    // SEMUA POPUP HARIAN
    // ============================================================

    async function prosesSemuaPopup(
        semuaBaris
    ) {

        const urutan = [

            {
                keyword: 'salat malam',
                type: 'malam'
            },

            {
                keyword: 'sholat malam',
                type: 'malam'
            },

            {
                keyword: 'subuh',
                type: 'subuh'
            },

            {
                keyword: 'zikir pagi',
                type: 'zikir-pagi'
            },

            {
                keyword: 'dzikir pagi',
                type: 'zikir-pagi'
            },

            {
                keyword: 'zuhur',
                type: 'zuhur'
            },

            {
                keyword: 'dzuhur',
                type: 'zuhur'
            },

            {
                keyword: 'asar',
                type: 'asar'
            },

            {
                keyword: 'ashar',
                type: 'asar'
            },

            {
                keyword: 'zikir sore',
                type: 'zikir-sore'
            },

            {
                keyword: 'dzikir sore',
                type: 'zikir-sore'
            },

            {
                keyword: 'magrib',
                type: 'magrib'
            },

            {
                keyword: 'maghrib',
                type: 'magrib'
            },

            {
                keyword: 'isya',
                type: 'isya'
            }
        ];


        const sudahDiproses =
            new Set();


        for (
            const item
            of urutan
        ) {

            if (
                sudahDiproses.has(
                    item.type
                )
            ) {
                continue;
            }


            const row =
                getRowByKeyword(
                    semuaBaris,
                    item.keyword
                );


            if (!row) {
                continue;
            }


            const cells =
                Array.from(
                    row.querySelectorAll(
                        'td'
                    )
                );


            for (
                const cell
                of cells
            ) {

                if (
                    !isCellEditable(cell)
                ) {
                    continue;
                }


                const button =
                    getIsiButton(
                        cell
                    );


                if (!button) {
                    continue;
                }


                await prosesSatuPopup(
                    cell,
                    item.type
                );


                await delay(100);


                sudahDiproses.add(
                    item.type
                );


                break;
            }
        }
    }


    // ============================================================
    // TOMBOL HARI
    // ============================================================

    function getDailyButtons() {

        return Array.from(
            document.querySelectorAll(
                '.daily-habit-edit-button'
            )
        );
    }


    // ============================================================
    // WAIT TABLE
    // ============================================================

    async function waitForTable() {

        for (
            let i = 0;
            i < 30;
            i++
        ) {

            const rows =
                document.querySelectorAll(
                    'table tbody tr'
                );


            if (
                rows.length > 0
            ) {
                return true;
            }


            await delay(100);
        }


        return false;
    }


    // ============================================================
    // PROSES SATU HARI
    // ============================================================

    async function prosesHari(
        indexHari
    ) {

        const namaHari = [

            'SENIN',
            'SELASA',
            'RABU',
            'KAMIS',
            'JUMAT',
            'SABTU',
            'MINGGU'

        ][indexHari];


        logInfo(
            '================================'
        );


        logInfo(
            'MEMPROSES ' +
            namaHari
        );


        progress({

            status: 'daily',

            day:
                indexHari + 1,

            total: 7,

            text:
                'Memproses ' +
                namaHari
        });


        const tombolHari =
            getDailyButtons();


        const tombol =
            tombolHari[indexHari];


        if (!tombol) {

            logWarning(
                'Tombol hari ke-' +
                (indexHari + 1) +
                ' tidak ditemukan'
            );


            if (
                indexHari < 6
            ) {

                await prosesHari(
                    indexHari + 1
                );

            } else {

                await mulaiMingguan();
            }

            return;
        }


        if (
            tombol.disabled ||
            tombol.classList.contains(
                'cursor-not-allowed'
            )
        ) {

            logWarning(
                namaHari +
                ' terkunci, lanjut hari berikutnya'
            );


            if (
                indexHari < 6
            ) {

                await prosesHari(
                    indexHari + 1
                );

            } else {

                await mulaiMingguan();
            }

            return;
        }


        // ========================================================
        // BUKA HARI
        // ========================================================

        logInfo(
            'Membuka ' +
            namaHari
        );


        safeClick(
            tombol
        );


        await delay(150);

        await waitForTable();

        await delay(100);


        // ========================================================
        // POPUP
        // ========================================================

        let semuaBaris =
            Array.from(
                document.querySelectorAll(
                    'table tbody tr'
                )
            );


        await prosesSemuaPopup(
            semuaBaris
        );


        await delay(100);


        // ========================================================
        // AMBIL ULANG ROW
        // ========================================================

        semuaBaris =
            Array.from(
                document.querySelectorAll(
                    'table tbody tr'
                )
            );


        // ========================================================
        // DROPDOWN
        // ========================================================

        await prosesSemuaDropdown(
            semuaBaris
        );


        await delay(150);


        logSuccess(
            namaHari +
            ' selesai'
        );


        // ========================================================
        // HARI BERIKUTNYA
        // ========================================================

        if (
            indexHari < 6
        ) {

            await delay(150);

            await prosesHari(
                indexHari + 1
            );

        } else {

            // ====================================================
            // PENTING:
            // JANGAN SET SELESAI DI SINI.
            // SETELAH MINGGU SELESAI -> LANGSUNG MINGGUAN.
            // ====================================================

            logSuccess(
                '================================'
            );

            logSuccess(
                'SEMUA 7 HARI SELESAI'
            );


            progress({
                status: 'daily-complete',
                text:
                    '✔ Jurnal harian selesai — lanjut jurnal mingguan'
            });


            await delay(500);


            await mulaiMingguan();
        }
    }


    // ============================================================
    // ============================================================
    // ===================== MINGGUAN =============================
    // ============================================================
    // ============================================================


    // ============================================================
    // SETTING HARI MINGGUAN
    // ============================================================

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

        'piket rayon': 'Sn'
    };


    // ============================================================
    // SETTING SAKSI
    // ============================================================

    const SETTING_SAKSI = {

        'sholat jumat': {
            tipe: 'FRIEND',
            nama: ''
        },

        'puasa sunnah': {
            tipe: 'PARENT',
            nama: ''
        },

        'tadabur': {
            tipe: 'FRIEND',
            nama: ''
        },

        'infaq': {
            tipe: 'FRIEND',
            nama: ''
        },

        'olah napas': {
            tipe: 'FRIEND',
            nama: ''
        },

        'aktivitas fisik': {
            tipe: 'PARENT',
            nama: ''
        },

        'kuku': {
            tipe: 'PARENT',
            nama: ''
        },

        'sarapan': {
            tipe: 'FRIEND',
            nama: ''
        },

        'ekstrakurikuler': {
            tipe: 'FRIEND',
            nama: ''
        },

        'seni budaya': {
            tipe: 'FRIEND',
            nama: ''
        },

        'bimbingan konseling': {
            tipe: 'FRIEND',
            nama: ''
        },

        'mencuci baju': {
            tipe: 'PARENT',
            nama: ''
        },

        'membantu memasak': {
            tipe: 'PARENT',
            nama: ''
        },

        'membersihkan rumah': {
            tipe: 'PARENT',
            nama: ''
        },

        'daur ulang': {
            tipe: 'PARENT',
            nama: ''
        },

        'kumpul rayon': {
            tipe: 'FRIEND',
            nama: ''
        },

        'leadership': {
            tipe: 'FRIEND',
            nama: ''
        },

        'piket rayon': {
            tipe: 'FRIEND',
            nama: ''
        }
    };


    // ============================================================
    // PILIH TIPE KEGIATAN MINGGUAN
    // ============================================================

    async function triggerPilihanTigaKali(
        radioId,
        labelSelector
    ) {

        const radio =
            document.getElementById(
                radioId
            );


        const label =
            document.querySelector(
                labelSelector
            );


        if (radio) {

            radio.checked = true;

            radio.dispatchEvent(
                new Event(
                    'input',
                    {
                        bubbles: true
                    }
                )
            );

            radio.dispatchEvent(
                new Event(
                    'change',
                    {
                        bubbles: true
                    }
                )
            );
        }


        if (label) {
            safeClick(label);
        }
    }


    // ============================================================
    // PILIH SAKSI
    // ============================================================

    async function triggerPilihanSaksiBerdasarkanKode(
        kodeInggris
    ) {

        const kamusTeks = {

            'PARENT':
                'Orang Tua',

            'TEACHER':
                'Guru',

            'FRIEND':
                'Teman'
        };


        const teksIndonesia =
            kamusTeks[
                kodeInggris
            ] || 'Orang Tua';


        const fallbackId =
            `witness-type-${kodeInggris}`;


        const radioInternal =
            document.getElementById(
                fallbackId
            ) ||

            document.querySelector(
                `input[value="${kodeInggris}"]`
            );


        if (radioInternal) {

            radioInternal.checked = true;

            radioInternal.dispatchEvent(
                new Event(
                    'change',
                    {
                        bubbles: true
                    }
                )
            );
        }


        const semuaElemen =
            Array.from(
                document.querySelectorAll(
                    'button, label, div, span, .btn'
                )
            );


        const tombolKetemu =
            semuaElemen.find(
                el =>
                    cleanText(
                        el.textContent
                    ) ===
                    cleanText(
                        teksIndonesia
                    )
            );


        if (tombolKetemu) {

            safeClick(
                tombolKetemu
            );

        } else {

            await triggerPilihanTigaKali(
                fallbackId,
                `label[for="${fallbackId}"]`
            );
        }
    }


    // ============================================================
    // PILIH HARI MINGGUAN
    // ============================================================

    async function triggerPilihanHariBerdasarkanTeks(
        inisialHari
    ) {

        const semuaTombolHari =
            Array.from(
                document.querySelectorAll(
                    'button, label, div, span, .btn'
                )
            );


        const tombolHariKetemu =
            semuaTombolHari.find(
                el =>
                    el.textContent.trim() ===
                    inisialHari
            );


        if (!tombolHariKetemu) {
            return;
        }


        safeClick(
            tombolHariKetemu
        );


        const inputHari =
            tombolHariKetemu.querySelector(
                'input'
            ) ||

            tombolHariKetemu.parentElement
                ?.querySelector(
                    'input'
                );


        if (inputHari) {

            inputHari.checked = true;

            inputHari.dispatchEvent(
                new Event(
                    'change',
                    {
                        bubbles: true
                    }
                )
            );
        }
    }


    // ============================================================
    // NAMA SAKSI
    // ============================================================

    async function ketikNamaSaksiLengkap(
        teks
    ) {

        const input =
            document.querySelector(
                '.witness-name-input input'
            ) ||

            document.querySelector(
                'input.witness-name-weekly'
            );


        if (!input) {
            return;
        }


        input.focus();


        const setter =
            Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            ).set;


        if (setter) {

            setter.call(
                input,
                teks
            );

        } else {

            input.value = teks;
        }


        input.dispatchEvent(
            new Event(
                'input',
                {
                    bubbles: true
                }
            )
        );


        input.dispatchEvent(
            new Event(
                'change',
                {
                    bubbles: true
                }
            )
        );


        input.dispatchEvent(
            new Event(
                'blur',
                {
                    bubbles: true
                }
            )
        );
    }


    // ============================================================
    // SIMPAN MINGGUAN
    // ============================================================

    async function eksekusiSimpanMingguan() {

        await delay(50);


        const tombolSimpan =
            document.getElementById(
                'buttonCreateWeekly'
            ) ||

            document.querySelector(
                '.button-create-weekly button'
            );


        if (!tombolSimpan) {

            logWarning(
                'Tombol simpan mingguan tidak ditemukan'
            );

            return;
        }


        // Paksa aktif

        tombolSimpan.removeAttribute(
            'disabled'
        );


        tombolSimpan.classList.remove(
            'btn-primary-disable',
            'disabled',
            'disabled-btn'
        );


        // ========================================================
        // SELALU KLIK
        // ========================================================

        safeClick(
            tombolSimpan
        );


        logSuccess(
            'Tombol Simpan Mingguan ditekan'
        );


        await delay(120);
    }


    // ============================================================
    // CARI TOMBOL ISI MINGGUAN
    // ============================================================

    function dapatkanTombolIsiMingguan(
        keyword
    ) {

        const barisTabel =
            Array.from(
                document.querySelectorAll(
                    'table tbody tr, .table tbody tr'
                )
            );


        const barisKetemu =
            barisTabel.find(
                tr =>
                    tr.children[0]
                        ?.textContent
                        .trim()
                        .toLowerCase()
                        .includes(
                            keyword.toLowerCase()
                        )
            );


        return barisKetemu
            ? barisKetemu.querySelector(
                'a.habit-weekly, a'
            )
            : null;
    }


    // ============================================================
    // MINGGUAN BIASA
    // ============================================================

    async function prosesKegiatanMingguanBiasa(
        keyword,
        labelNama
    ) {

        const tombol =
            dapatkanTombolIsiMingguan(
                keyword
            );


        if (!tombol) {
            return;
        }


        logWeekly(
            'Isi: ' +
            labelNama
        );


        safeClick(
            tombol
        );


        await delay(80);


        // Melaksanakan

        await triggerPilihanTigaKali(
            'detailType-doing',
            'label.detailType-doing'
        );


        // Hari

        const hariTarget =
            SETTING_HARI_KEGIATAN[
                keyword
            ] || 'Sn';


        await triggerPilihanHariBerdasarkanTeks(
            hariTarget
        );


        // Saksi

        const configSaksi =
            SETTING_SAKSI[
                keyword
            ] || {
                tipe: 'PARENT',
                nama: ''
            };


        await triggerPilihanSaksiBerdasarkanKode(
            configSaksi.tipe
        );


        await ketikNamaSaksiLengkap(
            configSaksi.nama
        );


        await eksekusiSimpanMingguan();


        logSuccess(
            'Tersimpan: ' +
            labelNama
        );


        await delay(80);
    }


    // ============================================================
    // MINGGUAN TIDAK MELAKSANAKAN
    // ============================================================

    async function prosesKegiatanTidakMelaksanakan(
        keyword,
        labelNama
    ) {

        const tombol =
            dapatkanTombolIsiMingguan(
                keyword
            );


        if (!tombol) {
            return;
        }


        logWeekly(
            'Skip: ' +
            labelNama
        );


        safeClick(
            tombol
        );


        await delay(80);


        const labelTidak =

            document.querySelector(
                'label.detailType-undone'
            ) ||

            document.querySelector(
                'label.detailType-not_doing'
            ) ||

            Array.from(
                document.querySelectorAll(
                    'label'
                )
            ).find(
                el => {

                    const txt =
                        el.textContent
                            .replace(
                                /\s+/g,
                                ' '
                            )
                            .trim();


                    return (
                        txt.includes('(0)') ||
                        txt.toLowerCase()
                            .includes(
                                'tidak melaksanakan'
                            )
                    );
                }
            );


        if (labelTidak) {

            const targetId =
                labelTidak.getAttribute(
                    'for'
                );


            const radioInput =
                targetId
                    ? document.getElementById(
                        targetId
                    )
                    : labelTidak.querySelector(
                        'input[type="radio"]'
                    );


            safeClick(
                labelTidak
            );


            if (radioInput) {

                radioInput.checked = true;


                radioInput.dispatchEvent(
                    new Event(
                        'input',
                        {
                            bubbles: true
                        }
                    )
                );


                radioInput.dispatchEvent(
                    new Event(
                        'change',
                        {
                            bubbles: true
                        }
                    )
                );
            }


        } else {

            const radioTidak =

                document.getElementById(
                    'detailType-not_doing'
                ) ||

                document.querySelector(
                    'input[value="NOT_DOING"]'
                );


            if (radioTidak) {

                radioTidak.checked = true;

                radioTidak.dispatchEvent(
                    new Event(
                        'change',
                        {
                            bubbles: true
                        }
                    )
                );
            }
        }


        await delay(50);


        await eksekusiSimpanMingguan();


        logSuccess(
            'Tersimpan: ' +
            labelNama
        );


        await delay(80);
    }


    // ============================================================
    // MULAI MINGGUAN
    // ============================================================

    async function mulaiMingguan() {

        if (
            prosesSelesai ||
            sedangMemprosesMingguan
        ) {
            return;
        }


        sedangMemprosesMingguan = true;


        console.log(
            '%c================================',
            'color:#a78bfa'
        );


        logWeekly(
            'MEMULAI JURNAL MINGGUAN'
        );


        progress({

            status: 'weekly',

            text:
                'Mengisi jurnal mingguan...'
        });


        await delay(300);


        // ========================================================
        // SHOLAT JUMAT
        // ========================================================

        await prosesKegiatanMingguanBiasa(
            'sholat jumat',
            'Sholat Jumat'
        );


        // ========================================================
        // PUASA SUNNAH
        // ========================================================

        await prosesKegiatanTidakMelaksanakan(
            'puasa sunnah',
            'Puasa Sunnah'
        );


        // ========================================================
        // LATIHAN
        // ========================================================

        await prosesKegiatanTidakMelaksanakan(
            'latihan literasi',
            'Latihan Literasi (AKM/TKA)'
        );


        await prosesKegiatanTidakMelaksanakan(
            'latihan numerasi',
            'Latihan Numerasi (AKM/TKA)'
        );


        await prosesKegiatanTidakMelaksanakan(
            'latihan b. inggris',
            'Latihan B. Inggris (TOEIC/TKA)'
        );


        // ========================================================
        // DAFTAR MINGGUAN
        // ========================================================

        const listMingguan = [

            [
                'tadabur',
                'Tadabur Alquran'
            ],

            [
                'infaq',
                'Berinfaq'
            ],

            [
                'olah napas',
                'Olah Napas'
            ],

            [
                'aktivitas fisik',
                'Aktivitas Fisik'
            ],

            [
                'kuku',
                'Potong Kuku'
            ],

            [
                'sarapan',
                'Sarapan'
            ],

            [
                'ekstrakurikuler',
                'Ekstrakurikuler'
            ],

            [
                'seni budaya',
                'Seni Budaya'
            ],

            [
                'bimbingan konseling',
                'BK'
            ],

            [
                'mencuci baju',
                'Cuci Baju'
            ],

            [
                'membantu memasak',
                'Bantu Memasak'
            ],

            [
                'membersihkan rumah',
                'Bersih Rumah'
            ],

            [
                'daur ulang',
                'Daur Ulang'
            ],

            [
                'kumpul rayon',
                'Kumpul Rayon'
            ],

            [
                'leadership',
                'Leadership'
            ],

            [
                'piket rayon',
                'Piket Rayon'
            ]
        ];


        // ========================================================
        // PROSES SATU-SATU
        // ========================================================

        for (
            const item
            of listMingguan
        ) {

            await prosesKegiatanMingguanBiasa(
                item[0],
                item[1]
            );

            await delay(50);
        }


        // ========================================================
        // SELESAI MINGGUAN
        // ========================================================

        console.log(
            '%c================================',
            'color:#a78bfa'
        );


        logWeekly(
            'SEMUA JURNAL MINGGUAN SELESAI'
        );


        progress({

            status: 'complete',

            text:
                '✔ Jurnal harian + mingguan selesai'
        });


        console.debug(
            '[SOAL-JURNAL-DONE]'
        );


        prosesSelesai = true;

        sedangMemprosesMingguan = false;
    }


    // ============================================================
    // CEK HALAMAN JURNAL
    // ============================================================

    function isJournalPage() {

        return (

            window.location.pathname
                .toLowerCase()
                .includes(
                    'journal'
                ) ||

            window.location.pathname
                .toLowerCase()
                .includes(
                    'jurnal'
                ) ||

            document.querySelector(
                '.daily-habit-edit-button'
            ) ||

            document.querySelector(
                'table'
            )
        );
    }


    // ============================================================
    // START HARIAN
    // ============================================================

    async function start() {

        if (
            !isJournalPage()
        ) {

            logWarning(
                'Halaman jurnal tidak terdeteksi'
            );

            return;
        }


        if (
            sedangMemprosesHarian ||
            sedangMemprosesMingguan ||
            prosesSelesai
        ) {
            return;
        }


        sedangMemprosesHarian = true;


        console.clear();


        console.log(
            '%c JURNAL HARIAN + MINGGUAN ',
            'background:#0f172a;color:#38bdf8;font-weight:800;font-size:15px;padding:6px 12px;border-radius:5px'
        );


        progress({

            status: 'started',

            text:
                'Memulai jurnal harian...'
        });


        await waitForTable();

        await delay(100);


        const tombolHari =
            getDailyButtons();


        if (
            tombolHari.length < 7
        ) {

            logWarning(
                'Tombol hari belum lengkap. Ditemukan: ' +
                tombolHari.length +
                ' → skip harian, langsung mingguan'
            );

            sedangMemprosesHarian = false;

            await delay(500);

            await mulaiMingguan();

            return;
        }


        logSuccess(
            'Ditemukan 7 tombol hari'
        );


        // ========================================================
        // SENIN
        // ========================================================

        await prosesHari(0);


        sedangMemprosesHarian = false;
    }


    // ============================================================
    // START
    // ============================================================

    setTimeout(
        start,
        300
    );

})();