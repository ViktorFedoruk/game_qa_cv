// src/bugs/toasts.js
// Тосты: одновременно не более 2, без накопления в очереди.
// Новый тост при заполненном лимите вытесняет самый старый (принудительное скрытие).
// Смена сопровождается FLIP-анимацией: оставшийся тост плавно переезжает наверх,
// а не прыгает мгновенно на освободившееся место.
window.BUGS = window.BUGS || {};

window.BUGS.toasts = (function () {
  'use strict';

  var MAX_VISIBLE = 2;
  var LIFE = 4500;      // мс: время жизни, достаточное для прочтения
  var FADE = 190;       // мс: длительность анимации ухода
  var SHIFT = 280;      // мс: длительность плавного переезда соседних тостов
  var container = null;
  var active = [];      // активные тосты в порядке появления (старые — первыми)

  function ensureContainer() {
    if (container) return;
    container = document.createElement('div');
    container.className = 'bug-toasts';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // снимок вертикальных позиций до изменения DOM (FLIP: First)
  function measure() {
    var map = [];
    for (var i = 0; i < active.length; i++) {
      map.push({ rec: active[i], top: active[i].el.getBoundingClientRect().top });
    }
    return map;
  }

  // после изменения DOM плавно «переезжаем» со старой позиции (FLIP).
  // Используем отдельную CSS-анимацию translateY, чтобы не воевать с transform,
  // который задаёт класс .in — иначе inline-transform залипает.
  function settle(before) {
    for (var i = 0; i < before.length; i++) {
      var rec = before[i].rec;
      if (rec.dying || !rec.el.isConnected) continue;
      var el = rec.el;
      var dy = before[i].top - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) continue;
      el.style.setProperty('--shift-from', dy.toFixed(1) + 'px');
      el.classList.remove('is-shifting');
      void el.offsetWidth;            // перезапуск анимации
      el.classList.add('is-shifting');
    }
  }

  // name, color, text (severity в тосте не выводится)
  function push(name, color, text) {
    ensureContainer();
    present({ name: name, color: color, text: text });
  }

  // подсказка (первый тост без цвета)
  function hint(text) {
    ensureContainer();
    present({ name: '', color: '#38bdf8', text: text, hint: true });
  }

  function present(item) {
    var before = measure();

    // лимит занят — принудительно убираем самый старый (без очереди и ожидания)
    while (active.length >= MAX_VISIBLE) {
      dismiss(active[0], true);
    }
    show(item);

    settle(before);
  }

  function show(item) {
    var el = document.createElement('div');
    el.className = 'bug-toast' + (item.hint ? ' bug-toast-hint' : '');
    el.setAttribute('role', 'status');
    el.style.setProperty('--toast-color', item.color);

    // имя вынесено отдельной строкой (block в CSS), поэтому разделитель не нужен
    var html = '';
    if (item.name) html += '<b>' + escapeHtml(item.name) + '</b>';
    if (item.text) html += escapeHtml(item.text);
    el.innerHTML = '<span class="bug-toast-bar"></span><span class="bug-toast-text">' + html + '</span>';

    var rec = { el: el, timer: null, dying: false };
    rec.timer = setTimeout(function () { dismiss(rec, false); }, LIFE);

    container.appendChild(el);
    // вступление — в следующем кадре, чтобы сработал переход.
    // setTimeout — страховка: если rAF не сработает (фоновая вкладка, некоторые
    // headless-режимы), тост всё равно станет видимым, а не останется прозрачным.
    var entered = false;
    function enter() {
      if (entered || !el.isConnected) return;
      entered = true;
      el.classList.add('in');
    }
    requestAnimationFrame(enter);
    setTimeout(enter, 50);

    active.push(rec);
    return rec;
  }

  // forced — принудительное скрытие (вытеснение новым тостом) или естественное
  function dismiss(rec, forced) {
    if (!rec || rec.dying) return;
    rec.dying = true;
    if (rec.timer) { clearTimeout(rec.timer); rec.timer = null; }

    var i = active.indexOf(rec);
    if (i >= 0) active.splice(i, 1);

    var el = rec.el;
    el.classList.remove('in');
    el.classList.add('out');
    setTimeout(function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }, FADE);
  }

  function clear() {
    for (var i = 0; i < active.length; i++) {
      if (active[i].timer) clearTimeout(active[i].timer);
    }
    active = [];
    if (container) container.innerHTML = '';
  }

  return { push: push, hint: hint, clear: clear };
})();
