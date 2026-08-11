'use strict';

const ApiError = require('../utils/apiError');
const { MENSAJES } = require('../config/constants');

function noEncontrado(req, res, next) {
  return next(ApiError.noEncontrado(`${MENSAJES.RUTA_NO_ENCONTRADA} (${req.method} ${req.originalUrl})`));
}

module.exports = noEncontrado;
