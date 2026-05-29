// Основной скрипт для Sci-Fi CV сайта

document.addEventListener('DOMContentLoaded', function() {
    // Инициализация
    init();
    
    function init() {
        // Установка языка
        setupLanguage();
        
        // Инициализация навигации
        setupNavigation();
        
        // Инициализация времени
        setupTime();
        
        // Инициализация частиц
        setupParticles();
        
        // Инициализация анимаций
        setupAnimations();
        
        // Инициализация консоли
        setupConsole();

        // Инициализация подсчета длительности работы
        setupTimelineDurations();

        // Инициализация подсчета общего опыта работы
        setupExperienceDuration();

        // Инициализация аватара 
        setupAvatarOverlay();
        
        // Консольное сообщение
        console.log('%c🚀 QA Game Tester CV Loaded', 'color: #0ea5e9; font-size: 16px; font-weight: bold;');
        console.log('%cSystem: Sci-Fi Interface Active', 'color: #06b6d4;');
    }
    
   // ===== НАСТРОЙКА ЯЗЫКА =====
function setupLanguage() {
    const html = document.getElementById('html');
    const langOptions = document.querySelectorAll('.lang-option');
    
    // Проверяем сохранённый язык, иначе по умолчанию 'en'
    const savedLang = localStorage.getItem('cv_lang');
    const currentLang = savedLang || 'en';   // всегда дефолт 'en'
    
    // Устанавливаем язык
    setLanguage(currentLang);
    
    // Обработка кликов по переключателю языка
    langOptions.forEach(option => {
        option.addEventListener('click', function() {
            const lang = this.dataset.lang;
            setLanguage(lang);
            saveLanguage(lang); // сохраняем выбор
        });
    });
}

function setLanguage(lang) {
    const html = document.getElementById('html');
    const langOptions = document.querySelectorAll('.lang-option');

    html.className = `lang-${lang}`;

    langOptions.forEach(option => {
        option.classList.remove('active');
        if (option.dataset.lang === lang) {
            option.classList.add('active');
        }
    });

    // Применяем длительность на новом языке
    applyDurationLanguage(lang);
    saveLanguage(lang);
    applyExperienceLanguage(lang);

    // Выводим сообщение в терминал
    const consoleOutput = document.getElementById('consoleOutput');
    if (consoleOutput && typeof addLogEntry === 'function') {
        const now = new Date();
        const time = `[${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}]`;
        const messages = {
            ru: `Язык интерфейса изменён на: ${lang.toUpperCase()}`,
            en: `Interface language switched to: ${lang.toUpperCase()}`
        };
        addLogEntry(time, messages.ru, messages.en);
    }
}

function saveLanguage(lang) {
    localStorage.setItem('cv_lang', lang);
}

// Скрытие переключателя при скролле
document.addEventListener("scroll", function() {
    const switcher = document.querySelector(".language-switcher");
    if (window.scrollY > 0) {
        switcher.classList.add("hidden");
    } else {
        switcher.classList.remove("hidden");
    }
});
    
    // ===== НАВИГАЦИЯ =====
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    // Отключаем восстановление скролла браузером
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    function setActiveLink(targetId) {
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === targetId);
        });
    }

    // Плавная прокрутка при клике
    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveLink(targetId);
                activateSection(targetId);
            }
        });
    });

    // Определение активной секции при скролле
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrollPosition = window.scrollY + 150;
                let current = '';
                sections.forEach(sec => {
                    const sectionTop = sec.offsetTop;
                    const sectionHeight = sec.clientHeight;
                    if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight - 100) {
                        current = sec.id;
                    }
                });
                if (current) {
                    setActiveLink(`#${current}`);
                    activateSection(`#${current}`);
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    // При обновлении страницы всегда возвращаемся к первой секции
    window.addEventListener('load', () => {
        const hero = document.querySelector('#hero');
        if (hero) {
            hero.scrollIntoView({ behavior: 'auto', block: 'start' });
            setActiveLink('#hero');
            activateSection('#hero');
        }
    });
}

function activateSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === sectionId.replace('#', '')) {
            section.classList.add('active');
        }
    });
}
    
    // ===== ВРЕМЯ =====
    function setupTime() {
        const timeElement = document.getElementById('currentTime').querySelector('span');
        
        function updateTime() {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            
            timeElement.textContent = `${hours}:${minutes}:${seconds}`;
        }
        
        updateTime();
        setInterval(updateTime, 1000);
    }
    
    // ===== ЧАСТИЦЫ =====
function setupParticles() {
    const canvas = document.getElementById('particlesCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let particlesArray = [];
    // Сделали цвета чуть сочнее, чтобы они не терялись на темном фоне
    const colors = ['#38bdf8', '#22d3ee', '#a78bfa', '#6366f1'];
    
    // Единый объект для мыши и тач-скрина
    let pointer = { x: null, y: null, radius: 160, isTargeting: false };
    
    // Внутренний таймер для автоматических фоновых импульсов (чтобы сайт «дышал» сам по себе)
    let autoPulseTimer = 0;

    // Десктопные события
    window.addEventListener('mousemove', (e) => { 
        pointer.x = e.clientX; 
        pointer.y = e.clientY; 
        pointer.isTargeting = true;
    });
    window.addEventListener('mouseout', () => { pointer.isTargeting = false; });

    // Мобильные события (Touch) — оживляют канвас при скролле и тапах
    window.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            pointer.x = e.touches[0].clientX;
            pointer.y = e.touches[0].clientY;
            pointer.isTargeting = true;
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            pointer.x = e.touches[0].clientX;
            pointer.y = e.touches[0].clientY;
            pointer.isTargeting = true;
        }
    }, { passive: true });

    window.addEventListener('touchend', () => { pointer.isTargeting = false; });

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            // Увеличили размер: теперь они варьируются от 1.2px до 3px (заметно, но аккуратно)
            this.size = Math.random() * 1.8 + 1.2; 
            
            // Базовая скорость (чуть-чуть увеличили для живости)
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = (Math.random() - 0.5) * 0.4;
            
            // Эффект мерцания (пульсация собственного размера и прозрачности)
            this.blinkSpeed = Math.random() * 0.02 + 0.005;
            this.blinkAngle = Math.random() * Math.PI;
            
            this.baseOpacity = Math.random() * 0.25 + 0.15; // Подняли минимальную видимость
            this.opacity = this.baseOpacity;
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
            if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;

            // Естественное мерцание, чтобы частицы «жили», даже если экран никто не трогает
            this.blinkAngle += this.blinkSpeed;
            let currentBlink = Math.sin(this.blinkAngle) * 0.1;

            // Взаимодействие с указателем (мышь или палец)
            if (pointer.isTargeting && pointer.x && pointer.y) {
                let dx = pointer.x - this.x;
                let dy = pointer.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < pointer.radius) {
                    // Сильное, но дорогое разгорание рядом с пальцем/курсором
                    this.opacity = Math.min(0.9, this.opacity + 0.06);
                    
                    let force = (pointer.radius - distance) / pointer.radius;
                    // Плавное выталкивание
                    let directionX = (dx / distance) * force * 0.8;
                    let directionY = (dy / distance) * force * 0.8;
                    this.x -= directionX;
                    this.y -= directionY;
                } else if (this.opacity > this.baseOpacity) {
                    this.opacity -= 0.01;
                }
            } else {
                // Если интерактива нет, плавно возвращаем базовую прозрачность + эффект мерцания
                let targetOpacity = this.baseOpacity + currentBlink;
                if (this.opacity > targetOpacity) this.opacity -= 0.01;
                else if (this.opacity < targetOpacity) this.opacity += 0.01;
            }
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.opacity;
            
            // Секрет дороговизны: добавляем мягкое неоновое свечение (glow) для крупных частиц
            if (this.size > 2.2 && this.opacity > 0.4) {
                ctx.shadowBlur = 8;
                ctx.shadowColor = this.color;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            // На мобилках слегка увеличиваем визуальный размер за счет отрисовки
            const renderSize = window.innerWidth < 768 ? this.size * 1.2 : this.size;
            ctx.arc(this.x, this.y, renderSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Сбрасываем тень, чтобы она не размывала соединительные линии (важно для FPS!)
            ctx.shadowBlur = 0;
        }
    }

    // Рассчитываем количество: на мобилках плотность чуть выше относительно площади, чтобы паутина была сочной
    const isMobile = window.innerWidth < 768;
    const densityDivider = isMobile ? 10000 : 14000;
    const numberOfParticles = Math.min(isMobile ? 65 : 120, Math.floor((canvas.width * canvas.height) / densityDivider));
    
    for (let i = 0; i < numberOfParticles; i++) { 
        particlesArray.push(new Particle()); 
    }

    function connectParticles() {
        // На мобильных экранах делаем линии чуть короче, чтобы сетка была аккуратной
        const maxDistance = isMobile ? 85 : 115; 
        
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a + 1; b < particlesArray.length; b++) {
                let dx = particlesArray[a].x - particlesArray[b].x;
                let dy = particlesArray[a].y - particlesArray[b].y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < maxDistance) {
                    let opacity = (1 - (distance / maxDistance)) * 0.16; // Сделали линии чуть контрастнее
                    
                    // Если есть активное касание или движение мыши, подсвечиваем связи сильнее
                    if (pointer.isTargeting && pointer.x && pointer.y) {
                        let mdx = pointer.x - particlesArray[a].x;
                        let mdy = pointer.y - particlesArray[a].y;
                        let mDist = Math.sqrt(mdx * mdx + mdy * mdy);
                        if (mDist < pointer.radius) {
                            opacity *= 2.8; 
                        }
                    }

                    ctx.strokeStyle = particlesArray[a].color;
                    ctx.globalAlpha = opacity;
                    ctx.lineWidth = isMobile ? 0.6 : 0.55; 
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                    ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Автоматический фоновый импульс (невидимая волна, пробегающая по экрану каждые 4 секунды)
        // Она заставляет точки оживать волнами, даже если телефон лежит на столе
        autoPulseTimer += 0.01;
        if (!pointer.isTargeting) {
            let waveX = (Math.sin(autoPulseTimer) * 0.5 + 0.5) * canvas.width;
            let waveY = (Math.cos(autoPulseTimer * 0.7) * 0.5 + 0.5) * canvas.height;
            
            particlesArray.forEach(p => {
                let dx = waveX - p.x;
                let dy = waveY - p.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 130) {
                    p.opacity = Math.min(0.6, p.opacity + 0.02);
                }
            });
        }

        particlesArray.forEach(p => { 
            p.update(); 
            p.draw(); 
        });
        
        connectParticles();
        requestAnimationFrame(animate);
    }
    animate();
}
    
    // ===== АНИМАЦИИ =====
    function setupAnimations() {
        // Анимация карточек при появлении
        const cards = document.querySelectorAll('.advantage-card, .education-card, .contact-item, .skill-item, .testing-type, .tool-item');
        const cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            cardObserver.observe(card);
        });
    }
    
    // ===== КОНСОЛЬ =====

