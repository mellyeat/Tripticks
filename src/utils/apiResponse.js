// Formato uniforme de respuestas de la API (RF-18)
'use strict';

/**
 * Respuesta exitosa: { exito: true, mensaje, datos }
 */
function exito(res, { estado = 200, mensaje = 'Operacion exitosa', datos = null } = {}) {
  return res.status(estado).json({ exito: true, mensaje, datos });
}

/**
 * Respuesta de error: { exito: false, mensaje, detalles }
 */
function error(res, { estado = 500, mensaje = 'Error', detalles = [] } = {}) {
  const cuerpo = { exito: false, mensaje };

  if (detalles.length > 0) {
    cuerpo.detalles = detalles;
  }

  return res.status(estado).json(cuerpo);
}

module.exports = { exito, error };
