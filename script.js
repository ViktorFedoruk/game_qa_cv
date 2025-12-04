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
    
    // Устанавливаем класс на html
    html.className = `lang-${lang}`;
    
    // Обновляем активную опцию
    langOptions.forEach(option => {
        option.classList.remove('active');
        if (option.dataset.lang === lang) {
            option.classList.add('active');
        }
    });
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
        const particlesContainer = document.getElementById('particles');
        const particleCount = 200;
        
        for (let i = 0; i < particleCount; i++) {
            createParticle(particlesContainer);
        }
    }
    
    function createParticle(container) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Случайная позиция
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        
        // Случайный размер
        const size = Math.random() * 4 + 1;
        
        // Случайная прозрачность
        const opacity = Math.random() * 0.4 + 0.1;
        
        // Случайный цвет
        const colors = ['#0ea5e9', '#06b6d4', '#8b5cf6', '#10b981'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Применение стилей
        particle.style.cssText = `
            position: absolute;
            left: ${x}%;
            top: ${y}%;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: 50%;
            opacity: ${opacity};
            pointer-events: none;
        `;
        
        container.appendChild(particle);
        
        // Анимация движения
        animateParticle(particle);
    }
    
    function animateParticle(particle) {
        let x = parseFloat(particle.style.left);
        let y = parseFloat(particle.style.top);
        const speedX = (Math.random() - 0.5) * 0.05;
        const speedY = (Math.random() - 0.5) * 0.05;
        
        function move() {
            x += speedX;
            y += speedY;
            
            // Ограничение границ
            if (x < -5) x = 105;
            if (x > 105) x = -5;
            if (y < -5) y = 105;
            if (y > 105) y = -5;
            
            particle.style.left = `${x}%`;
            particle.style.top = `${y}%`;
            
            requestAnimationFrame(move);
        }
        
        move();
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
    function setupConsole() {
        const consoleOutput = document.getElementById('consoleOutput');
        
        // Функция для форматирования времени
        function getFormattedTime() {
            const now = new Date();
            return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
        }
        
        // Начальные сообщения
        const initialMessages = [
            {time: getFormattedTime(), ru: "Система инициализирована", en: "System initialized"},
            {time: getFormattedTime(), ru: "Загрузка профиля...", en: "Loading profile..."},
            {time: getFormattedTime(), ru: "Профиль загружен", en: "Profile loaded"},
            {time: getFormattedTime(), ru: "Анализ навыков...", en: "Analyzing skills..."},
            {time: getFormattedTime(), ru: "Навыки загружены", en: "Skills loaded"},
            {time: getFormattedTime(), ru: "Готов к работе", en: "Ready for work"},
            {time: getFormattedTime(), ru: "Соискатель обнаружен", en: "The applicant has been found"}
        ];
        
        // Добавляем начальные сообщения
        initialMessages.forEach((msg, index) => {
            setTimeout(() => {
                addLogEntry(msg.time, msg.ru, msg.en);
            }, index * 300);
        });
        
        // Функция добавления записи в лог
        function addLogEntry(time, ruText, enText) {
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
        
        // Клик по консоли для добавления тестового лога
        consoleOutput.addEventListener('click', function() {
            const testLogs = [
                {ru: "Тестовая проверка... УСПЕШНО", en: "Test check... SUCCESS"},
                {ru: "Анализ завершен", en: "Analysis complete"},
                {ru: "Система стабильна", en: "System stable"},
                {ru: "Готов к новым задачам", en: "Ready for new tasks"},
                {ru: "Камера и микрофон активированы", en: "The camera and microphone are activated"}
            ];
            
            const randomLog = testLogs[Math.floor(Math.random() * testLogs.length)];
            addLogEntry(getFormattedTime(), randomLog.ru, randomLog.en);
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
});