// Control de acceso por rol (RF-17)
'use strict';

const ApiError = require('../utils/apiError');
const { ROLES, MENSAJES } = require('../config/constants');

/**
 * Restringe la ruta a los roles indicados. Debe ir siempre despues de
 * requiereAutenticacion, que es quien llena req.usuario.
 *
 * @param {...string} rolesPermitidos
 * @returns {Function} Middleware de Express.
 */
function requiereRol(...rolesPermitidos) {
  return function verificarRol(req, res, next) {
    // Sin req.usuario el middleware de autenticacion no corrio: negar es mas
    // seguro que dejar pasar por un error de montaje de rutas.
    if (!req.usuario) {
      return next(ApiError.noAutenticado(MENSAJES.TOKEN_FALTANTE));
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return next(ApiError.prohibido(MENSAJES.SIN_PERMISOS));
    }

    return next();
  };
}

/** Atajo para las rutas exclusivas de administracion (RF-13, RF-14, RF-15, RF-16). */
const requiereAdministrador = requiereRol(ROLES.ADMINISTRADOR);

module.exports = { requiereRol, requiereAdministrador };
