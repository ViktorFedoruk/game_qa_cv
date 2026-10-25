// src/bugs/config.js
// Каталог жуков (id/severity/цвет/размер/силуэт/поведение) + i18n-хелпер.
// Имена и тосты локализованы — берутся из assets/translations.js (bugs.*).
window.BUGS = window.BUGS || {};

window.BUGS.config = {
  version: '1.0',
  bugs: [
    { id: 'cosmetic',  severity: 'cosmetic', color: '#9CA3AF', size: 0.8, shape: 'oval',     behavior: 'linear' },
    { id: 'tiny',      severity: 'minor',    color: '#3B82F6', size: 0.9, shape: 'antennae', behavior: 'idle' },
    { id: 'jumper',    severity: 'minor',    color: '#06B6D4', size: 0.9, shape: 'antennae', behavior: 'hop' },
    { id: 'sleeper',   severity: 'minor',    color: '#22C55E', size: 0.9, shape: 'antennae', behavior: 'sleep' },
    { id: 'racer',     severity: 'major',    color: '#EAB308', size: 1.0, shape: 'legs',     behavior: 'dodge' },
    { id: 'flaky',     severity: 'major',    color: '#F97316', size: 1.0, shape: 'legs',     behavior: 'blink' },
    { id: 'duplicate', severity: 'major',    color: '#F472B6', size: 1.0, shape: 'legs',     behavior: 'split' },
    { id: 'sly',       severity: 'major',    color: '#7C3AED', size: 1.0, shape: 'legs',     behavior: 'flee' },
    { id: 'decoy',     severity: 'major',    color: '#14B8A6', size: 1.0, shape: 'legs',     behavior: 'decoy' },
    { id: 'boss',      severity: 'critical', color: '#EF4444', size: 1.4, shape: 'horns',    behavior: 'boss' }
  ],
  // Спавненные «дети» (визуально как tiny; nameKey задаёт имя из bugs.names.*):
  spawned: {
    half:  { id: 'tiny', nameKey: 'half',  severity: 'minor', color: '#3B82F6', size: 0.9, shape: 'antennae', behavior: 'idle' },
    extra: { id: 'tiny', nameKey: 'extra', severity: 'minor', color: '#3B82F6', size: 0.9, shape: 'antennae', behavior: 'idle' }
  },
  byId: function (id) {
    for (var i = 0; i < this.bugs.length; i++) if (this.bugs[i].id === id) return this.bugs[i];
    return null;
  }
};

// Общий хелпер форматирования времени (используется overlay и popup).
window.BUGS.formatTime = function (ms) {
  var total = ms / 1000;
  var m = Math.floor(total / 60);
  var s = total - m * 60;
  if (m > 0) return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  return s.toFixed(1) + 's';
};

// i18n-хелпер: имена/тосты берутся из window.__I18N__ по текущему языку.
window.BUGS.i18n = (function () {
  'use strict';

  function lang() {
    return (document.documentElement && document.documentElement.lang === 'ru') ? 'ru' : 'en';
  }

  function t(key, fallback) {
    var data = (typeof window.__I18N__ === 'object') ? window.__I18N__ : null;
    var dict = data && data[lang()];
    var val = key.split('.').reduce(function (o, k) {
      return (o && o[k] !== undefined) ? o[k] : undefined;
    }, dict);
    return (val === undefined) ? fallback : val;
  }

  function keyOf(entry) { return entry && (entry.nameKey || entry.id); }

  function name(entry) { return t('bugs.names.' + keyOf(entry), entry.id); }
  function toast(entry) { return t('bugs.toasts.' + keyOf(entry), ''); }

  return { lang: lang, t: t, name: name, toast: toast };
})();
