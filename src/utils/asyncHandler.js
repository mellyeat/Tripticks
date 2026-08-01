// Envoltura para controladores async: canaliza los rechazos al middleware de errores
'use strict';

/**
 * Express 5 ya reenvia las promesas rechazadas a next(), pero envolver de forma
 * explicita mantiene el comportamiento evidente y no depende de esa version.
 *
 * @param {Function} fn Controlador async (req, res, next).
 * @returns {Function} Controlador que nunca deja una promesa sin capturar.
 */
function asyncHandler(fn) {
  return function envuelto(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
