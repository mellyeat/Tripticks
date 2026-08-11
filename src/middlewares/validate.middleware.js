'use strict';

const { validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');
const { MENSAJES } = require('../config/constants');

function validar(req, res, next) {
  const resultado = validationResult(req);

  if (resultado.isEmpty()) {
    return next();
  }

  const detalles = resultado.array().map((error) => ({
    campo: error.path,
    mensaje: error.msg,
  }));

  return next(ApiError.solicitudInvalida(MENSAJES.DATOS_INVALIDOS, detalles));
}

module.exports = validar;
