'use strict';

const jwt = require('jsonwebtoken');
const { jwt: config } = require('../config/env');
const ApiError = require('./apiError');
const { MENSAJES } = require('../config/constants');

// Se fija el algoritmo en los dos sentidos. Al verificar es lo que importa: sin
// la lista, quien reciba un token decide con que algoritmo se comprueba su
// propia firma, que es la puerta de la confusion de algoritmos.
const ALGORITMOS = ['HS256'];

function firmar(usuario) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol }, config.secreto, {
    expiresIn: config.expiracion,
    algorithm: ALGORITMOS[0],
  });
}

function verificar(token) {
  try {
    return jwt.verify(token, config.secreto, { algorithms: ALGORITMOS });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.noAutenticado(MENSAJES.TOKEN_EXPIRADO);
    }

    throw ApiError.noAutenticado(MENSAJES.TOKEN_INVALIDO);
  }
}

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
