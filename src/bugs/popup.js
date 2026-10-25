// src/bugs/popup.js
// Финальный попап: отчёт, CTA, закрытие (ESC / клик вне / ×), фокус-ловушка.
window.BUGS = window.BUGS || {};

window.BUGS.popup = (function () {
  'use strict';

  var el = null;
  var opts = null;
  var lastFocus = null;

  function i18n() { return window.BUGS.i18n; }

  function build() {
    if (el) return;
    el = document.createElement('div');
    el.className = 'bug-popup';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="bug-popup-backdrop" data-close></div>' +
      '<div class="bug-popup-card">' +
      '  <button type="button" class="bug-popup-close" data-close><i class="fas fa-times" aria-hidden="true"></i></button>' +
      '  <h3 class="bug-popup-title"></h3>' +
      '  <p class="bug-popup-time"></p>' +
      '  <p class="bug-popup-breakdown"></p>' +
      '  <p class="bug-popup-phrase"></p>' +
      '  <p class="bug-popup-secret"></p>' +
      '  <div class="bug-popup-actions">' +
      '    <button type="button" class="bug-popup-btn bug-popup-primary" data-action="download"></button>' +
      '    <button type="button" class="bug-popup-btn" data-action="restart"></button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(el);

    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) close();
    });
    el.querySelector('[data-action="download"]').addEventListener('click', function () {
      close(false);
      window.print();
    });
    el.querySelector('[data-action="restart"]').addEventListener('click', function () {
      var cb = opts && opts.onRestart;
      close(true);
      if (cb) cb();
    });
    el.querySelector('.bug-popup-card').addEventListener('keydown', trapFocus);
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    var focusables = el.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Разбивка пойманных по severity для отчёта в попапе.
  function breakdown() {
    var counts = { cosmetic: 0, minor: 0, major: 0, critical: 0 };
    var caught = window.BUGS.state.runtime.caught;
    if (caught) {
      caught.forEach(function (id) {
        var c = window.BUGS.config.byId(id);
        if (c && c.severity && counts[c.severity] !== undefined) counts[c.severity]++;
      });
    }
    return i18n().t('bugs.popup.breakdown', '')
      .replace('{critical}', counts.critical)
      .replace('{major}', counts.major)
      .replace('{minor}', counts.minor)
      .replace('{cosmetic}', counts.cosmetic);
  }

  function open(timeMs, callbacks) {
    build();
    opts = callbacks || {};
    lastFocus = document.activeElement;

    // строки перечитываем при каждом открытии (язык мог смениться между заходами)
    var t = i18n().t;
    el.querySelector('.bug-popup-close').setAttribute('aria-label', t('bugs.popup.close', 'Close'));
    el.querySelector('.bug-popup-title').textContent = t('bugs.popup.title', 'All 10 bugs caught');
    el.querySelector('.bug-popup-phrase').textContent = t('bugs.popup.phrase', '');
    el.querySelector('.bug-popup-secret').textContent = t('bugs.popup.secret', '');
    el.querySelector('[data-action="download"]').textContent = t('bugs.popup.download', 'Download CV');
    el.querySelector('[data-action="restart"]').textContent = t('bugs.popup.restart', 'Play again');
    el.querySelector('.bug-popup-time').textContent =
      t('bugs.popup.time', 'Catch time: {time}').replace('{time}', window.BUGS.formatTime(timeMs));
    el.querySelector('.bug-popup-breakdown').textContent = breakdown();

    el.classList.add('active');
    document.body.style.overflow = 'hidden';
    var first = el.querySelector('.bug-popup-primary');
    if (first) first.focus();
  }

  function close(silent) {
    if (!el) return;
    el.classList.remove('active');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus && !silent) lastFocus.focus();
    if (!silent && opts && opts.onDone) opts.onDone();
  }

  return {
    open: open,
    close: close
  };
})();
