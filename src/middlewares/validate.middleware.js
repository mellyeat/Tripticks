// Recoleccion de los resultados de express-validator (RF-19)
'use strict';

const { validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');
const { MENSAJES } = require('../config/constants');

/**
 * Se coloca despues del arreglo de reglas de cada ruta. Si alguna fallo, corta
 * con 400 y el detalle por campo para que el formulario pueda marcarlos.
 */
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
