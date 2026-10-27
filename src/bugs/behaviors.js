// src/bugs/behaviors.js
// Функции движения жуков: (bug, dt, cursor) => void, мутируют bug.x/bug.y
// и (для blink) bug.el.style.opacity / pointerEvents.
window.BUGS = window.BUGS || {};

window.BUGS.behaviors = (function () {
  'use strict';

  var MARGIN = 24;       // отступ от краёв viewport (§5.2)
  var BASE_SPEED = 90;   // px/s
  // Резервная зона HUD в правом нижнем углу — жуки туда не заходят.
  // Высота покрывает не только сам HUD (цель + кнопка выхода + таймер/счётчик),
  // но и стопку тостов, которая висит НАД ним: два тоста занимают до ~154 px
  // плюс отступ. Реальные замеры в 1416×801: HUD от 651, тосты от 457.
  var HUD_W = 450;       // ширина зоны, px
  var HUD_H = 360;       // высота зоны, px (HUD ~130 + тосты ~154 + отступы/запас)
  var STEER = 4;         // 1/с: инерция доворота (плавность убегания)
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPLIT_DRIVE = 0.7;  // с: длительность разлёта половинок (неуязвимы)
  var SPLIT_DIST = 220;   // px: дальность разлёта каждой половинки
  var SPLIT_CRUISE = 0.55;// доля пути, которую половинка летит на полной скорости
  // скорость, при которой за SPLIT_DRIVE половинка пролетает ~SPLIT_DIST
  // (полный разгон первые CRUISE, затем линейное торможение)
  var SPLIT_SPEED = SPLIT_DIST / (SPLIT_DRIVE * (SPLIT_CRUISE + (1 - SPLIT_CRUISE) / 2));

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function keepInBounds(bug) {
    bug.x = clamp(bug.x, MARGIN, window.innerWidth - MARGIN);
    bug.y = clamp(bug.y, MARGIN, window.innerHeight - MARGIN);

    // Не заходим в зону HUD+тостов (правый нижний угол).
    // Выталкиваем по кратчайшему пути: если жук ближе к левому краю зоны —
    // сдвигаем влево, если ближе к её верхнему краю — поднимаем вверх.
    // Так жук не «перескакивает» через весь экран при входе сбоку.
    var hx = window.innerWidth - HUD_W;
    var hy = window.innerHeight - HUD_H;
    if (bug.x > hx && bug.y > hy) {
      var pushLeft = bug.x - hx;
      var pushUp = bug.y - hy;
      if (pushLeft < pushUp) bug.x = hx;
      else bug.y = hy;
    }
  }

  // случайная позиция внутри viewport, вне HUD-зоны
  function randomPos() {
    var x = MARGIN + Math.random() * (window.innerWidth - MARGIN * 2);
    var y = MARGIN + Math.random() * (window.innerHeight - MARGIN * 2);
    if (y > window.innerHeight - HUD_H) x = clamp(x, MARGIN, window.innerWidth - HUD_W);
    return { x: x, y: y };
  }

  // зона текста карточки доступности (для «Тихони»), пересечённая с viewport.
  // Кэшируется по размеру viewport: во время игры скролл заблокирован и зона
  // статична, поэтому getBoundingClientRect() не должен вызываться каждый кадр.
  var zoneCache = null;
  var zoneW = -1, zoneH = -1;
  var zoneValid = false;

  function textZone() {
    var w = window.innerWidth, h = window.innerHeight;
    if (zoneValid && zoneW === w && zoneH === h) return zoneCache;
    zoneValid = true;
    zoneW = w; zoneH = h;
    var el = document.querySelector('.availability-card') || document.getElementById('contact');
    if (!el) { zoneCache = null; return null; }
    var r = el.getBoundingClientRect();
    var left = Math.max(r.left + MARGIN, MARGIN);
    var right = Math.min(r.right - MARGIN, w - MARGIN);
    var top = Math.max(r.top + MARGIN, MARGIN);
    var bottom = Math.min(r.bottom - MARGIN, h - MARGIN);
    zoneCache = (right - left < 40 || bottom - top < 40)
      ? null
      : { left: left, right: right, top: top, bottom: bottom };
    return zoneCache;
  }

  function bounce(bug) {
    if (bug.x <= MARGIN || bug.x >= window.innerWidth - MARGIN) bug.vx *= -1;
    if (bug.y <= MARGIN || bug.y >= window.innerHeight - MARGIN) bug.vy *= -1;
    keepInBounds(bug);
  }

  function ensureVelocity(bug) {
    if (!bug.vx && !bug.vy) {
      var a = Math.random() * Math.PI * 2;
      bug.vx = Math.cos(a) * BASE_SPEED;
      bug.vy = Math.sin(a) * BASE_SPEED;
    }
  }

  // constant speed + bounce
  function linear(bug, dt) {
    ensureVelocity(bug);
    bug.x += bug.vx * dt;
    bug.y += bug.vy * dt;
    bounce(bug);
  }

  // rare drift (every 2–4s, 30–60px)
  function idle(bug, dt) {
    bug.timer = (bug.timer || 0) - dt;
    if (bug.timer <= 0) {
      bug.timer = 2 + Math.random() * 2;
      var a = Math.random() * Math.PI * 2;
      var s = 30 + Math.random() * 30;
      bug.vx = Math.cos(a) * s / 0.5;
      bug.vy = Math.sin(a) * s / 0.5;
    }
    bug.x += bug.vx * dt;
    bug.y += bug.vy * dt;
    bug.vx *= 0.94;
    bug.vy *= 0.94;

    if (bug.cfg.id === 'tiny' && bug.role === 'normal') {
      // «Тихоня» бродит в зоне карточки доступности
      var z = textZone();
      if (z) {
        if (bug.x <= z.left || bug.x >= z.right) bug.vx *= -1;
        if (bug.y <= z.top || bug.y >= z.bottom) bug.vy *= -1;
        bug.x = clamp(bug.x, z.left, z.right);
        bug.y = clamp(bug.y, z.top, z.bottom);
      } else {
        bounce(bug);
      }
    } else {
      bounce(bug);
    }
  }

  // hop every 1.2s, 60–100px
  function hop(bug, dt) {
    bug.timer = (bug.timer || 0) - dt;
    if (bug.timer <= 0) {
      bug.timer = 1.2;
      var a = Math.random() * Math.PI * 2;
      var d = 60 + Math.random() * 40;
      bug.vx = Math.cos(a) * d / 0.4;
      bug.vy = Math.sin(a) * d / 0.4;
    }
    bug.x += bug.vx * dt;
    bug.y += bug.vy * dt;
    bug.vx *= 0.92;
    bug.vy *= 0.92;
    bounce(bug);
  }

  // спит → просыпается → перебегает на новое место → снова засыпает
  function sleep(bug, dt) {
    if (!bug.state) bug.state = 'asleep';
    bug.timer = (bug.timer || 0) - dt;

    if (bug.state === 'asleep') {
      if (bug.timer <= 0) {
        bug.state = 'awake';
        var target = randomPos(); // вне HUD
        bug.tx = target.x;
        bug.ty = target.y;
        bug.timer = 2; // перемещение до 2 секунд
      }
    } else {
      var dx = bug.tx - bug.x;
      var dy = bug.ty - bug.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < 5 || bug.timer <= 0) {
        bug.state = 'asleep';
        bug.vx = 0;
        bug.vy = 0;
        bug.timer = 3;
      } else {
        var s = BASE_SPEED * 1.1;
        bug.vx = (dx / d) * s;
        bug.vy = (dy / d) * s;
        bug.x += bug.vx * dt;
        bug.y += bug.vy * dt;
      }
    }
  }

  // flee from cursor when close (+50px)
  function dodge(bug, dt, cursor) {
    ensureVelocity(bug);
    if (cursor) {
      var dx = bug.x - cursor.x;
      var dy = bug.y - cursor.y;
      var d2 = dx * dx + dy * dy;
      if (d2 < 50 * 50) {
        var d = Math.sqrt(d2) || 1;
        var s = Math.hypot(bug.vx, bug.vy) || BASE_SPEED * 1.2;
        bug.vx = (dx / d) * s;
        bug.vy = (dy / d) * s;
      }
    }
    bug.x += bug.vx * dt;
    bug.y += bug.vy * dt;
    bounce(bug);
  }

  // cycle 800ms visible / 400ms hidden
  function blink(bug, dt) {
    bug.timer = (bug.timer || 0) + dt;
    var phase = bug.timer % 1.2;
    var hidden = phase > 0.8;
    if (bug.el) {
      bug.el.style.opacity = hidden ? '0' : '1';
      bug.el.style.pointerEvents = hidden ? 'none' : 'auto';
    }
    linear(bug, dt);
  }

  // убегает от курсора (1.5× базы) только когда тот ближе радиуса реакции.
  // Вне радиуса жук крейсит на постоянной скорости — шустрый, как рейсер, а
  // стены плавно разворачивают его, поэтому в угол сам не бежит и не залипает.
  function flee(bug, dt, cursor) {
    ensureVelocity(bug);

    var s = BASE_SPEED * 1.875; // скорость убегания (была ×1.5, поднята на 25%)
    var r = 90;                 // радиус отталкивания от границ (px)
    var push = s * 2;           // сила отталкивания (сильнее убегания — чтобы не липнуть к стенам)
    var REACT = 200;            // радиус реакции на курсор: убегаем только когда курсор ближе (px)
    var BOOST = 0.8;            // прирост скорости вплотную к курсору (+80%)

    // 1) направление: от курсора (только внутри радиуса реакции);
    //    чем ближе курсор — тем быстрее; иначе крейсерская скорость
    var dx = bug.x - cursor.x;
    var dy = bug.y - cursor.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    var tVx, tVy;
    if (d < REACT) {
      var prox = 1 - d / REACT;         // 0 (у границы зоны) → 1 (вплотную)
      var speed = s * (1 + prox * BOOST);
      tVx = (dx / d) * speed;
      tVy = (dy / d) * speed;
    } else {
      // курсор далеко — сохраняем крейсерскую скорость (не останавливаемся)
      tVx = bug.vx;
      tVy = bug.vy;
    }

    // 2) отталкивание от четырёх стенок (плавное, сильнее у края)
    if (bug.x < r) tVx += (r - bug.x) / r * push;
    else if (bug.x > window.innerWidth - r) tVx -= (bug.x - (window.innerWidth - r)) / r * push;
    if (bug.y < r) tVy += (r - bug.y) / r * push;
    else if (bug.y > window.innerHeight - r) tVy -= (bug.y - (window.innerHeight - r)) / r * push;

    // 3) отталкивание от HUD (правый нижний угол) — мягкое
    var hx = window.innerWidth - HUD_W;
    var hy = window.innerHeight - HUD_H;
    if (bug.x > hx - r && bug.y > hy - r) {
      tVx -= push * 0.5;
      tVy -= push * 0.5;
    }

    // 4) инерция доворота к желаемой скорости
    var k = Math.min(1, STEER * dt);
    bug.vx += (tVx - bug.vx) * k;
    bug.vy += (tVy - bug.vy) * k;

    bug.x += bug.vx * dt;
    bug.y += bug.vy * dt;
    keepInBounds(bug);

    // длина шлейфа зависит от текущей скорости (0 при ≤ базовой)
    var cur = Math.hypot(bug.vx, bug.vy);
    bug.trail = Math.min(1, Math.max(0, (cur - BASE_SPEED) / (BASE_SPEED * 2)));
  }

  // шныряние половинок после разлёта: живо мечется случайными рывками
  function scurry(bug, dt) {
    bug.timer = (bug.timer || 0) - dt;
    if (bug.timer <= 0) {
      bug.timer = 0.8 + Math.random() * 0.8;
      var a = Math.random() * Math.PI * 2;
      var s = 110 + Math.random() * 70;
      bug.vx = Math.cos(a) * s;
      bug.vy = Math.sin(a) * s;
    }
    bug.x += bug.vx * dt;
    bug.y += bug.vy * dt;
    bug.vx *= 0.96;
    bug.vy *= 0.96;
    bounce(bug);
  }

  // раздвоение duplicate: половинки разлетаются в противоположные стороны;
  // пока разлетаются — неуязвимы, затем продолжают шнырять (scurry).
  function split(bug, dt) {
    var S = bug.split;
    if (!S || S.phase === 'free') { scurry(bug, dt); return; }
    S.t += dt;
    var p = Math.min(1, S.t / SPLIT_DRIVE);
    // сначала летит на полной скорости, затем плавно тормозит
    var speed = p < SPLIT_CRUISE
      ? SPLIT_SPEED
      : SPLIT_SPEED * (1 - (p - SPLIT_CRUISE) / (1 - SPLIT_CRUISE));
    bug.vx = Math.cos(S.angle) * speed;
    bug.vy = Math.sin(S.angle) * speed;
    bug.x += bug.vx * dt;
    bug.y += bug.vy * dt;
    keepInBounds(bug);
    if (p >= 1) {
      S.phase = 'free';
      // приземление: половинка сразу получает живой случайный импульс,
      // чтобы не «застыла», а продолжала шнырять
      var a = Math.random() * Math.PI * 2;
      var s = 70 + Math.random() * 50;
      bug.vx = Math.cos(a) * s;
      bug.vy = Math.sin(a) * s;
      if (bug.el) {
        bug.el.classList.remove('is-split-half');
        bug.el.style.pointerEvents = 'auto';
      }
      bug.timer = 0;
    }
  }

  // ---------- Босс: трёхраундовая механика (§18.3) ----------
  // Состояние лежит в bug.boss: { round, hp, phase, spawnTimer, windowTimer,
  // stunTimer, healTimer, growTimer, scaleFrom, scaleTo, startX, startY }.
  // phase: spawning | vulnerable | stunned | healing | exploding.
  // После раунда: контузия (ореол) → лечение (HP + рост + зелёное свечение).
  var BOSS_SPEED = [1.0, 1.3, 1.6]; // множитель скорости по раундам
  var BOSS_STUN = 0.9;  // контузия (кружащийся ореол над головой), с
  var BOSS_HEAL = 3;          // лечение полное (заполнение HP + рост + волны), с
  var BOSS_HEAL_PARTIAL = 1.2; // лечение при провале окна (+1 сегмент), с
  var BOSS_GROW = 0.3;        // плавный рост перед взрывом, с
  var BOSS_WINDOW = 1.6;      // окно уязвимости (базовое), с
  var BOSS_WINDOW_MAX = 2.5;  // макс. окно (адаптивное, после серии провалов)

  // случайный угол, не под HUD (правый нижний резерв)
  function bossCorner() {
    var m = MARGIN + 60;
    var corners = [
      { x: m, y: m },                          // верхний левый
      { x: window.innerWidth - m, y: m },      // верхний правый
      { x: m, y: window.innerHeight - m }      // нижний левый
    ];
    return corners[Math.floor(Math.random() * corners.length)];
  }

  // Восстановление. recharge=true — раунд пройден (контузия → полное лечение
  // + рост); false — провал окна (сразу лечение +1 сегмента, без роста).
  function bossStartRecover(bug, recharge) {
    var B = bug.boss;
    B.recharge = !!recharge;
    if (recharge) {
      B.phase = 'stunned';
      B.stunTimer = BOSS_STUN;
      B.scaleFrom = bug.scale; // размер старого раунда (рост — на этапе лечения)
      if (bug.el) {
        bug.el.classList.remove('is-vulnerable');
        bug.el.classList.add('is-stunned');
      }
    } else {
      B.phase = 'healing';
      B.healTimer = BOSS_HEAL_PARTIAL;
      B.scaleFrom = bug.scale;
      B.scaleTo = bug.scale; // без роста
      if (bug.el) {
        bug.el.classList.remove('is-vulnerable');
        bug.el.classList.add('is-healing');
      }
    }
  }

  // удерживаем босса ближе к центру игровой зоны (не у краёв и не под HUD)
  function keepBossCentered(bug) {
    var cx = window.innerWidth / 2;
    var cy = window.innerHeight / 2;
    var rx = window.innerWidth * 0.30;
    var ry = window.innerHeight * 0.28;
    var minX = cx - rx, maxX = cx + rx;
    var minY = cy - ry, maxY = cy + ry;
    var hx = window.innerWidth - HUD_W;
    var hy = window.innerHeight - HUD_H;
    if (bug.y > hy) maxX = Math.min(maxX, hx); // не под HUD
    if (bug.x <= minX || bug.x >= maxX) bug.vx *= -1;
    if (bug.y <= minY || bug.y >= maxY) bug.vy *= -1;
    bug.x = clamp(bug.x, minX, maxX);
    bug.y = clamp(bug.y, minY, maxY);
  }

  // начало нового окна уязвимости
  function startWindow(bug) {
    var B = bug.boss;
    B.phase = 'vulnerable';
    // адаптивное окно: 2 провала подряд → +0.4с, ещё раз → +0.5с (макс 2.5с)
    var d = BOSS_WINDOW;
    if (B.failStreak >= 2) d += 0.4;
    if (B.failStreak >= 3) d += 0.5;
    B.windowTimer = Math.min(d, BOSS_WINDOW_MAX);
    if (bug.el) bug.el.classList.add('is-vulnerable');
  }

  // уязвимость: тяжёлое движение + ленивый уворот от курсора
  function bossVulnerable(bug, dt, cursor) {
    var B = bug.boss;
    var mult = BOSS_SPEED[B.round - 1] || 1.0;
    bug.timer = (bug.timer || 0) - dt;
    if (bug.timer <= 0) {
      bug.timer = 2.5 + Math.random() * 3.5; // 2.5–6с в одном направлении
      var a = Math.random() * Math.PI * 2;
      var s = (8 + Math.random() * 32) * mult; // 8–40 px/s — разнообразнее
      bug.vx = Math.cos(a) * s;
      bug.vy = Math.sin(a) * s;
      if (Math.random() < 0.15) { bug.vx = 0; bug.vy = 0; } // иногда пауза
    }
    if (cursor && !REDUCED) {
      var dx = bug.x - cursor.x;
      var dy = bug.y - cursor.y;
      var d2 = dx * dx + dy * dy;
      if (d2 < 110 * 110) {
        var d = Math.sqrt(d2) || 1;
        var sc = 72 * mult;
        bug.vx = (dx / d) * sc;
        bug.vy = (dy / d) * sc;
      }
    }
    bug.x += bug.vx * dt;
    bug.y += bug.vy * dt;
    keepBossCentered(bug);
  }

  function boss(bug, dt, cursor) {
    var B = bug.boss;
    if (!B) { bounce(bug); return; } // защитный фолбэк

    if (B.phase === 'spawning') {
      B.spawnTimer -= dt;
      if (REDUCED || B.spawnTimer <= 0) {
        bug.x = B.targetX; bug.y = B.targetY;
        if (bug.el) bug.el.classList.remove('is-spawning');
        startWindow(bug);
      } else {
        // выползает из угла за 0.7с (ease in-out)
        var p = 1 - B.spawnTimer / 0.7;
        var e = p * p * (3 - 2 * p);
        bug.x = B.startX + (B.targetX - B.startX) * e;
        bug.y = B.startY + (B.targetY - B.startY) * e;
      }
      return;
    }

    if (B.phase === 'vulnerable') {
      B.windowTimer -= dt;

      // окно истекло — провал: босс лечится (+1 HP, не выше 3/3)
      if (B.windowTimer <= 0) {
        B.failStreak++; // серия провалов (для адаптивного окна)
        if (B.hp > 0 && B.hp < 3) {
          var si = 3 - B.hp; // индекс восстанавливаемого сегмента (первый пустой)
          B.hp--;
          B.barsDirty = true;
          B.healSeg = si;
          if (bug.hpEl && bug.hpEl.children[si]) bug.hpEl.children[si].classList.add('recovering');
        }
        bossStartRecover(bug, false); // регенерация + прыжок
        return;
      }

      bossVulnerable(bug, dt, cursor); // дрейф
      return;
    }

    if (B.phase === 'stunned') {
      // контузия: стоит на месте, над головой кружащийся ореол
      B.stunTimer -= dt;
      bug.vx = 0; bug.vy = 0;
      if (B.stunTimer <= 0) {
        B.phase = 'healing';
        B.healTimer = BOSS_HEAL;
        if (bug.el) { bug.el.classList.remove('is-stunned'); bug.el.classList.add('is-healing'); }
        if (bug.barsEl) bug.barsEl.classList.add('recharging');
      }
      return;
    }

    if (B.phase === 'healing') {
      // лечение: плавный рост + заполнение HP + сходящиеся волны
      B.healTimer -= dt;
      var hp = 1 - Math.max(0, B.healTimer) / BOSS_HEAL; // 0..1
      var he = hp * hp * (3 - 2 * hp); // ease in-out
      bug.scale = B.scaleFrom + (B.scaleTo - B.scaleFrom) * he;
      bug.vx = 0; bug.vy = 0;
      if (B.healTimer <= 0) {
        bug.scale = B.scaleTo;
        if (B.recharge) {
          B.hp = 0; // полный реген (раунд добит): снять «пустые» сегменты
          if (bug.hpEl) {
            var segs = bug.hpEl.children;
            for (var k = 0; k < segs.length; k++) segs[k].classList.remove('empty');
          }
        } else if (B.healSeg !== undefined && bug.hpEl && bug.hpEl.children[B.healSeg]) {
          bug.hpEl.children[B.healSeg].classList.remove('recovering');
        }
        B.recharge = false;
        // момент ускользания: присесть и выпрыгнуть (направление разнообразнее)
        var ddx, ddy;
        if (cursor && Math.random() >= 0.3) {
          // прочь от курсора с лёгким случайным доворотом
          ddx = bug.x - cursor.x;
          ddy = bug.y - cursor.y;
          var dd = Math.hypot(ddx, ddy);
          if (dd < 8) { ddx = 1; ddy = 0; dd = 1; }
          var jang = Math.atan2(ddy, ddx) + (Math.random() * 2 - 1) * 0.6;
          ddx = Math.cos(jang);
          ddy = Math.sin(jang);
        } else {
          var ra = Math.random() * Math.PI * 2;
          ddx = Math.cos(ra);
          ddy = Math.sin(ra);
        }
        B.jumpX = ddx;
        B.jumpY = ddy;
        B.phase = 'crouching';
        B.crouchTimer = 0.18;
        if (bug.el) { bug.el.classList.remove('is-healing'); bug.el.classList.add('is-crouching'); }
        if (bug.barsEl) bug.barsEl.classList.remove('recharging');
      }
      return;
    }

    if (B.phase === 'crouching') {
      // приседание перед прыжком (сжатие тела через is-crouching)
      B.crouchTimer -= dt;
      bug.vx = 0; bug.vy = 0;
      if (B.crouchTimer <= 0) {
        var roundMult = [1.0, 1.2, 1.5][B.round - 1] || 1.0; // дальше с ростом раунда
        var burst = (430 + Math.random() * 180) * roundMult; // прыжок с разной дальностью
        bug.vx = B.jumpX * burst;
        bug.vy = B.jumpY * burst;
        B.phase = 'jumping';
        B.jumpTimer = 0.5;
        if (bug.el) bug.el.classList.remove('is-crouching');
      }
      return;
    }

    if (B.phase === 'jumping') {
      // прыжок: летит по инерции (ножки поджаты через is-airborne), неуязвим
      B.jumpTimer -= dt;
      bug.x += bug.vx * dt;
      bug.y += bug.vy * dt;
      keepBossCentered(bug);
      if (B.jumpTimer <= 0) {
        bug.timer = 0; // сразу новый случайный курс движения
        startWindow(bug);
      }
      return;
    }

    // exploding: плавный рост до взрыва (убирается из overlay)
    if (B.growTimer > 0) {
      B.growTimer -= dt;
      var gp = 1 - Math.max(0, B.growTimer) / BOSS_GROW;
      var ge = gp * gp * (3 - 2 * gp);
      bug.scale = B.scaleFrom + (B.scaleTo - B.scaleFrom) * ge;
    }
    bug.vx = 0; bug.vy = 0;
  }

  return {
    linear: linear,
    idle: idle,
    hop: hop,
    sleep: sleep,
    dodge: dodge,
    blink: blink,
    split: split,    // обычный duplicate — idle; половинки в разлёте — split
    flee: flee,
    decoy: linear,   // как cosmetic (linear)
    boss: boss,      // трёхраундовая механика
    bossStartRecover: bossStartRecover,
    bossCorner: bossCorner,
    randomPos: randomPos,
    textZone: textZone
  };
})();
