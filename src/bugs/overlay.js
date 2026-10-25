// src/bugs/overlay.js
// bug-layer: создание слоя, спавн, ловля, счётчик, частицы.
window.BUGS = window.BUGS || {};

window.BUGS.overlay = (function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BASE = 30;        // базовый размер жука (px, +25%)
  var MIN_DIST = 40;    // мин. дистанция между жуками при спавне
  var SPLIT_SHAKE = 340; // мс: дрожь жука перед раздвоением

  var layer = null;
  var hudEl = null;
  var objectiveEl = null;
  var exitEl = null;
  var hudRowEl = null;
  var counterEl = null;
  var timerEl = null;
  var timerInterval = null;
  var bugs = [];
  var halvesCaught = {};   // { parentId: count } для duplicate
  var onComplete = null;
  var onExit = null;       // колбэк выхода из игры (кнопка в HUD) — §18.1
  var bossSpawned = false;
  var BOSS_BASE = 1.4;                    // размер босса в config (size)
  var BOSS_SIZES = [1.4, 1.9, 2.4, 2.9];  // раунды 1–3 + взрыв (× BASE=30)
  var BOSS_HIT_RADII = [26, 30, 34]; // радиус хитбокса босса по раундам, px
  var AIM_ASSIST = 16; // aim assist: прощение промаха, px (15–20)

  var aimEl = null;        // прицел (точка удара)
  var swatterEl = null;    // мухобойка
  var swatting = false;
  var swatT = 0;
  var swatHitDone = false;
  var SWAT_PIVOT_X = 20;   // рукоять мухобойки в SVG-координатах
  var SWAT_PIVOT_Y = 68;
  var SWAT_REACH = 54;     // расстояние рукоять → центр головы
  var SWAT_ORBIT = 90;     // градусов: поворот всей мухобойки вокруг курсора (ССW)

  function state() { return window.BUGS.state.runtime; }
  function cfgById(id) { return window.BUGS.config.byId(id); }
  function toasts() { return window.BUGS.toasts; }
  function i18n() { return window.BUGS.i18n; }

  /* ---------- слой и счётчик ---------- */

  function create() {
    if (layer) return layer;

    layer = document.createElement('div');
    layer.className = 'bug-layer';
    layer.setAttribute('aria-hidden', 'false');
    document.body.appendChild(layer);
    document.body.style.overflow = 'hidden'; // блокируем скролл фона во время игры

    hudEl = document.createElement('div');
    hudEl.className = 'bug-hud-bottom';

    objectiveEl = document.createElement('div');
    objectiveEl.className = 'bug-objective';
    objectiveEl.textContent = i18n().t('bugs.hint', 'Catch all the bugs · ESC to exit');

    // Кнопка выхода — объёмная «клавиша», по которой бьют мухобойкой (§18.1).
    // Это <div> (не <button>): без tabindex, без фокуса, Tab/Enter не активируют.
    // Выход доступен мышью (удар мухобойкой) или ESC с клавиатуры.
    exitEl = document.createElement('div');
    exitEl.className = 'bug-exit';
    exitEl.setAttribute('role', 'button');
    exitEl.setAttribute('aria-label', i18n().t('bugs.exitLabel', 'Exit game'));
    exitEl.textContent = i18n().t('bugs.exit', 'Exit');
    exitEl.addEventListener('click', onExitClick);

    hudRowEl = document.createElement('div');
    hudRowEl.className = 'bug-hud-row';

    timerEl = document.createElement('div');
    timerEl.className = 'bug-timer';
    timerEl.textContent = '0.0s';

    counterEl = document.createElement('div');
    counterEl.className = 'bug-counter';
    counterEl.setAttribute('aria-live', 'polite');
    counterEl.textContent = '0/10';

    hudRowEl.appendChild(timerEl);
    hudRowEl.appendChild(counterEl);
    // колонка: цель сверху, кнопка выхода под ней (больше объёма для анимации),
    // ниже — таймер и счётчик.
    hudEl.appendChild(objectiveEl);
    hudEl.appendChild(exitEl);
    hudEl.appendChild(hudRowEl);
    document.body.appendChild(hudEl);

    // прицел + мухобойка (визуал курсора)
    aimEl = document.createElement('div');
    aimEl.className = 'bug-aim';
    aimEl.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 28 28">' +
        '<circle cx="14" cy="14" r="9" fill="none" stroke="#fbbf24" stroke-width="1.5"/>' +
        '<line x1="14" y1="2" x2="14" y2="6" stroke="#fbbf24" stroke-width="1.5"/>' +
        '<line x1="14" y1="22" x2="14" y2="26" stroke="#fbbf24" stroke-width="1.5"/>' +
        '<line x1="2" y1="14" x2="6" y2="14" stroke="#fbbf24" stroke-width="1.5"/>' +
        '<line x1="22" y1="14" x2="26" y2="14" stroke="#fbbf24" stroke-width="1.5"/>' +
        '<circle cx="14" cy="14" r="1.5" fill="#fbbf24"/>' +
      '</svg>';
    document.body.appendChild(aimEl);

    swatterEl = document.createElement('div');
    swatterEl.className = 'bug-swatter';
    swatterEl.innerHTML =
      '<svg width="40" height="72" viewBox="0 0 40 72">' +
        '<line x1="20" y1="68" x2="20" y2="28" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round"/>' +
        '<rect x="5" y="1" width="30" height="26" rx="6" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>' +
        '<circle cx="13" cy="14" r="2.4" fill="#0a0b10"/>' +
        '<circle cx="20" cy="14" r="2.4" fill="#0a0b10"/>' +
        '<circle cx="27" cy="14" r="2.4" fill="#0a0b10"/>' +
      '</svg>';
    document.body.appendChild(swatterEl);

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('contextmenu', onContextMenu);

    var start = state().startTime || performance.now();
    timerInterval = setInterval(function () {
      if (timerEl) timerEl.textContent = window.BUGS.formatTime(performance.now() - start);
    }, 200);

    return layer;
  }

  /* ---------- спавн ---------- */

  function spawn() {
    bugs = [];
    halvesCaught = {};
    bossSpawned = false;
    var list = window.BUGS.config.bugs;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === 'boss') continue; // босс спавнится отдельно (§18.3)
      spawnOne(list[i], 'normal', null);
    }
    updateCounter();
  }

  function spawnOne(entry, role, parent, pos) {
    var p = pos || randomPosAway();
    // «Тихоня» (tiny, обычная роль) спавнится в зоне текста секции контактов
    if (entry.id === 'tiny' && role === 'normal') {
      var z = window.BUGS.behaviors.textZone();
      if (z) {
        p.x = Math.max(z.left, Math.min(z.right, p.x));
        p.y = Math.max(z.top, Math.min(z.bottom, p.y));
      }
    }
    var el = document.createElement('div');
    el.className = 'bug bug-shape-' + entry.shape;
    el.dataset.id = entry.id;
    el.dataset.role = role || 'normal';
    if (parent) el.dataset.parent = parent;
    if (entry.severity === 'critical') el.classList.add('bug-boss');
    el.style.setProperty('--bug-color', entry.color);
    // хаотичные анимации: у каждого жука свой темп и фаза (нет общего паттерна)
    el.style.setProperty('--idle-duration', (2.2 + Math.random() * 2.4).toFixed(2) + 's');
    el.style.setProperty('--idle-delay', (-Math.random() * 3).toFixed(2) + 's');
    el.style.setProperty('--leg-duration', (0.24 + Math.random() * 0.22).toFixed(2) + 's');
    el.style.setProperty('--ant-duration', (1.8 + Math.random() * 1.6).toFixed(2) + 's');
    el.style.setProperty('--blink-duration', (3 + Math.random() * 3).toFixed(2) + 's');
    el.style.setProperty('--blink-delay', (-Math.random() * 4).toFixed(2) + 's');
    el.style.setProperty('--look-duration', (4 + Math.random() * 3).toFixed(2) + 's');
    var size = BASE * entry.size;
    el.style.width = size + 'px';
    el.style.height = size + 'px';

    // объёмная модель: панцирь + глаза + усики/рога + 6 ножек
    var legsHtml = '';
    for (var li = 0; li < 6; li++) legsHtml += '<span class="bug-leg"></span>';
    el.innerHTML =
      '<div class="bug-inner">' +
        '<div class="bug-legs">' + legsHtml + '</div>' +
        '<div class="bug-body">' +
          '<div class="bug-shell"></div>' +
          '<div class="bug-eyes">' +
            '<span class="bug-eye"><span class="pupil"></span></span>' +
            '<span class="bug-eye"><span class="pupil"></span></span>' +
          '</div>' +
          '<div class="bug-antennae"><span></span><span></span></div>' +
          '<div class="bug-horns"><span></span><span></span></div>' +
        '</div>' +
      '</div>';

    layer.appendChild(el);

    var bug = {
      key: entry.id + '-' + Math.random().toString(36).slice(2, 7),
      cfg: entry,
      el: el,
      x: p.x,
      y: p.y,
      vx: 0,
      vy: 0,
      timer: entry.behavior === 'sleep' ? 3 : 0, // спящий стоит 3с до первого телепорта
      hits: 0,
      scale: 1,
      role: role || 'normal',
      parent: parent || null
    };
    el.dataset.key = bug.key;
    bugs.push(bug);
    place(bug);
    return bug;
  }

  function randomPosAway() {
    var p, tries = 0;
    do {
      p = window.BUGS.behaviors.randomPos();
      tries++;
    } while (minDistTo(p) < MIN_DIST && tries < 30);
    return p;
  }

  function minDistTo(p) {
    var min = Infinity;
    for (var i = 0; i < bugs.length; i++) {
      var d = Math.hypot(p.x - bugs[i].x, p.y - bugs[i].y);
      if (d < min) min = d;
    }
    return min;
  }

  function place(bug) {
    var size = BASE * bug.cfg.size;
    var sc = bug.scale || 1;
    bug.el.style.transform =
      'translate(' + Math.round(bug.x) + 'px,' + Math.round(bug.y) + 'px)' +
      ' scale(' + sc + ')' +
      ' translate(' + Math.round(-size / 2) + 'px,' + Math.round(-size / 2) + 'px)';

    // боксы босса: следуют за жуком (без масштаба), ширина растёт по раундам
    if (bug.boss && bug.barsEl) positionBossBars(bug);

    // визуальные состояния с гистерезисом (чтобы анимации не дёргались от флуктуаций)
    var speed = Math.hypot(bug.vx || 0, bug.vy || 0);
    var moving = bug.el.classList.contains('is-moving');
    var newMoving = moving ? speed > 12 : speed > 40;
    bug.el.classList.toggle('is-moving', newMoving);
    var airborne = bug.el.classList.contains('is-airborne');
    var newAirborne = airborne ? speed > 100 : speed > 160;
    bug.el.classList.toggle('is-airborne', newAirborne);
    // спящий: закрытые глаза + zzz, пока не бежит
    if (bug.cfg.behavior === 'sleep') {
      bug.el.classList.toggle('is-sleeping', bug.state !== 'awake');
    }
    // поворот в сторону движения (пишем --facing только при смене направления,
    // чтобы не мутировать inline-стиль на каждом кадре)
    var facing = bug.vx > 12 ? '1' : (bug.vx < -12 ? '-1' : null);
    if (facing && facing !== bug.facing) {
      bug.facing = facing;
      bug.el.style.setProperty('--facing', facing);
    }
    // шлейф ускорения (только у flee-жука) — длина зависит от скорости,
    // угол вдоль движения + смещение назад
    var trail = bug.trail || 0;          // 0..1
    bug.el.classList.toggle('is-boosting', trail > 0);
    if (trail > 0 && (bug.vx || bug.vy)) {
      var ang = Math.atan2(bug.vy, bug.vx);
      var spd = Math.hypot(bug.vx, bug.vy);
      bug.el.style.setProperty('--trail-rot', (ang * 180 / Math.PI).toFixed(1) + 'deg');
      bug.el.style.setProperty('--trail-len', trail.toFixed(3));
      // смещаем шлейф назад; длина и отступ пропорциональны скорости
      bug.el.style.setProperty('--trail-ox', (-bug.vx / spd * 30 * trail).toFixed(1) + 'px');
      bug.el.style.setProperty('--trail-oy', (-bug.vy / spd * 30 * trail).toFixed(1) + 'px');
    }
  }

  /* ---------- тик ---------- */

  function step(dt, cursor) {
    updateAim(cursor, dt);

    var beh = window.BUGS.behaviors;
    var i, b, fn;
    if (REDUCED) {
      // §10: жуки статичны, но босс должен проживать фазы (окна/HP) — §18.3
      for (i = 0; i < bugs.length; i++) {
        b = bugs[i];
        if (b.cfg.behavior === 'boss' && beh.boss) {
          beh.boss(b, dt, cursor);
          place(b);
        }
      }
    } else {
      for (i = 0; i < bugs.length; i++) {
        b = bugs[i];
        fn = b.split ? beh.split : beh[b.cfg.behavior]; // половинка: разлёт → scurry
        if (fn) fn(b, dt, cursor);
        place(b);
      }
    }

    // обработка флагов босса (события, поднятые в behaviors)
    for (i = 0; i < bugs.length; i++) {
      b = bugs[i];
      if (!b.boss) continue;
      if (b.boss.barsDirty) { b.boss.barsDirty = false; updateBossBars(b); }
    }
  }

  /* ---------- прицел и мухобойка ---------- */

  function updateAim(cursor, dt) {
    if (!aimEl || !swatterEl) return;

    // прицел строго под курсором
    aimEl.style.transform =
      'translate(' + cursor.x + 'px,' + cursor.y + 'px) translate(-50%, -50%)';

    // угол мухобойки: в покое +60° (под правую руку); мах — быстрый «шлепок»
    var angle = 60;
    if (swatting) {
      swatT += dt || 0.016;
      var dur = 0.2;
      if (swatT >= dur) {
        swatting = false;
        angle = 60;
      } else {
        var p = swatT / dur;
        // |cos| даёт ускорение к удару: резкий хлопок на пике и отскок
        angle = 60 * Math.abs(Math.cos(p * Math.PI));
        // удар засчитываем на пике маха (голова на прицеле)
        if (p >= 0.5 && !swatHitDone) {
          swatHitDone = true;
          hitAt(cursor.x, cursor.y);
          swatImpact(cursor.x, cursor.y);
        }
      }
    }

    // рукоять по окружности вокруг прицела (ССW на SWAT_ORBIT); при 0° голова на прицеле
    var orbRad = SWAT_ORBIT * Math.PI / 180;
    var gripX = cursor.x + Math.sin(orbRad) * SWAT_REACH;
    var gripY = cursor.y + Math.cos(orbRad) * SWAT_REACH;
    swatterEl.style.transform =
      'translate(' + (gripX - SWAT_PIVOT_X) + 'px,' + (gripY - SWAT_PIVOT_Y) + 'px) rotate(' + (angle - SWAT_ORBIT) + 'deg)';
  }

  function swat() {
    swatting = true;
    swatT = 0;
    swatHitDone = false;
  }

  function hitAt(x, y) {
    // попадание: прямой хит или aim assist (прощение промаха на ~18px)
    var bug = nearestBug(x, y);
    if (!bug) return;
    handleCatch(bug);
  }

  // ближайший жук в радиусе «хитбокс + aim assist»
  function nearestBug(x, y) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < bugs.length; i++) {
      var b = bugs[i];
      if (b.el && b.el.style.pointerEvents === 'none') continue; // невидимый (blink)
      var d = Math.hypot(x - b.x, y - b.y);
      var r = hitRadius(b) + AIM_ASSIST;
      if (d <= r && d < bestD) { best = b; bestD = d; }
    }
    return best;
  }

  function hitRadius(b) {
    if (b.boss) return BOSS_HIT_RADII[Math.min((b.boss.round || 1) - 1, 2)] || BOSS_HIT_RADII[0];
    return (BASE * b.cfg.size + 16) / 2; // элемент + inset 8px с каждой стороны
  }

  function swatImpact(x, y) {
    // ударная волна в точке шлепка
    var ring = document.createElement('div');
    ring.className = 'bug-impact';
    ring.style.left = x + 'px';
    ring.style.top = y + 'px';
    document.body.appendChild(ring);
    setTimeout(function () { ring.remove(); }, 360);
  }

  function onMouseDown(e) {
    if (e.button !== 0) return; // только ЛКМ
    swat(); // удар по ЛКМ
  }

  function onContextMenu(e) {
    e.preventDefault(); // не показывать контекстное меню
  }

  function onExitClick() {
    if (!exitEl || exitEl.classList.contains('is-pressed')) return;
    // вдавить кнопку и выйти через 150–200 мс после клика (§18.1).
    // Удар мухобойкой + волна уже сыграны document-обработчиком mousedown,
    // hitAt(cursor) на кнопке жуков не находит (она не .bug) — ловля не срабатывает.
    exitEl.classList.add('is-pressed');
    setTimeout(function () {
      if (onExit) onExit();
    }, 170);
  }

  /* ---------- ловля ---------- */

  function findBug(key) {
    for (var i = 0; i < bugs.length; i++) if (bugs[i].key === key) return bugs[i];
    return null;
  }

  function handleCatch(bug) {
    var c = bug.cfg;

    // duplicate (split): дрожит, затем раздваивается на месте — две половинки
    // разлетаются в противоположные стороны (до разлёта неуязвимы).
    if (c.behavior === 'split') {
      if (bug.splitting) return; // уже раздваивается — повторный клик игнорируем
      splitBug(bug);
      return;
    }

    // decoy: инкремент + спавн двух приманок (extra, вне счётчика)
    if (c.behavior === 'decoy') {
      particlesAt(bug.x, bug.y, c.color);
      resolve(c.id);
      removeBug(bug);
      spawnOne(window.BUGS.config.spawned.extra, 'extra', c.id);
      spawnOne(window.BUGS.config.spawned.extra, 'extra', c.id);
      return;
    }

    // босс: трёхраундовая механика (§18.3)
    if (c.behavior === 'boss') {
      var B = bug.boss;
      if (!B || B.phase !== 'vulnerable') return; // ловится только в окне уязвимости
      B.failStreak = 0; // успешный удар сбрасывает серию провалов
      B.hp++;
      updateBossBars(bug);
      if (B.hp >= 3) completeRound(bug);
      else { flash(bug); place(bug); }
      return;
    }

    // половинка duplicate
    if (bug.role === 'half') {
      if (bug.split && bug.split.phase === 'driving') return; // неуязвима в разлёте
      removeBug(bug);
      var n = (halvesCaught[bug.parent] || 0) + 1;
      halvesCaught[bug.parent] = n;
      if (n >= 2) resolve(bug.parent);
      else toasts().push(i18n().name(c), c.color, i18n().t('bugs.halfToast', 'One more half'));
      return;
    }

    // приманка decoy (extra) — вне счётчика
    if (bug.role === 'extra') {
      particlesAt(bug.x, bug.y, c.color);
      removeBug(bug);
      toasts().push(i18n().name(c), c.color, i18n().toast(c));
      return;
    }

    // обычный жук
    particlesAt(bug.x, bug.y, c.color);
    resolve(c.id);
    removeBug(bug);
  }

  // duplicate: дрожь исходного жука → появление двух половинок на его месте →
  // разлёт в противоположные стороны (половинки неуязвимы, пока летят).
  function splitBug(bug) {
    var c = bug.cfg;
    bug.splitting = true;
    halvesCaught[c.id] = 0;
    var sx = bug.x, sy = bug.y;
    var angle = Math.random() * Math.PI * 2; // ось разлёта

    if (bug.el) {
      bug.el.style.pointerEvents = 'none';
      bug.el.classList.add('is-splitting');
    }
    toasts().push(i18n().name(c), c.color, i18n().t('bugs.split', 'Split into two halves'));

    setTimeout(function () {
      if (!layer) return;
      removeBug(bug);
      spawnSplitHalf(sx, sy, angle, c.id);           // первая половинка
      spawnSplitHalf(sx, sy, angle + Math.PI, c.id); // вторая — в противоположную сторону
    }, SPLIT_SHAKE);
  }

  function spawnSplitHalf(x, y, angle, parentId) {
    var px = x, py = y;
    if (REDUCED) { px = x + Math.cos(angle) * 16; py = y + Math.sin(angle) * 16; }
    var h = spawnOne(window.BUGS.config.spawned.half, 'half', parentId, { x: px, y: py });
    if (REDUCED) {
      // reduced-motion: без разлёта — сразу обычная (ловимая) половинка
      h.split = { phase: 'free', t: 0, angle: angle };
      h.el.style.pointerEvents = 'auto';
    } else {
      h.split = { phase: 'driving', t: 0, angle: angle };
      h.el.style.pointerEvents = 'none';
      h.el.classList.add('is-split-half');
    }
    place(h);
    return h;
  }

  function resolve(id) {
    if (state().caught.has(id)) return; // идемпотентно (§15)
    state().caught.add(id);
    var c = cfgById(id);
    if (c && id !== 'boss') { // босс: тост уже показан при спавне (§18.3)
      var text = (id === 'duplicate') ? i18n().t('bugs.duplicateCaught', 'Caught') : i18n().toast(c);
      toasts().push(i18n().name(c), c.color, text);
    }
    updateCounter();
    if (state().caught.size === 9 && !bossSpawned) spawnBoss();
    if (state().caught.size === 10 && onComplete) onComplete();
  }

  function removeBug(bug) {
    var i = bugs.indexOf(bug);
    if (i >= 0) bugs.splice(i, 1);
    if (bug.el) bug.el.remove();
    if (bug.barsEl) { bug.barsEl.remove(); bug.barsEl = null; }
  }

  function flash(bug) {
    if (!bug.el) return;
    bug.el.classList.remove('bug-flash');
    // force reflow to restart animation
    void bug.el.offsetWidth;
    bug.el.classList.add('bug-flash');
  }

  /* ---------- босс (§18.3) ---------- */

  // убрать оставшихся «пустышек» (приманки extra, половинки half) перед боем
  function clearBugs() {
    for (var i = bugs.length - 1; i >= 0; i--) {
      var b = bugs[i];
      particlesAt(b.x, b.y, b.cfg.color);
      if (b.el) b.el.remove();
    }
    bugs = [];
  }

  function spawnBoss() {
    bossSpawned = true;
    var c = cfgById('boss');

    shake(200);
    flashScreen();
    if (objectiveEl) objectiveEl.textContent = i18n().t('bugs.oneLeft', 'One left');
    toasts().push(i18n().name(c), c.color, i18n().toast(c)); // тост при появлении

    clearBugs(); // бой один на один — убираем оставшихся пустышек
    var bug = spawnOne(c, 'normal', null);
    var corner = window.BUGS.behaviors.bossCorner(); // направление входа
    var sx = (corner.x < window.innerWidth / 2) ? -50 : window.innerWidth + 50;
    var sy = (corner.y < window.innerHeight / 2) ? -50 : window.innerHeight + 50;
    // цель — центр игровой зоны (с небольшим разбросом), чтобы бой шёл ближе к центру
    var tx = window.innerWidth / 2 + (Math.random() * 2 - 1) * window.innerWidth * 0.10;
    var ty = window.innerHeight / 2 + (Math.random() * 2 - 1) * window.innerHeight * 0.10;

    bug.boss = {
      round: 1,
      hp: 0,
      phase: 'spawning',
      spawnTimer: 0.7,
      windowTimer: 0,
      failStreak: 0,
      targetX: tx,
      targetY: ty,
      startX: sx,
      startY: sy
    };
    bug.scale = BOSS_SIZES[0] / BOSS_BASE; // раунд 1 (1.0 относительно config size 1.4)
    bug.x = sx;
    bug.y = sy;

    buildBossBars(bug);
    bug.el.classList.add('is-spawning');
    place(bug);
  }

  var BOSS_BAR_W = [84, 112, 140]; // ширина бара по раундам — сегменты длиннее = жук «сильнее»

  // позиция и ширина боксов босса (отдельно от жука — без наследования scale)
  function positionBossBars(bug) {
    if (!bug.barsEl || !bug.boss) return;
    var size = BASE * bug.cfg.size;   // 42
    var sc = bug.scale || 1;
    var halfH = size * sc / 2;        // визуальная полувысота жука
    var barW = BOSS_BAR_W[Math.min(bug.boss.round - 1, 2)];
    var barH = 20;                    // высота двух баров + зазор
    var x = bug.x - barW / 2;
    var y = bug.y - halfH - barH - 8; // над головой
    var edge = 8;
    if (x < edge) x = edge;
    else if (x + barW > window.innerWidth - edge) x = window.innerWidth - edge - barW;
    bug.barsEl.style.width = barW + 'px';
    bug.barsEl.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
  }

  function buildBossBars(bug) {
    var barsEl = document.createElement('div');
    barsEl.className = 'bug-boss-bars';

    var hp = document.createElement('div');
    hp.className = 'bug-boss-hp';
    hp.setAttribute('role', 'img');
    hp.setAttribute('aria-label', i18n().t('bugs.bossHp', 'Boss health'));
    for (var i = 0; i < 3; i++) { var s1 = document.createElement('span'); s1.className = 'seg'; hp.appendChild(s1); }

    var rounds = document.createElement('div');
    rounds.className = 'bug-boss-rounds';
    rounds.setAttribute('role', 'img');
    rounds.setAttribute('aria-label', i18n().t('bugs.bossRounds', 'Rounds'));
    for (var j = 0; j < 3; j++) { var s2 = document.createElement('span'); s2.className = 'sec'; rounds.appendChild(s2); }

    barsEl.appendChild(hp);
    barsEl.appendChild(rounds);
    document.body.appendChild(barsEl); // отдельно от жука — не наследует его scale

    // контузия: кружащийся ореол (звёздочки) над головой — на жуке
    var dizzy = document.createElement('div');
    dizzy.className = 'bug-dizzy';
    dizzy.setAttribute('aria-hidden', 'true');
    for (var d = 0; d < 3; d++) { var st = document.createElement('span'); st.className = 'star'; dizzy.appendChild(st); }
    bug.el.appendChild(dizzy);

    // лечение: волны, сходящиеся к жуку — на жуке
    var waves = document.createElement('div');
    waves.className = 'bug-heal-waves';
    waves.setAttribute('aria-hidden', 'true');
    for (var w = 0; w < 3; w++) { var ring = document.createElement('span'); ring.className = 'ring'; waves.appendChild(ring); }
    bug.el.appendChild(waves);

    bug.barsEl = barsEl;
    bug.hpEl = hp;
    bug.roundsEl = rounds;
    updateBossBars(bug);
  }

  function updateBossBars(bug) {
    if (!bug.boss || !bug.hpEl || !bug.roundsEl) return;
    // HP: заполнено = оставшиеся жизни (3 − hp)
    var hp = bug.hpEl.children;
    var filledHp = 3 - bug.boss.hp;
    for (var i = 0; i < hp.length; i++) hp[i].classList.toggle('empty', i >= filledHp);
    // раунды: заполнено = оставшиеся (как HP) — убираем по одному за пройденный раунд
    var r = bug.roundsEl.children;
    var filledRounds = 3 - (bug.boss.round - 1);
    for (var j = 0; j < r.length; j++) r[j].classList.toggle('empty', j >= filledRounds);
  }

  // завершение раунда (HP = 0): рост + контузия → лечение, либо взрыв на 3-м
  function completeRound(bug) {
    var B = bug.boss;
    if (B.round >= 3) { explodeBoss(bug); return; }
    B.round++;
    B.scaleTo = BOSS_SIZES[B.round - 1] / BOSS_BASE;
    updateBossBars(bug);
    window.BUGS.behaviors.bossStartRecover(bug, true);
    place(bug);
  }

  function explodeBoss(bug) {
    bug.boss.phase = 'exploding';
    bug.boss.scaleFrom = bug.scale;
    bug.boss.scaleTo = BOSS_SIZES[3] / BOSS_BASE; // 2.9×
    bug.boss.growTimer = 0.3; // плавный рост до взрыва
    if (bug.barsEl) bug.barsEl.style.opacity = '0';
    // после плавного роста — вспышка + частицы + тряска, затем попап (не одновременно)
    setTimeout(function () {
      if (!layer) return;
      flashScreen();
      shake(300);
      particlesAt(bug.x, bug.y, bug.cfg.color, 26, 44);
      removeBug(bug);
      setTimeout(function () {
        if (layer) resolve('boss');
      }, 620);
    }, 360); // 0.3с роста + буфер
  }

  function shake(ms) {
    if (REDUCED || !layer) return;
    layer.classList.remove('bug-shake');
    void layer.offsetWidth;
    layer.style.setProperty('--shake-dur', ms + 'ms');
    layer.classList.add('bug-shake');
  }

  function flashScreen() {
    if (REDUCED) return;
    var f = document.createElement('div');
    f.className = 'bug-screenflash';
    document.body.appendChild(f);
    setTimeout(function () { f.remove(); }, 450);
  }

  /* ---------- счётчик ---------- */

  function updateCounter() {
    if (!counterEl) return;
    counterEl.textContent = state().caught.size + '/10';
    counterEl.classList.remove('bump');
    void counterEl.offsetWidth;
    counterEl.classList.add('bump');
  }

  /* ---------- частицы ---------- */

  // Пул переиспользуемых узлов частиц: вместо создания/удаления div на каждый
  // удар берём свободный узел из пула и возвращаем его по таймауту. Визуально
  // идентично (та же CSS-анимация bug-particle), но без выбросов на GC при
  // спаме кликов и взрыве босса.
  var particlePool = [];

  function getParticle() {
    var p;
    for (var i = 0; i < particlePool.length; i++) {
      if (!particlePool[i]._busy) {
        p = particlePool[i];
        p._busy = true;
        return p;
      }
    }
    p = document.createElement('div');
    p.className = 'bug-particle';
    particlePool.push(p);
    p._busy = true;
    return p;
  }

  function releaseParticle(node) {
    if (node.isConnected) node.remove();
    node._busy = false;
  }

  function particlesAt(x, y, color, count, spread) {
    if (REDUCED) return;
    var n = count || 8;
    var sp = spread || 24;
    for (var i = 0; i < n; i++) {
      var p = getParticle();
      p.style.background = color;
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      var a = Math.random() * Math.PI * 2;
      var d = sp * 0.6 + Math.random() * sp;
      p.style.setProperty('--dx', (Math.cos(a) * d) + 'px');
      p.style.setProperty('--dy', (Math.sin(a) * d) + 'px');
      // перезапуск CSS-анимации: сброс → reflow → восстановление
      p.style.animation = 'none';
      document.body.appendChild(p);
      void p.offsetWidth;
      p.style.animation = '';
      (function (node) {
        setTimeout(function () { releaseParticle(node); }, 520);
      })(p);
    }
  }

  /* ---------- жизненный цикл ---------- */

  function setOnComplete(cb) { onComplete = cb; }
  function setOnExit(cb) { onExit = cb; }

  function destroy() {
    if (layer) { layer.remove(); layer = null; }
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (hudEl) { hudEl.remove(); hudEl = null; objectiveEl = null; exitEl = null; hudRowEl = null; counterEl = null; timerEl = null; }
    if (aimEl) { aimEl.remove(); aimEl = null; }
    if (swatterEl) { swatterEl.remove(); swatterEl = null; }
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('contextmenu', onContextMenu);
    swatting = false;
    document.body.style.overflow = '';
    for (var i = 0; i < bugs.length; i++) {
      if (bugs[i].barsEl) { bugs[i].barsEl.remove(); bugs[i].barsEl = null; }
    }
    bugs = [];
    halvesCaught = {};
    bossSpawned = false;
    // освобождаем пул частиц (погасить висящие таймеры не нужно — они уберут
    // узел по _busy, но чистим сами узлы, чтобы не копить их после выхода)
    for (var j = 0; j < particlePool.length; j++) {
      if (particlePool[j].isConnected) particlePool[j].remove();
      particlePool[j]._busy = false;
    }
  }

  function isActive() { return !!layer; }

  return {
    create: create,
    spawn: spawn,
    step: step,
    destroy: destroy,
    setOnComplete: setOnComplete,
    setOnExit: setOnExit,
    isActive: isActive
  };
})();
