// src/bugs/state.js
// Единый объект рантайм-состояния (сессионное, без persist).
window.BUGS = window.BUGS || {};

window.BUGS.state = (function () {
  'use strict';

  // Рантайм-состояние (не персистится).
  var runtime = {
    caught: new Set(),  // Set<string> — id пойманных
    startTime: null,
    triggerFired: false,
    popupShown: false,
    layerActive: false
  };

  // Сброс рантайма (ESC / новое прохождение).
  function resetRuntime() {
    runtime.caught.clear();
    runtime.startTime = null;
    runtime.triggerFired = false;
    runtime.popupShown = false;
    runtime.layerActive = false;
  }

  return {
    runtime: runtime,
    resetRuntime: resetRuntime
  };
})();
