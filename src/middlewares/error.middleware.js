// Manejador central de errores (RF-20, RNF-15)
'use strict';

const ApiError = require('../utils/apiError');
const logger = require('../config/logger');
const { error: responderError } = require('../utils/apiResponse');
const { MENSAJES } = require('../config/constants');
const { esProduccion } = require('../config/env');

/**
 * Express identifica este middleware como manejador de errores por sus cuatro
 * parametros, asi que "next" debe declararse aunque no se use.
 */
// eslint-disable-next-line no-unused-vars
function manejarErrores(err, req, res, next) {
  const esConocido = err instanceof ApiError && err.esOperacional;
  const estado = esConocido ? err.estado : 500;

  // Los errores previstos (validacion, credenciales) son ruido en error.log;
  // los inesperados si necesitan traza completa para depurar.
  if (esConocido) {
    logger.advertencia(err.message, { estado, ruta: req.originalUrl, metodo: req.method });
  } else {
    logger.error(err.message, {
      ruta: req.originalUrl,
      metodo: req.method,
      stack: err.stack,
    });
  }

  // Un error inesperado puede traer rutas internas o datos de conexion en su
  // mensaje: en produccion se responde un texto generico.
  const mensaje = esConocido || !esProduccion ? err.message : MENSAJES.ERROR_INTERNO;

  return responderError(res, {
    estado,
    mensaje,
    detalles: err.detalles || [],
  });
}

module.exports = manejarErrores;
