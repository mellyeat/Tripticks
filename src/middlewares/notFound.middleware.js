// Captura de rutas inexistentes (RF-20)
'use strict';

const ApiError = require('../utils/apiError');
const { MENSAJES } = require('../config/constants');

/**
 * Se monta al final de la cadena: si ninguna ruta respondio, la peticion llega
 * aqui y se convierte en un 404 con el mismo formato que el resto de errores.
 */
function noEncontrado(req, res, next) {
  return next(ApiError.noEncontrado(`${MENSAJES.RUTA_NO_ENCONTRADA} (${req.method} ${req.originalUrl})`));
}

module.exports = noEncontrado;
