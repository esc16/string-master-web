/**
 * String Master Web - Shared 10-Language i18n Engine
 * Priority: 1) URL ?lang=  2) Manual localStorage choice  3) Browser/Safari language  4) English fallback
 */
(function (global) {
    const STORAGE_KEY = 'sm_web_lang';
    const SUPPORTED = ['en', 'ko', 'ja', 'es', 'zh', 'zh_Hant', 'de', 'fr', 'it', 'pt'];

    function normalizeLang(raw) {
        if (!raw) return null;
        const cleaned = String(raw).trim();
        if (SUPPORTED.includes(cleaned)) return cleaned;
        const lower = cleaned.toLowerCase().replace(/_/g, '-');
        // Handle Safari/iOS/macOS Traditional Chinese codes (zh-Hant-TW, zh-Hant-HK, zh-TW, zh-HK, zh-MO)
        if (lower.startsWith('zh-hant') || lower.includes('-tw') || lower.includes('-hk') || lower.includes('-mo')) {
            return 'zh_Hant';
        }
        if (lower.startsWith('zh')) return 'zh';
        const base = lower.split('-')[0];
        if (SUPPORTED.includes(base)) return base;
        return null;
    }

    function detectInitialLang(useHashLang) {
        const params = new URLSearchParams(window.location.search);
        const fromQuery = normalizeLang(params.get('lang'));
        if (fromQuery) return fromQuery;

        if (useHashLang && window.location.hash) {
            const fromHash = normalizeLang(window.location.hash.replace(/^#/, ''));
            if (fromHash) return fromHash;
        }

        try {
            const saved = normalizeLang(localStorage.getItem(STORAGE_KEY));
            if (saved) return saved;
        } catch {}

        const navLangs = (navigator.languages && navigator.languages.length)
            ? navigator.languages
            : [navigator.language || navigator.userLanguage];

        for (const l of navLangs) {
            const matched = normalizeLang(l);
            if (matched) return matched;
        }
        return 'en';
    }

    function syncInternalLinks(code) {
        const links = document.querySelectorAll('a[href]');
        links.forEach((a) => {
            const rawHref = a.getAttribute('href');
            if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('http://') || rawHref.startsWith('https://') || rawHref.startsWith('mailto:')) {
                return;
            }
            const cleanBase = rawHref.split('#')[0].split('?')[0];
            // For local HTML pages, carry ?lang= when non-English (preserving any #hash)
            if (cleanBase.endsWith('.html')) {
                const hashIdx = rawHref.indexOf('#');
                const hash = hashIdx !== -1 ? rawHref.slice(hashIdx) : '';
                const nextHref = code === 'en' ? (cleanBase + hash) : (cleanBase + '?lang=' + encodeURIComponent(code) + hash);
                a.setAttribute('href', nextHref);
            }
        });
    }

    function initStringMasterI18n(dictByLang, options) {
        const opts = options || {};
        let currentCode = 'en';

        function applyLanguage(lang, isManualChange) {
            const code = dictByLang[lang] ? lang : 'en';
            const dict = dictByLang[code] || dictByLang.en;
            currentCode = code;

            document.documentElement.lang = code === 'zh_Hant' ? 'zh-Hant' : code;
            if (dict.pageTitle) document.title = dict.pageTitle;

            document.querySelectorAll('[data-i18n]').forEach((el) => {
                const key = el.getAttribute('data-i18n');
                if (dict[key] !== undefined) el.textContent = dict[key];
            });

            document.querySelectorAll('[data-i18n-html]').forEach((el) => {
                const key = el.getAttribute('data-i18n-html');
                if (dict[key] !== undefined) el.innerHTML = dict[key];
            });

            document.querySelectorAll('.sm-lang-select, #langSelect').forEach((sel) => {
                sel.value = code;
            });

            syncInternalLinks(code);

            if (isManualChange) {
                try { localStorage.setItem(STORAGE_KEY, code); } catch {}
                try {
                    const url = new URL(window.location.href);
                    if (code === 'en') url.searchParams.delete('lang');
                    else url.searchParams.set('lang', code);
                    if (opts.useHashLang) url.hash = '';
                    window.history.replaceState({}, '', url.toString());
                } catch {}
            }

            if (typeof opts.onChange === 'function') {
                opts.onChange(code, dict);
            }
        }

        function boot() {
            const initial = detectInitialLang(Boolean(opts.useHashLang));
            applyLanguage(initial, false);

            document.querySelectorAll('.sm-lang-select, #langSelect').forEach((sel) => {
                sel.addEventListener('change', (e) => applyLanguage(e.target.value, true));
            });

            if (opts.useHashLang) {
                window.addEventListener('hashchange', () => {
                    const fromHash = normalizeLang(window.location.hash.replace(/^#/, ''));
                    if (fromHash) applyLanguage(fromHash, false);
                });
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
        } else {
            boot();
        }

        return {
            getLang: () => currentCode,
            getDict: () => dictByLang[currentCode] || dictByLang.en,
            setLang: (code) => applyLanguage(code, true),
        };
    }

    global.initStringMasterI18n = initStringMasterI18n;
})(window);
