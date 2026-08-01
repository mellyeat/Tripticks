// Verificacion del token JWT en rutas protegidas (RNF-03)
'use strict';

const jwtUtil = require('../utils/jwt.util');
const userModel = require('../models/user.model');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { MENSAJES } = require('../config/constants');

/**
 * Exige un token valido y deja en req.usuario los datos vigentes del usuario.
 *
 * Se relee de la base en lugar de confiar en el payload porque el token vive
 * horas: un usuario desactivado o degradado de rol seguiria pasando con solo
 * verificar la firma.
 */
const requiereAutenticacion = asyncHandler(async (req, res, next) => {
  const token = jwtUtil.extraerDelEncabezado(req.headers.authorization);

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

module.exports = { requiereAutenticacion };
