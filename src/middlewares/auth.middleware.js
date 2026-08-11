'use strict';

const jwtUtil = require('../utils/jwt.util');
const userModel = require('../models/user.model');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { COOKIE_SESION, MENSAJES } = require('../config/constants');

// Las llamadas de la API viajan con el encabezado Authorization; las vistas
// renderizadas en el servidor solo pueden identificarse por la cookie.
function extraerToken(req) {
  const delEncabezado = jwtUtil.extraerDelEncabezado(req.headers.authorization);

  if (delEncabezado) {
    return delEncabezado;
  }

  return (req.cookies && req.cookies[COOKIE_SESION]) || null;
}

const requiereAutenticacion = asyncHandler(async (req, res, next) => {
  const token = extraerToken(req);

  if (!token) {
    throw ApiError.noAutenticado(MENSAJES.TOKEN_FALTANTE);
  }

  const payload = jwtUtil.verificar(token);
  const usuario = await userModel.buscarPorId(payload.sub);

  if (!usuario) {
    throw ApiError.noAutenticado(MENSAJES.TOKEN_INVALIDO);
  }

  if (!usuario.activo) {
    throw ApiError.prohibido(MENSAJES.CUENTA_DESACTIVADA);
  }

  req.usuario = usuario;
  return next();
});

const autenticacionOpcional = asyncHandler(async (req, res, next) => {
  const token = extraerToken(req);

  if (!token) {
    return next();
  }

  try {
    const payload = jwtUtil.verificar(token);
    const usuario = await userModel.buscarPorId(payload.sub);

    if (usuario && usuario.activo) {
      req.usuario = usuario;
    }
  } catch {
    // Un token vencido o ilegible no puede tumbar una ruta publica: la peticion
    // continua como anonima y el controlador decide que se ve sin sesion.
  }

  return next();
});

module.exports = { requiereAutenticacion, autenticacionOpcional };
