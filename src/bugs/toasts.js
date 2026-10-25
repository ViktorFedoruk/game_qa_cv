// src/bugs/toasts.js
// Очередь тостов: max 2 одновременно, pointer-events: none, aria-live.
window.BUGS = window.BUGS || {};

window.BUGS.toasts = (function () {
  'use strict';

  var MAX_VISIBLE = 2;
  var LIFE = 2500;   // мс
  var container = null;
  var visible = 0;
  var queue = [];

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

  // name, color, text (severity в тосте не выводится)
  function push(name, color, text) {
    ensureContainer();
    queue.push({ name: name, color: color, text: text });
    drain();
  }

  // подсказка (первый тост без цвета)
  function hint(text) {
    ensureContainer();
    queue.push({ name: '', color: '#38bdf8', text: text, hint: true });
    drain();
  }

  function drain() {
    while (visible < MAX_VISIBLE && queue.length) show(queue.shift());
  }

  function show(item) {
    visible++;
    var el = document.createElement('div');
    el.className = 'bug-toast' + (item.hint ? ' bug-toast-hint' : '');
    el.setAttribute('role', 'status');
    el.style.setProperty('--toast-color', item.color);

    var parts = [];
    if (item.name) parts.push('<b>' + escapeHtml(item.name) + '</b>');
    if (item.text) parts.push(escapeHtml(item.text));
    el.innerHTML = '<span class="bug-toast-bar"></span><span class="bug-toast-text">' + parts.join(' · ') + '</span>';

    container.appendChild(el);
    // вступление
    requestAnimationFrame(function () { el.classList.add('in'); });

    var ttl = LIFE;

    setTimeout(function () {
      el.classList.remove('in');
      el.classList.add('out');
      setTimeout(function () {
        if (!el.isConnected) return; // слой очищен (clear) — счётчик не трогаем
        el.remove();
        visible--;
        drain();
      }, 200);
    }, ttl);
  }

  function clear() {
    if (container) container.innerHTML = '';
    queue = [];
    visible = 0;
  }

  return { push: push, hint: hint, clear: clear };
})();