// Функция для форматирования времени
function getFormattedTime() {
    const now = new Date();
    return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
}

// Функция добавления записи в лог (глобальная)
function addLogEntry(time, ruText, enText) {
    const consoleOutput = document.getElementById('consoleOutput');
    if (!consoleOutput) return;

    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';

    logEntry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="ru-text">> ${ruText}</span>
        <span class="en-text">> ${enText}</span>
    `;

    consoleOutput.appendChild(logEntry);

    // Ограничиваем количество записей
    if (consoleOutput.children.length > 10) {
        consoleOutput.removeChild(consoleOutput.firstChild);
    }

    // Прокрутка вниз
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function setupConsole() {
    const consoleOutput = document.getElementById('consoleOutput');

    // Начальные сообщения
    const initialMessages = [
        {time: getFormattedTime(), ru: "Система инициализирована", en: "System initialized"},
        {time: getFormattedTime(), ru: "Загрузка профиля...", en: "Loading profile..."},
        {time: getFormattedTime(), ru: "Профиль загружен", en: "Profile loaded"},
        {time: getFormattedTime(), ru: "Анализ навыков...", en: "Analyzing skills..."},
        {time: getFormattedTime(), ru: "Навыки загружены", en: "Skills loaded"},
        {time: getFormattedTime(), ru: "Готов к работе", en: "Ready for work"},
        {time: getFormattedTime(), ru: "Пользователь обнаружен", en: "User detected"}
    ];

    initialMessages.forEach((msg, index) => {
        setTimeout(() => {
            addLogEntry(msg.time, msg.ru, msg.en);
        }, index * 300);
    });

    // Клик по консоли для добавления тестового лога
    let clickCount = 0;
    const specialLogs = [
        {ru: "Ого, дальше клики!", en: "Wow, more clicks!"},
        {ru: "Любопытство рулит", en: "Curiosity rules"},
        {ru: "Ещё один клик", en: "Another click"},
        {ru: "Ты тестируешь меня", en: "You're testing me"},
        {ru: "Веселье продолжается", en: "Fun goes on"}
    ];

    consoleOutput.addEventListener('click', function() {
        clickCount++;

        if (clickCount % 5 === 0) {
            const index = (clickCount / 5 - 1) % specialLogs.length;
            const specialLog = specialLogs[index];
            addLogEntry(getFormattedTime(), specialLog.ru, specialLog.en);
        } else {
            const testLogs = [
                {ru: "Тестовая проверка... УСПЕШНО", en: "Test check... SUCCESS"},
                {ru: "Анализ завершен", en: "Analysis complete"},
                {ru: "Система стабильна", en: "System stable"},
                {ru: "Готов к новым задачам", en: "Ready for new tasks"},
                {ru: "Камера и микрофон активированы", en: "The camera and microphone are activated"}
            ];
            const randomLog = testLogs[Math.floor(Math.random() * testLogs.length)];
            addLogEntry(getFormattedTime(), randomLog.ru, randomLog.en);
        }
    });
}
    
    // ===== ДОПОЛНИТЕЛЬНЫЕ ЭФФЕКТЫ =====
    // Анимация загрузки аватара
    const avatarImg = document.querySelector('.avatar-image');
    if (avatarImg) {
        function showAvatar() {
            avatarImg.style.opacity = '1';
            avatarImg.style.transform = 'scale(1)';
            avatarImg.classList.add('avatar-loaded');
        }

        avatarImg.addEventListener('load', showAvatar);
        avatarImg.addEventListener('error', function() {
            console.log('Аватар не загружен. Используется placeholder.');
        });

        // Начальное состояние
        avatarImg.style.opacity = '0';
        avatarImg.style.transform = 'scale(0.8)';
        avatarImg.style.transition = 'opacity 0.8s ease, transform 0.8s ease';

        // Если картинка уже закэширована и загружена
        if (avatarImg.complete) {
            showAvatar();
        }
    }
    
    // Параллакс эффект для фона
    let lastX = 0;
    let lastY = 0;
    
    window.addEventListener('mousemove', function(e) {
        const deltaX = (e.clientX - lastX) * 0.05;
        const deltaY = (e.clientY - lastY) * 0.05;
        
        const bgGrid = document.querySelector('.bg-grid');
        if (bgGrid) {
            const currentTransform = bgGrid.style.transform || 'translate(0px, 0px)';
            const matches = currentTransform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/);
            
            let currentX = 0;
            let currentY = 0;
            
            if (matches) {
                currentX = parseFloat(matches[1]);
                currentY = parseFloat(matches[2]);
            }
            
            const newX = Math.max(-20, Math.min(20, currentX + deltaX));
            const newY = Math.max(-20, Math.min(20, currentY + deltaY));
            
            bgGrid.style.transform = `translate(${newX}px, ${newY}px)`;
        }
        
        lastX = e.clientX;
        lastY = e.clientY;
    });
    
    // Инициализация текущего года в футере
    const yearElements = document.querySelectorAll('.footer-info p:first-child');
    yearElements.forEach(element => {
        if (element.textContent.includes('2025')) {
            element.textContent = element.textContent.replace('2025', new Date().getFullYear());
        }
    });

    // ===== АВТОМАТИЧЕСКИЙ ПОДСЧЁТ ДЛИТЕЛЬНОСТИ РАБОТЫ =====
function setupTimelineDurations() {
    const items = document.querySelectorAll('.timeline-date[data-start]');
    const now = new Date();

    items.forEach(item => {
        const startAttr = item.getAttribute('data-start');
        const endAttr = item.getAttribute('data-end');
        if (!startAttr) return;

        // Парсим даты
        const startDate = new Date(startAttr);
        const endDate = endAttr ? new Date(endAttr) : now;

        // Клонируем даты, чтобы не менять оригиналы
        let tempStart = new Date(startDate);
        let tempEnd = new Date(endDate);
        
        // Рассчитываем годы и месяцы через общее количество месяцев
        let totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12
                        + (endDate.getMonth() - startDate.getMonth());

        // Если день окончания >= дня начала — считаем месяц завершённым
        if (endDate.getDate() >= startDate.getDate()) {
            totalMonths++;
        }

        let years = Math.floor(totalMonths / 12);
        let months = totalMonths % 12;

        
        // Если месяцы стали отрицательными после коррекции по дням
        if (months < 0) {
            months += 12;
            years--;
        }

        // Функции для склонения
        function getRussianYearWord(count) {
            if (count === 1) return 'год';
            if (count >= 2 && count <= 4) return 'года';
            return 'лет';
        }

        function getRussianMonthWord(count) {
            if (count === 1) return 'месяц';
            if (count >= 2 && count <= 4) return 'месяца';
            return 'месяцев';
        }

        function getEnglishYearWord(count) {
            return count === 1 ? 'year' : 'years';
        }

        function getEnglishMonthWord(count) {
            return count === 1 ? 'month' : 'months';
        }

        // Форматируем текст с учетом склонений
        let ruText = '';
        let enText = '';

        if (years > 0 && months === 0) {
            // Только годы (ровно)
            ruText = `${years} ${getRussianYearWord(years)}`;
            enText = `${years} ${getEnglishYearWord(years)}`;
        } else if (years > 0) {
            // Годы и месяцы
            ruText = `${years} ${getRussianYearWord(years)} ${months} ${getRussianMonthWord(months)}`;
            enText = `${years} ${getEnglishYearWord(years)} ${months} ${getEnglishMonthWord(months)}`;
        } else {
            // Только месяцы
            ruText = `${months} ${getRussianMonthWord(months)}`;
            enText = `${months} ${getEnglishMonthWord(months)}`;
        }

        // Находим или создаем элемент для отображения
        let durationEl = item.querySelector('.timeline-duration');
        if (!durationEl) {
            durationEl = document.createElement('span');
            durationEl.className = 'timeline-duration';
            item.appendChild(durationEl);
        }

        // Сохраняем данные для обоих языков
        durationEl.dataset.ru = ruText;
        durationEl.dataset.en = enText;
        
        // Устанавливаем текущий язык
        const currentLang = localStorage.getItem('cv_lang') || 'en';
        durationEl.textContent = durationEl.dataset[currentLang];
    });
}

function applyDurationLanguage(lang) {
    document.querySelectorAll('.timeline-duration').forEach(el => {
        if (el.dataset[lang]) {
            el.textContent = el.dataset[lang];
        }
    });
}

// ===== АВТОМАТИЧЕСКИЙ ПОДСЧЁТ ОБЩЕГО ОПЫТА =====
function setupExperienceDuration() {
    const item = document.querySelector('.status-item[data-experience-start]');
    if (!item) return;

    const startAttr = item.getAttribute('data-experience-start');
    if (!startAttr) return;

    const startDate = new Date(startAttr);
    const now = new Date();

    // Считаем общее количество месяцев
    let totalMonths = (now.getFullYear() - startDate.getFullYear()) * 12
                    + (now.getMonth() - startDate.getMonth());

    if (now.getDate() >= startDate.getDate()) {
        totalMonths++;
    }

    let years = Math.floor(totalMonths / 12);
    let months = totalMonths % 12;

    // Сокращённые обозначения для маленького контейнера
    function getRussianYearWord(count) {
        return 'г.'; // единый вариант
    }
    function getRussianMonthWord(count) {
        return 'м.'; // единый вариант
    }
    function getEnglishYearWord(count) {
        return 'y.'; // единый вариант
    }
    function getEnglishMonthWord(count) {
        return 'm.'; // единый вариант
    }


    // Форматируем строки
    let ruText = '';
    let enText = '';

    if (years > 0 && months === 0) {
        ruText = `${years} ${getRussianYearWord(years)}`;
        enText = `${years} ${getEnglishYearWord(years)}`;
    } else if (years > 0) {
        ruText = `${years} ${getRussianYearWord(years)} ${months} ${getRussianMonthWord(months)}`;
        enText = `${years} ${getEnglishYearWord(years)} ${months} ${getEnglishMonthWord(months)}`;
    } else {
        ruText = `${months} ${getRussianMonthWord(months)}`;
        enText = `${months} ${getEnglishMonthWord(months)}`;
    }

    // Записываем в элемент
    const valueEl = item.querySelector('.status-value');
    if (valueEl) {
        valueEl.dataset.ru = ruText;
        valueEl.dataset.en = enText;

        const currentLang = localStorage.getItem('cv_lang') || 'en';
        valueEl.textContent = valueEl.dataset[currentLang];
    }
}

// Переключение языка для опыта
function applyExperienceLanguage(lang) {
    document.querySelectorAll('.status-value').forEach(el => {
        if (el.dataset[lang]) {
            el.textContent = el.dataset[lang];
        }
    });
}

//Всплывающий аватар
function setupAvatarOverlay() {
    console.log('🔧 Инициализация всплывающего аватара...');
    
    const avatarImage = document.querySelector('.avatar-image');
    if (!avatarImage) {
        console.warn('⚠️ Аватар не найден');
        return;
    }
    
    // Создаем оверлей, если его нет
    if (!document.getElementById('avatarOverlay')) {
        createAvatarOverlay();
    }
    
    const overlay = document.getElementById('avatarOverlay');
    const overlayImage = document.getElementById('overlayImage');
    const overlayClose = document.getElementById('overlayClose');
    const overlayBackdrop = document.querySelector('.overlay-backdrop');
    
    // Добавляем курсор
    avatarImage.style.cursor = 'zoom-in';
    
    // Сохраняем данные для анимации
    let animationData = {
        startRect: null,
        scrollTop: 0,
        isAnimating: false,
        scrollBlocked: false
    };
    
    // Функция блокировки прокрутки (оставляем как было)
    function blockPageScroll() {
        if (animationData.scrollBlocked) return;
        animationData.scrollBlocked = true;
        // ... существующий код блокировки ...
    }
    
    function unblockPageScroll() {
        if (!animationData.scrollBlocked) return;
        animationData.scrollBlocked = false;
        // ... существующий код разблокировки ...
    }
    
    // Обработчик открытия
    avatarImage.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (animationData.isAnimating) return;
        
        // Анимация клика на аватаре
        this.classList.add('clicking');
        setTimeout(() => this.classList.remove('clicking'), 400);
        
        // Сохраняем позицию аватара
        animationData.startRect = this.getBoundingClientRect();
        animationData.scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Создаем эффект частиц
        createParticles(animationData.startRect);
        
        // Блокируем прокрутку страницы
        blockPageScroll();
        
        openAvatarOverlay();
    });
    
    // Эффект частиц при открытии
    function createParticles(rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            const angle = (Math.PI * 2 * i) / 8;
            const distance = 50 + Math.random() * 30;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            particle.style.cssText = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                width: 3px;
                height: 3px;
                background: linear-gradient(45deg, #4facfe, #00f2fe);
                border-radius: 50%;
                --tx: ${tx}px;
                --ty: ${ty}px;
                animation: particle 0.8s ease-out forwards;
                z-index: 10003;
                pointer-events: none;
            `;
            
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 800);
        }
    }
    
    function openAvatarOverlay() {
        animationData.isAnimating = true;
        
        const startRect = animationData.startRect;
        const scrollTop = animationData.scrollTop;
        
        // Позиция центра аватара
        const startX = startRect.left + startRect.width / 2;
        const startY = startRect.top + startRect.height / 2 + scrollTop;
        
        // Устанавливаем начальные стили
        overlayImage.classList.add('no-transition');
        overlayImage.style.cssText = `
            left: ${startX}px;
            top: ${startY}px;
            width: ${startRect.width}px;
            height: ${startRect.height}px;
            transform: translate(-50%, -50%) scale(0.8) rotateX(10deg);
            border-radius: 50%;
            opacity: 0;
            filter: blur(10px) brightness(1.5);
        `;
        
        // Показываем оверлей
        overlay.style.display = 'block';
        
        // Устанавливаем изображение
        overlayImage.src = avatarImage.src;
        overlayImage.alt = avatarImage.alt || 'Увеличенное фото';
        
        // Загружаем большое изображение
        const highResSrc = avatarImage.dataset.highres || 
                          avatarImage.dataset.original || 
                          avatarImage.src.replace(/(\-small|\-thumb|thumbnail)/i, '');
        
        if (highResSrc && highResSrc !== avatarImage.src) {
            const highResImg = new Image();
            highResImg.onload = function() {
                overlayImage.src = this.src;
                console.log('✅ Большое изображение загружено');
            };
            highResImg.onerror = function() {
                console.log('⚠️ Большое изображение не загрузилось');
            };
            highResImg.src = highResSrc;
        }
        
        // Запускаем анимацию открытия
        requestAnimationFrame(() => {
            overlay.classList.add('active');
            
            requestAnimationFrame(() => {
                overlayImage.classList.remove('no-transition');
                
                // Центрируем изображение
                overlayImage.style.left = '50%';
                overlayImage.style.top = '50%';
                overlayImage.style.width = 'auto';
                overlayImage.style.height = 'auto';
                overlayImage.style.maxWidth = '85vw';
                overlayImage.style.maxHeight = '85vh';
                
                // Применяем анимацию открытия
                overlayImage.style.animation = 'avatarOpen 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
                overlayImage.style.borderRadius = '12px';
                
                // Добавляем свечение после анимации
                setTimeout(() => {
                    overlayImage.classList.add('glow');
                }, 600);
                
                setTimeout(() => {
                    animationData.isAnimating = false;
                }, 800);
            });
        });
    }
    
    function closeAvatarOverlay() {
        if (animationData.isAnimating) return;
        animationData.isAnimating = true;
        
        // Убираем свечение
        overlayImage.classList.remove('glow');
        
        // Деактивируем оверлей
        overlay.classList.remove('active');
        
        // Применяем анимацию закрытия (растворение)
        overlayImage.style.animation = 'avatarClose 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
        
        setTimeout(() => {
            overlay.style.display = 'none';
            
            // Сбрасываем стили
            overlayImage.style.cssText = '';
            overlayImage.className = 'overlay-image';
            overlayImage.style.animation = '';
            
            // Очищаем src
            overlayImage.src = '';
            
            // Убираем фокус с крестика
            overlayClose.blur();
            
            // Разблокируем прокрутку
            unblockPageScroll();
            
            animationData.isAnimating = false;
        }, 600);
    }
    
    // Обработчики закрытия
    overlayClose.addEventListener('click', closeAvatarOverlay);
    overlayBackdrop.addEventListener('click', closeAvatarOverlay);
    
    // Закрытие по ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closeAvatarOverlay();
        }
    });
    
    // Предотвращаем закрытие при клике на изображение
    overlayImage.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // Добавляем обработчики для блокировки прокрутки на оверлее
    overlay.addEventListener('wheel', function(e) {
        e.preventDefault();
        e.stopPropagation();
    });
    
    overlay.addEventListener('touchmove', function(e) {
        e.preventDefault();
        e.stopPropagation();
    });
    
    console.log('✅ Всплывающий аватар инициализирован');
}

document.addEventListener('DOMContentLoaded', function() {
    // Инициализация
    init();
    
    // Добавляем обработчик для рекалькуляции при изменении размера окна
    window.addEventListener('resize', setupTimelineDurations);
});


});