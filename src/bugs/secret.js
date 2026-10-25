// src/bugs/secret.js
// Секретная строчка в контактах после завершения (сессионная).
window.BUGS = window.BUGS || {};

window.BUGS.secret = (function () {
  'use strict';

  var el = null;

  function show(host) {
    if (!host) return;
    if (!el) {
      el = document.createElement('p');
      el.className = 'bug-secret';
      // data-i18n: сайт сам переведёт строку при смене языка
      el.setAttribute('data-i18n', 'bugs.secret');
      host.appendChild(el);
    }
    // перечитываем текст при каждом показе (язык мог смениться)
    el.textContent = window.BUGS.i18n.t('bugs.secret', '');
  }

  return { show: show };
})();
