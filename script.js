// Spatial Liquid Glass — single-page engine
// i18n (single source: assets/translations.js), ambient canvas,
// cursor light, magnetic buttons, accessible dialog.

(function () {
    'use strict';

    const root = document.documentElement;
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FINE_POINTER = window.matchMedia('(pointer: fine)').matches;

    let translations = {};

    // Safe localStorage (won't crash in private/blocked storage)
    const store = {
        get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
        set(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* ignore */ } }
    };

    init();

    function init() {
        initI18n();            // read translations, then set language
        initApp();
    }

    function initApp() {
        setupNavigation();
        setupClock();
        setupDustCanvas();
        setupReveal();
        setupLighting();
        setupDurations();
        setupAvatarOverlay();
        setupMobileAutoHide();
        setupPrintButton();
        setupCopyButtons();
        console.log('%c✦ Spatial CV — QA Game Tester Portfolio', 'color:#38bdf8; font-size:14px; font-weight:bold;');
    }

    /* ==================== I18N ==================== */

    function initI18n() {
        const data = (typeof window.__I18N__ === 'object') ? window.__I18N__ : null;
        if (data && data.ru && data.en) {
            translations = data;
        } else {
            // Fall back to the English defaults already present in the HTML.
            console.warn('[i18n] Translations unavailable, using built-in English defaults.');
            translations = {};
        }
        setupLanguageSwitcher();
    }

    function getNested(obj, path) {
        return path.split('.').reduce((p, c) => (p && p[c] !== undefined) ? p[c] : undefined, obj);
    }

    function setupLanguageSwitcher() {
        const buttons = document.querySelectorAll('.lang-option');
        const urlLang = new URLSearchParams(location.search).get('lang');

        let lang = urlLang || store.get('cv_lang');
        if (!lang) {
            lang = (navigator.language || '').toLowerCase().startsWith('ru') ? 'ru' : 'en';
        }
        lang = (lang === 'ru') ? 'ru' : 'en';

        setLanguage(lang);

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const next = btn.dataset.lang;
                if (next === (root.lang === 'ru' ? 'ru' : 'en')) return;
                warmLanguageFonts().then(() => setLanguage(next));
            });
        });

        // Первое посещение: заранее прогреваем глифы кириллицы, чтобы первый клик
        // по RU был мгновенным. Во время первого рендера главный поток не занимаем:
        // ждём `load`, потом — простоя браузера.
        function preloadLater() {
            const idle = window.requestIdleCallback || (fn => setTimeout(fn, 1200));
            idle(() => warmLanguageFonts(), { timeout: 3000 });
        }
        if (document.readyState === 'complete') preloadLater();
        else window.addEventListener('load', preloadLater, { once: true });
    }

    // При переключении языка в него подгружаются глифы кириллицы (Unbounded/Manrope).
    // Грузим их заранее и переключаемся только когда они готовы: иначе текст
    // на мгновение показывается системным шрифтом и «перескакивает» по строкам.
    const FONT_READY_MS = 800;
    let fontWarm = false;

    function warmLanguageFonts() {
        if (fontWarm || !document.fonts) return Promise.resolve();
        fontWarm = true;
        const probes = ['16px Unbounded', '600 16px Unbounded', '16px Manrope', '600 16px Manrope'];
        // Кириллица отсутствует в латинском subset'е, поэтому браузер вынужден
        // запросить нужные fonts.gstatic.com-файлы.
        const loads = probes.map(f => (document.fonts.load(f, 'їж').then(r => r && r.length) || Promise.resolve()).catch(() => 0));
        return Promise.race([
            Promise.all(loads),
            new Promise(resolve => setTimeout(resolve, FONT_READY_MS))
        ]);
    }

    function setLanguage(lang) {
        root.lang = lang;
        root.classList.remove('lang-ru', 'lang-en');
        root.classList.add('lang-' + lang);

        document.querySelectorAll('.lang-option').forEach(btn => {
            const active = btn.dataset.lang === lang;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });

        store.set('cv_lang', lang);
        applyDOMTranslations(lang);
        applyDurationLanguage(lang);
        syncLangUrl(lang);
        updateSeoTags(lang);

        // Reveal the page now that translations are applied.
        root.classList.add('i18n-ready');
    }

    // В адресной строке держим только ?lang=… — без якорей секций (#experience и т.п.),
    // чтобы клик по навигации не оставлял в URL мусор, который потом копируется в ссылку.
    function syncLangUrl(lang) {
        try {
            const url = new URL(location.href);
            if (url.searchParams.get('lang') === lang && !url.hash) return;
            url.hash = ''; // removeHash/сеттер не трогают прокрутку
            url.searchParams.set('lang', lang);
            history.replaceState(null, '', url);
        } catch (e) { /* non-critical */ }
    }

    function updateSeoTags(lang) {
        // Базовая ссылка на сайт
        const baseUrl = 'https://viktorfedoruk.github.io/game_qa_cv/';
        
        // Если язык русский, добавляем параметр, иначе оставляем чистый URL
        const currentUrl = (lang === 'ru') ? baseUrl + '?lang=ru' : baseUrl;

        // 1. Обновляем canonical (главную ссылку для Google)
        const canonicalTag = document.querySelector('link[rel="canonical"]');
        if (canonicalTag) {
            canonicalTag.setAttribute('href', currentUrl);
        }

        // 2. Обновляем og:url (ссылку для соцсетей)
        const ogUrlTag = document.querySelector('meta[property="og:url"]');
        if (ogUrlTag) {
            ogUrlTag.setAttribute('content', currentUrl);
        }
    }

    function applyDOMTranslations(lang) {
        const langData = translations[lang];
        if (!langData) return;

        if (langData.meta) {
            if (langData.meta.title) document.title = langData.meta.title;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc && langData.meta.description) metaDesc.setAttribute('content', langData.meta.description);
        }

        const year = new Date().getFullYear();

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const val = getNested(langData, el.dataset.i18n);
            if (val === undefined || val === null) return;
            let text = String(val);
            if (el.dataset.i18nYear === 'true') text = text.replace(/\{year\}/g, year);
            const target = el.dataset.i18nTarget;
            if (target === 'placeholder') el.placeholder = text;
            else if (target === 'title') el.title = text;
            else el.textContent = text;
        });

        document.querySelectorAll('[data-i18n-alt]').forEach(el => {
            const val = getNested(langData, el.dataset.i18nAlt);
            if (val !== undefined && val !== null) el.setAttribute('alt', String(val));
        });

        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const val = getNested(langData, el.dataset.i18nAria);
            if (val !== undefined && val !== null) el.setAttribute('aria-label', String(val));
        });
    }

    /* ==================== NAVIGATION ==================== */

    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('.landing-section');

        // Пока идёт плавная прокрутка, вызванная кликом по пункту меню,
        // onScroll не должен перебивать выбранный пункт — иначе активный
        // фон мигает на несколько кадров, пока скролл не дойдёт до раздела.
        let lockedUntil = 0;
        let lockTarget = null;
        const HEADER_OFFSET = 140; // отступ от верха: под него «прилипает» раздел

        let activeId = '';
        function setActive(id) {
            activeId = id;
            navLinks.forEach(link => {
                const isActive = link.getAttribute('href') === '#' + id;
                link.classList.toggle('active', isActive);
                if (isActive) link.setAttribute('aria-current', 'page');
                else link.removeAttribute('aria-current');
            });
        }

        // Какой раздел сейчас на экране — с поправкой на «липкую» верхнюю зону.
        // Берём верх раздела минус отступ и смотрим, какой раздел ближе всего к верху:
        // так корректно и когда раздел уже прилип к верху, и когда мы чуть не доехали.
        function sectionAtViewport() {
            const probe = window.scrollY + HEADER_OFFSET;
            let current = sections.length ? sections[0].id : '';
            for (const sec of sections) {
                if (sec.offsetTop - HEADER_OFFSET / 2 <= probe) current = sec.id;
            }
            return current;
        }

        // Снимаем блокировку, когда долистали до нужного раздела
        // (или по таймауту — на случай, если раздел уже был на экране).
        function releaseLockWhenArrived() {
            if (!lockTarget) return;
            const sec = document.getElementById(lockTarget);
            if (!sec) { lockTarget = null; return; }
            const delta = sec.getBoundingClientRect().top;
            if (Math.abs(delta) < 4 || performance.now() >= lockedUntil) {
                const arrived = lockTarget;
                lockTarget = null;
                // после прибытия подсветка берётся по фактической позиции раздела
                setActive(arrived === 'hero' ? 'hero' : sectionAtViewport());
            } else {
                requestAnimationFrame(releaseLockWhenArrived);
            }
        }

        navLinks.forEach(link => {
            link.addEventListener('click', e => {
                const targetId = link.getAttribute('href');
                const target = document.querySelector(targetId);
                if (!target) return;
                e.preventDefault();
                scrollToSection(targetId, true);
            });
        });

        // Плавный переход к разделу без записи якоря в адресную строку (?lang=… остаётся,
        // но #experience/#projects/… туда не попадают).
        function scrollToSection(targetId, setActiveLink) {
            const target = document.querySelector(targetId);
            if (!target) return;
            const id = targetId.slice(1);
            lockTarget = id;
            // страховочный таймаут: плавная прокрутка обычно < 800 мс
            lockedUntil = performance.now() + (REDUCED ? 0 : 1200);
            if (setActiveLink) setActive(id);
            target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
            requestAnimationFrame(releaseLockWhenArrived);
            // Браузеру нечего писать в URL: навигация уже сделана через scrollIntoView.
            // Так переход из hero-карточки не оставляет #experience даже на мгновение.
            if (location.hash && history.replaceState) {
                history.replaceState(null, '', location.pathname + location.search);
            }
        }

        // Ссылки-переходы по всему документу: пилюли и кнопки в hero-карточке
        // (#experience / #projects / #tools / #contact) и skip-link. Без этого браузер
        // сам дописывал якорь в адресную строку.
        document.addEventListener('click', e => {
            const a = e.target.closest && e.target.closest('a[href^="#"]');
            if (!a) return;
            const href = a.getAttribute('href');
            if (href.length < 2) return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            scrollToSection(href, !!a.classList.contains('nav-link'));
        });

        let ticking = false;
        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                // клик уже выбрал пункт — не перебиваем его до прибытия,
                // но и не теряем подсветку выбранного раздела (в т.ч. при клике из hero)
                if (lockTarget) {
                    if (activeId !== lockTarget) setActive(lockTarget);
                    ticking = false;
                    return;
                }
                const scrollPos = window.scrollY + HEADER_OFFSET;
                const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 140;
                let current = sections.length ? sections[sections.length - 1].id : '';

                if (!nearBottom) {
                    for (const sec of sections) {
                        const top = sec.offsetTop;
                        const height = sec.offsetHeight;
                        if (scrollPos >= top && scrollPos < top + height) { current = sec.id; break; }
                    }
                }
                if (current) setActive(current);
                ticking = false;
            });
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ==================== CLOCK ==================== */

    function setupClock() {
        const container = document.getElementById('currentTime');
        if (!container) return;
        const el = container.querySelector('span');
        if (!el) return;

        const pad = n => String(n).padStart(2, '0');
        let timer = null;

        // Каждое обновление выровнено по границе секунды (а не «каждые 1000 мс» с дрейфом)
        // и останавливается, пока вкладка скрыта.
        const update = () => {
            const now = new Date();
            el.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
            timer = setTimeout(update, 1000 - (Date.now() % 1000));
        };
        const start = () => { if (timer === null) update(); };
        const stop = () => { if (timer !== null) { clearTimeout(timer); timer = null; } };
        document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
        start();
    }

    /* ==================== AMBIENT PARTICLE FIELD ==================== */

    function setupDustCanvas() {
        const canvas = document.getElementById('dustCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        let W = 0, H = 0;
        let particles = [];
        let rafId = null;
        let lastT = 0;

        const SPEC = [
            { hex: '#67e8f9', rgba: 'rgba(103,232,249,' },
            { hex: '#38bdf8', rgba: 'rgba(56,189,248,' },
            { hex: '#34d399', rgba: 'rgba(52,211,153,' },
            { hex: '#cbd5e1', rgba: 'rgba(203,213,225,' }
        ];

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = window.innerWidth;
            H = window.innerHeight;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            build();
        }

        function build() {
            const count = Math.min(100, Math.max(45, Math.round((W * H) / 15000)));
            particles = Array.from({ length: count }, () => {
                const orb = Math.random() < 0.16;
                return {
                    x: Math.random() * W,
                    y: Math.random() * H,
                    r: orb ? 1.8 + Math.random() * 2.4 : 0.4 + Math.random() * 1.2,
                    o: orb ? 0.05 + Math.random() * 0.07 : 0.07 + Math.random() * 0.26,
                    rise: 0.05 + Math.random() * 0.15,
                    swayA: 0.08 + Math.random() * 0.22,
                    swayF: 0.15 + Math.random() * 0.35,
                    twF: 0.3 + Math.random() * 0.6,
                    ph: Math.random() * Math.PI * 2,
                    spec: SPEC[(Math.random() * SPEC.length) | 0],
                    orb: orb
                };
            });
        }

        // Пока пыль полностью скрыта первым экраном (hero-карточка с blur), кадры
        // пропускаем: в покое canvas ничего не рисует, на экране выглядит как раньше.
        let dustVisible = true;
        if ('IntersectionObserver' in window) {
            dustVisible = false;
            new IntersectionObserver(entries => {
                dustVisible = entries[entries.length - 1].isIntersecting;
            }, { threshold: 0 }).observe(canvas);
        }

        function draw(t, dt) {
            if (!dustVisible) return;
            ctx.clearRect(0, 0, W, H);
            const tSec = t * 0.001;

            for (const p of particles) {
                // gentle upward drift + organic lateral sway
                p.y -= p.rise * dt;
                p.x += Math.sin(tSec * p.swayF + p.ph) * p.swayA * dt;

                if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
                else if (p.y > H + 10) { p.y = -10; }
                if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;

                // soft twinkle
                const tw = 0.62 + 0.38 * Math.sin(tSec * p.twF + p.ph);
                const a = Math.max(0, Math.min(1, p.o * tw));

                if (p.orb) {
                    const rad = p.r * 5;
                    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
                    g.addColorStop(0, p.spec.rgba + a.toFixed(3) + ')');
                    g.addColorStop(1, p.spec.rgba + '0)');
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.globalAlpha = a;
                ctx.fillStyle = p.spec.hex;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        function loop(t) {
            const dt = lastT ? Math.min(50, t - lastT) / 16.667 : 1;
            lastT = t;
            draw(t, dt);
            rafId = requestAnimationFrame(loop);
        }

        resize();
        if (REDUCED) {
            draw(0, 1); // single static frame
        } else {
            rafId = requestAnimationFrame(loop);
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
                    lastT = 0;
                } else if (!rafId) {
                    rafId = requestAnimationFrame(loop);
                }
            });
        }

        window.addEventListener('resize', () => {
            resize();
            if (REDUCED) draw(0, 1);
        });
    }

    /* ==================== REVEAL ON SCROLL ==================== */

    function setupReveal() {
        if (REDUCED || !('IntersectionObserver' in window)) return;
        const cards = document.querySelectorAll(
            '.advantage-card, .education-card, .contact-card, .availability-card, .skill-category, .tool-card, .project-card, .experience-card'
        );

        const observer = new IntersectionObserver((entries, obs) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            }
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        cards.forEach(card => {
            card.classList.add('reveal');
            observer.observe(card);
        });
    }

    /* ==================== LIGHTING: parallax, shimmer, magnetic ==================== */

    function setupLighting() {
        if (!FINE_POINTER || REDUCED) return;

        let px = 0, py = 0;

        window.addEventListener('pointermove', e => {
            px = e.clientX;
            py = e.clientY;
        }, { passive: true });

        // Ambient rotation of the iridescent border + background parallax.
        // Визуал тот же, но --angle больше не пишется 60 раз в секунду в покое:
        // пока двигается курсор — полная скорость (как раньше), без движения — плавный
        // дрейф с редкими шагами, в скрытой вкладке — на паузе.
        const FULL_MS = 1200;
        const IDLE_STEP = 250;   // мс между шагами дрейфа в покое
        const STEP = 0.24;       // 0.015°/мс × 16 мс — шаг кадра (≈24 с на оборот)
        let lastMove = performance.now();
        let angle = 0;

        window.addEventListener('pointermove', () => {
            lastMove = performance.now();
        }, { passive: true });

        function ambient(ts) {
            const moving = performance.now() - lastMove < FULL_MS;
            angle = (angle + (moving ? STEP : STEP * IDLE_STEP / 16.7)) % 360;
            root.style.setProperty('--angle', angle.toFixed(2) + 'deg');

            const nx = (px / window.innerWidth) * 2 - 1;
            const ny = (py / window.innerHeight) * 2 - 1;
            root.style.setProperty('--px', nx.toFixed(3));
            root.style.setProperty('--py', ny.toFixed(3));

            if (moving) requestAnimationFrame(ambient);
            else setTimeout(() => requestAnimationFrame(ambient), IDLE_STEP);
        }
        requestAnimationFrame(ambient);

        // Per-card specular highlight (local coords).
        document.querySelectorAll('.glass').forEach(card => {
            card.addEventListener('pointermove', e => {
                const r = card.getBoundingClientRect();
                card.style.setProperty('--lx', (((e.clientX - r.left) / r.width) * 100).toFixed(2) + '%');
                card.style.setProperty('--ly', (((e.clientY - r.top) / r.height) * 100).toFixed(2) + '%');
            });
        });

        // Magnetic buttons.
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('pointermove', e => {
                const r = btn.getBoundingClientRect();
                const dx = (e.clientX - (r.left + r.width / 2)) * 0.16;
                const dy = (e.clientY - (r.top + r.height / 2)) * 0.26;
                btn.style.setProperty('--mx', dx.toFixed(1) + 'px');
                btn.style.setProperty('--my', dy.toFixed(1) + 'px');
            });
            btn.addEventListener('pointerleave', () => {
                btn.style.setProperty('--mx', '0px');
                btn.style.setProperty('--my', '0px');
            });
        });
    }

    /* ==================== DURATIONS ==================== */

    function parseDate(str) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
    }

    function calcDuration(startStr, endStr) {
        const start = parseDate(startStr);
        const end = endStr ? parseDate(endStr) : new Date();
        let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        if (end.getDate() >= start.getDate()) months++;
        const years = Math.floor(months / 12);
        return { years, months: months % 12 };
    }

    function ruYear(c) { return c === 1 ? 'год' : (c >= 2 && c <= 4 ? 'года' : 'лет'); }
    function ruMonth(c) { return c === 1 ? 'месяц' : (c >= 2 && c <= 4 ? 'месяца' : 'месяцев'); }

    function formatDuration(d, lang) {
        const parts = [];
        if (lang === 'ru') {
            if (d.years) parts.push(d.years + ' ' + ruYear(d.years));
            if (d.months) parts.push(d.months + ' ' + ruMonth(d.months));
            if (!parts.length) parts.push('0 месяцев');
        } else {
            if (d.years) parts.push(d.years + (d.years === 1 ? ' year' : ' years'));
            if (d.months) parts.push(d.months + (d.months === 1 ? ' month' : ' months'));
            if (!parts.length) parts.push('0 months');
        }
        return parts.join(' ');
    }

    function compactDuration(d, lang) {
        if (lang === 'ru') {
            const y = d.years ? `${d.years} ${ruYear(d.years)}` : '';
            const m = d.months ? `${d.months} мес.` : '';
            return [y, m].filter(Boolean).join(' ') || '0 мес.';
        }
        const y = d.years ? `${d.years} yr` : '';
        const m = d.months ? `${d.months} mo` : '';
        return [y, m].filter(Boolean).join(' ') || '0 mo';
    }

    function setupDurations() {
        document.querySelectorAll('.timeline-duration[data-start]').forEach(el => {
            const d = calcDuration(el.dataset.start, el.dataset.end);
            el.dataset.ru = formatDuration(d, 'ru');
            el.dataset.en = formatDuration(d, 'en');
        });

        const expPill = document.querySelector('.stat-pill[data-experience-start]');
        if (expPill) {
            const valueEl = expPill.querySelector('.status-value');
            if (valueEl) {
                const d = calcDuration(expPill.getAttribute('data-experience-start'), null);
                valueEl.dataset.ru = compactDuration(d, 'ru');
                valueEl.dataset.en = compactDuration(d, 'en');
            }
        }

        applyDurationLanguage(currentLang());
    }

    function applyDurationLanguage(lang) {
        document.querySelectorAll('.timeline-duration, .status-value').forEach(el => {
            if (el.dataset[lang]) el.textContent = el.dataset[lang];
        });
    }

    function currentLang() {
        return store.get('cv_lang') || (root.lang === 'ru' ? 'ru' : 'en');
    }

    /* ==================== MOBILE AUTO-HIDE (nav + language switcher) ==================== */

    function setupMobileAutoHide() {
        const mq = window.matchMedia('(max-width: 768px)');
        const nav = document.getElementById('mainNav');
        const switcher = document.querySelector('.language-switcher');
        if (!nav || !switcher) return;

        let lastY = window.scrollY;
        let hidden = false;

        function update() {
            const y = window.scrollY;
            const delta = y - lastY;
            lastY = y;

            if (!mq.matches) {
                if (hidden) {
                    nav.classList.remove('hidden');
                    switcher.classList.remove('hidden');
                    hidden = false;
                }
                return;
            }

            if (y <= 8 || delta < -6) {
                if (hidden) {
                    nav.classList.remove('hidden');
                    switcher.classList.remove('hidden');
                    hidden = false;
                }
            } else if (delta > 6 && y > 96) {
                if (!hidden) {
                    nav.classList.add('hidden');
                    switcher.classList.add('hidden');
                    hidden = true;
                }
            }
        }

        window.addEventListener('scroll', update, { passive: true });
        mq.addEventListener('change', update);
        update();
    }

    /* ==================== COPY CONTACT ==================== */

    // Копирование значения из карточки контакта. Атрибут data-copy содержит именно
    // то, что удобно вставить (адрес, ссылку, ник), а подпись показывается
    // в aria-label кнопки и в подписи карточки — на текущем языке.
    function setupCopyButtons() {
        const buttons = document.querySelectorAll('.copy-btn[data-copy]');
        if (!buttons.length) return;

        const msg = (key, fallback) => {
            const dict = (typeof window.__I18N__ === 'object' && window.__I18N__) ? window.__I18N__[root.lang === 'ru' ? 'ru' : 'en'] : null;
            const val = key.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, dict);
            return (val === undefined || val === null) ? fallback : String(val);
        };

        function fallbackCopy(text) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            document.body.removeChild(ta);
            return ok;
        }

        function copyText(text) {
            if (navigator.clipboard && window.isSecureContext) {
                return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
            }
            return Promise.resolve(fallbackCopy(text));
        }

        buttons.forEach(btn => {
            let resetTimer = null;
            btn.addEventListener('click', () => {
                const value = btn.getAttribute('data-copy');
                if (!value) return;
                copyText(value).then(ok => {
                    const key = btn.dataset.i18nAria;
                    const label = btn.getAttribute('aria-label') || '';
                    // Мгновенная визуальная реакция: иконка меняется на галочку.
                    btn.classList.add('is-copied');
                    if (ok) btn.setAttribute('aria-label', msg('contact.copied', 'Copied'));
                    clearTimeout(resetTimer);
                    resetTimer = setTimeout(() => {
                        btn.classList.remove('is-copied');
                        btn.setAttribute('aria-label', label);
                    }, 1400);
                });
            });
        });
    }

    /* ==================== PRINT / PDF ==================== */

    function setupPrintButton() {
        const btn = document.getElementById('downloadPdf');
        if (btn) btn.addEventListener('click', () => window.print());
    }

    /* ==================== AVATAR + OVERLAY DIALOG ==================== */

    function setupAvatarOverlay() {
        const avatar = document.querySelector('.avatar-image');
        const overlay = document.getElementById('avatarOverlay');
        const overlayImage = document.getElementById('overlayImage');
        const closeBtn = document.getElementById('overlayClose');
        const backdrop = document.querySelector('.overlay-backdrop');
        if (!avatar || !overlay || !overlayImage || !closeBtn || !backdrop) return;

        // Entrance fade once loaded
        function showAvatar() {
            avatar.style.opacity = '1';
            avatar.style.transform = 'scale(1)';
        }
        avatar.addEventListener('load', showAvatar);
        avatar.style.opacity = '0';
        avatar.style.transform = 'scale(.85)';
        avatar.style.transition = 'opacity .8s ease, transform .8s ease';
        if (avatar.complete) showAvatar();

        // Offline-safe fallback
        avatar.addEventListener('error', function onError() {
            avatar.removeEventListener('error', onError);
            avatar.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=QAEngineer';
        });

        let lastFocus = null;

        function setBackgroundInert(inert) {
            const main = document.getElementById('mainContent');
            const nav = document.getElementById('mainNav');
            const switcher = document.querySelector('.language-switcher');
            if (main) main.inert = inert;
            if (nav) nav.inert = inert;
            if (switcher) switcher.inert = inert;
        }

        function open() {
            lastFocus = document.activeElement;
            overlayImage.src = avatar.currentSrc || avatar.src;
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            setBackgroundInert(true);
            closeBtn.focus();
        }

        function close() {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            setBackgroundInert(false);
            if (lastFocus && lastFocus.focus) lastFocus.focus();
        }

        avatar.addEventListener('click', open);
        avatar.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                open();
            }
        });

        closeBtn.addEventListener('click', close);
        backdrop.addEventListener('click', close);

        overlay.addEventListener('keydown', e => {
            if (e.key === 'Escape') { close(); return; }
            if (e.key !== 'Tab') return;

            const focusables = overlay.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });
    }
})();
