'use strict';

const ApiError = require('../utils/apiError');
const { ROLES, MENSAJES } = require('../config/constants');

function requiereRol(...rolesPermitidos) {
  return function verificarRol(req, res, next) {
    if (!req.usuario) {
      return next(ApiError.noAutenticado(MENSAJES.TOKEN_FALTANTE));
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return next(ApiError.prohibido(MENSAJES.SIN_PERMISOS));
    }

    return next();
  };
}

const requiereAdministrador = requiereRol(ROLES.ADMINISTRADOR);

module.exports = { requiereRol, requiereAdministrador };
