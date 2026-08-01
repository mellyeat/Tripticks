// Firma y verificacion de tokens JWT (RNF-03)
'use strict';

const jwt = require('jsonwebtoken');
const { jwt: config } = require('../config/env');
const ApiError = require('./apiError');
const { MENSAJES } = require('../config/constants');

/**
 * Genera el token de sesion (RF-02).
 *
 * Solo van al payload el id y el rol: el token viaja al navegador y es legible
 * por cualquiera que lo tenga, asi que no lleva datos que no sean necesarios.
 *
 * @param {{ id: string, rol: string }} usuario
 * @returns {string}
 */
function firmar(usuario) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol }, config.secreto, {
    expiresIn: config.expiracion,
  });
}

/**
 * @param {string} token
 * @returns {{ sub: string, rol: string, iat: number, exp: number }}
 * @throws {ApiError} 401 si el token expiro o es invalido.
 */
function verificar(token) {
  try {
    return jwt.verify(token, config.secreto);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.noAutenticado(MENSAJES.TOKEN_EXPIRADO);
    }

    throw ApiError.noAutenticado(MENSAJES.TOKEN_INVALIDO);
  }
}

/**
 * Extrae el token del encabezado "Authorization: Bearer <token>".
 *
 * @param {string|undefined} encabezado
 * @returns {string|null}
 */
function extraerDelEncabezado(encabezado) {
  if (!encabezado || typeof encabezado !== 'string') {
    return null;
  }

  const [esquema, token] = encabezado.split(' ');

  if (esquema !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

module.exports = { firmar, verificar, extraerDelEncabezado };
