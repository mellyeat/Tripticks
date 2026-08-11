'use strict';

const ApiError = require('../utils/apiError');
const logger = require('../config/logger');
const { error: responderError } = require('../utils/apiResponse');
const { MENSAJES, VISTAS } = require('../config/constants');
const { esProduccion } = require('../config/env');

// Una peticion de la API espera JSON; una navegacion del usuario espera una
// pagina. El formato se decide aqui para no repetir la condicion en cada ruta.
function esperaHtml(req) {
  if (req.originalUrl.startsWith('/api')) {
    return false;
  }

  return req.accepts(['html', 'json']) === 'html';
}

/* body-parser rechaza el cuerpo antes de que ninguna ruta lo vea, y lo hace con
   un Error suelto que no es ApiError. Sin traducirlo, un cuerpo demasiado grande
   o un JSON mal formado se reportan como fallo interno del servidor: el cliente
   no puede distinguir "mandaste algo invalido" de "el servidor se rompio", y en
   la bitacora queda un error 500 que no lo es (RF-20). */
const ERRORES_DE_CUERPO = Object.freeze({
  'entity.too.large': { estado: 413, mensaje: 'El contenido enviado es demasiado grande.' },
  'entity.parse.failed': { estado: 400, mensaje: MENSAJES.DATOS_INVALIDOS },
  'request.aborted': { estado: 400, mensaje: 'La peticion se interrumpio antes de completarse.' },
});

function comoApiError(err) {
  if (err instanceof ApiError) {
    return err;
  }

  const conocido = ERRORES_DE_CUERPO[err.type];

  if (conocido) {
    return new ApiError(conocido.estado, conocido.mensaje);
  }

  return err;
}

function manejarErrores(error, req, res, next) {
  const err = comoApiError(error);
  const esConocido = err instanceof ApiError && err.esOperacional;
  const estado = esConocido ? err.estado : 500;

  if (esConocido) {
    logger.advertencia(err.message, { estado, ruta: req.originalUrl, metodo: req.method });
  } else {
    logger.error(err.message, {
      ruta: req.originalUrl,
      metodo: req.method,
      stack: err.stack,
    });
  }

  const mensaje = esConocido || !esProduccion ? err.message : MENSAJES.ERROR_INTERNO;

  if (esperaHtml(req)) {
    return res.status(estado).render(VISTAS.ERROR, { estado, mensaje });
  }

  return responderError(res, {
    estado,
    mensaje,
    detalles: err.detalles || [],
  });
}

module.exports = manejarErrores;
