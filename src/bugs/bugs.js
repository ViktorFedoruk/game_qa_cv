// src/bugs/bugs.js
// Точка входа пасхалки «Жуки в контактах» (desktop only, ≥1024px).
// Загружается последним среди src/bugs/*.js и читает window.BUGS.*.
window.BUGS = window.BUGS || {};

window.BUGS.entry = (function () {
  'use strict';

  var DESKTOP_MQ = '(min-width: 1024px)';
  var APPEAR_MS = 2000;   // задержка появления триггера после входа в контакты
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var contacts = null;
  var trigger = null;
  var rafId = null;
  var lastT = 0;
  var cursor = { x: -1000, y: -1000 };
  var appearTimer = null;
  var inView = true;
  var observer = null;
  var returnFocusOnShow = false; // вернуть фокус на триггер после выхода (кнопка/ESC)

  var state = window.BUGS.state;
  var overlay = window.BUGS.overlay;
  var toasts = window.BUGS.toasts;
  var popup = window.BUGS.popup;
  var secret = window.BUGS.secret;

  function init() {
    if (!window.matchMedia(DESKTOP_MQ).matches) return; // §12
    contacts = document.getElementById('contact');
    if (!contacts) return;

    // Состояние сессионное: при перезагрузке страницы пасхалка
    // сбрасывается и доступна заново (триггер показывается снова).
    setupTrigger();
    setupCursor();
    setupObserver();
    setupGlobalKeys();
    armAppear();
  }

  /* ---------- триггер ---------- */

  function setupTrigger() {
    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'bug-trigger bug-shape-antennae';
    // data-i18n-aria: сайт сам обновит aria-label при смене языка
    trigger.setAttribute('data-i18n-aria', 'bugs.trigger');
    var legsHtml = '';
    for (var li = 0; li < 6; li++) legsHtml += '<span class="bug-leg"></span>';
    trigger.innerHTML =
      '<span class="bug-inner">' +
        '<span class="bug-legs">' + legsHtml + '</span>' +
        '<span class="bug-body">' +
          '<span class="bug-shell"></span>' +
          '<span class="bug-eyes">' +
            '<span class="bug-eye"><span class="pupil"></span></span>' +
            '<span class="bug-eye"><span class="pupil"></span></span>' +
          '</span>' +
          '<span class="bug-antennae"><span></span><span></span></span>' +
        '</span>' +
      '</span>';
    trigger.addEventListener('click', startGame); // <button> нативно ловит Enter/Space → click
    // Размещаем возле карточки доступности (или в секции контактов как фолбэк).
    var host = contacts.querySelector('.availability-card') || contacts;
    host.appendChild(trigger);
  }

  function showTrigger() {
    if (state.runtime.layerActive || state.runtime.popupShown) return;
    if (!inView) return;
    if (trigger) {
      trigger.setAttribute('aria-label', window.BUGS.i18n.t('bugs.trigger', 'Secret bug'));
      trigger.classList.add('show');
      startTriggerAnim();
      if (returnFocusOnShow) {
        returnFocusOnShow = false;
        trigger.focus({ preventScroll: true });
      }
    }
  }

  function hideTrigger() {
    if (trigger) {
      trigger.classList.remove('show');
      stopTriggerAnim();
    }
  }

  /* ---------- процедурная анимация триггера ---------- */

  var trig = {
    rafId: null,
    lastT: 0,
    x: 0, y: 0, rot: 0,
    tx: 0, ty: 0, trot: 0,
    timer: 0,
    squatting: false,
    squatTimer: 0,
    squatCooldown: 5
  };

  function startTriggerAnim() {
    if (REDUCED || trig.rafId) return;
    trig.lastT = 0;
    trig.rafId = requestAnimationFrame(triggerLoop);
  }

  function stopTriggerAnim() {
    if (trig.rafId) { cancelAnimationFrame(trig.rafId); trig.rafId = null; }
    trig.x = trig.y = trig.rot = 0;
    trig.tx = trig.ty = trig.trot = 0;
    trig.timer = 0;
    trig.squatting = false;
    trig.squatTimer = 0;
    trig.squatCooldown = 5;
    if (trigger) {
      trigger.classList.remove('is-squatting');
      trigger.style.transform = '';
    }
  }

  function triggerLoop(t) {
    var dt = trig.lastT ? Math.min(50, t - trig.lastT) / 1000 : 1 / 60;
    trig.lastT = t;
    updateTrigger(dt);
    trig.rafId = requestAnimationFrame(triggerLoop);
  }

  function updateTrigger(dt) {
    if (!trigger) return;

    var k = 1 - Math.exp(-3 * dt);

    if (trig.squatting) {
      // приседание: стоим на месте, тело и ножки анимирует CSS-класс
      trig.squatTimer -= dt;
      if (trig.squatTimer <= 0) {
        trig.squatting = false;
        trig.squatCooldown = 5 + Math.random() * 5; // 5–10с до следующей серии
        trigger.classList.remove('is-squatting');
      }
    } else {
      // ходьба: дрейф к случайной точке, ножки перебираются (CSS)
      trig.timer -= dt;
      if (trig.timer <= 0) {
        trig.timer = 1 + Math.random() * 0.6;
        trig.tx = Math.random() * 38 - 36;   // -36..2px (больше влево, вглубь карточки)
        trig.ty = Math.random() * 16 - 6;    // -6..10px (лёгкий bob)
        trig.trot = Math.random() * 12 - 6;  // -6..6° (мелкое покачивание)
      }
      trig.x += (trig.tx - trig.x) * k;
      trig.y += (trig.ty - trig.y) * k;
      trig.rot += (trig.trot - trig.rot) * k;

      // запускаем серию приседаний
      trig.squatCooldown -= dt;
      if (trig.squatCooldown <= 0) {
        trig.squatting = true;
        trig.squatTimer = 2.2; // длительность серии приседаний
        trigger.classList.add('is-squatting');
      }
    }

    trigger.style.transform =
      'translate(' + trig.x.toFixed(1) + 'px,' + trig.y.toFixed(1) + 'px) rotate(' + trig.rot.toFixed(1) + 'deg)';
  }

  /* ---------- ввод / наблюдатели ---------- */

  function setupCursor() {
    window.addEventListener('pointermove', function (e) {
      cursor.x = e.clientX;
      cursor.y = e.clientY;
    }, { passive: true });
  }

  function setupObserver() {
    if (!('IntersectionObserver' in window)) { inView = true; return; }
    observer = new IntersectionObserver(function (entries) {
      var nowVisible = entries[0].isIntersecting;
      if (nowVisible) {
        inView = true;
        armAppear(); // вошли в контакты — запускаем таймер появления
      } else {
        inView = false;
        clearAppear();
        hideTrigger();
      }
    }, { threshold: 0.1 });
    observer.observe(contacts);
  }

  function setupGlobalKeys() {
    window.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (state.runtime.popupShown) { popup.close(); return; }
      if (state.runtime.layerActive) {
        exitGame();
      }
    });
  }

  /* ---------- блокировка фоновой страницы ---------- */

  function lockBackground(flag) {
    ['mainContent', 'mainNav'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.inert = flag;
    });
    var sw = document.querySelector('.language-switcher');
    if (sw) sw.inert = flag;
  }

  // Единая точка выхода из игры (ESC мгновенно, кнопка HUD — через 150–200 мс).
  function exitGame() {
    stopLoop();
    overlay.destroy();
    toasts.clear();
    state.resetRuntime();
    lockBackground(false);
    hideTrigger();
    returnFocusOnShow = true; // вернуть фокус на триггер после его повторного показа
    armAppear();
  }

  /* ---------- появление триггера ---------- */

  function armAppear() {
    if (state.runtime.layerActive || state.runtime.popupShown) return;
    if (!inView) return;
    clearAppear();
    appearTimer = setTimeout(showTrigger, APPEAR_MS);
  }

  function clearAppear() {
    if (appearTimer) { clearTimeout(appearTimer); appearTimer = null; }
  }

  /* ---------- игровой цикл ---------- */

  function startGame() {
    if (state.runtime.layerActive) return;
    hideTrigger();
    clearAppear();
    state.resetRuntime();
    state.runtime.startTime = performance.now();
    state.runtime.triggerFired = true;
    state.runtime.layerActive = true;

    overlay.create();
    lockBackground(true);
    overlay.spawn();
    overlay.setOnComplete(onComplete);
    overlay.setOnExit(exitGame);
    toasts.hint(window.BUGS.i18n.t('bugs.hint', 'Catch all the bugs · ESC to exit'));

    startLoop();
  }

  function onComplete() {
    stopLoop();
    var elapsed = performance.now() - state.runtime.startTime;
    overlay.destroy();
    state.runtime.layerActive = false;
    state.runtime.popupShown = true;
    popup.open(elapsed, { onDone: finish, onRestart: restart });
  }

  function finish() {
    state.runtime.popupShown = false;
    lockBackground(false);
    secret.show(contacts);
    armAppear(); // даём перезапустить пасхалку после завершения
  }

  function restart() {
    state.runtime.popupShown = false;
    startGame();
  }

  function startLoop() {
    lastT = 0;
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function loop(t) {
    var dt = lastT ? Math.min(50, t - lastT) / 1000 : 1 / 60;
    lastT = t;
    if (!document.hidden && state.runtime.layerActive) {
      overlay.step(dt, cursor);
    }
    rafId = requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init: init };
})();
