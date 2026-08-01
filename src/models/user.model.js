// Acceso a datos de la tabla usuarios (RNF-06)
'use strict';

const supabase = require('../config/supabase');
const { TABLAS, MENSAJES } = require('../config/constants');
const ApiError = require('../utils/apiError');

// Columnas seguras para devolver al cliente: nunca incluyen password_hash.
const CAMPOS_PUBLICOS = 'id, nombre, email, rol, activo, creado_en';

/**
 * Traduce un error de postgrest a ApiError. El codigo 23505 es violacion de
 * restriccion unica, que en esta tabla solo puede ser el email (RF-01).
 */
function traducirError(error) {
  if (error.code === '23505') {
    return ApiError.conflicto(MENSAJES.EMAIL_YA_REGISTRADO);
  }

  return ApiError.interno(`Error de base de datos: ${error.message}`);
}

/**
 * Busca por email incluyendo password_hash: es el unico punto donde el hash
 * sale de la base, y solo lo consume el servicio de login.
 *
 * @param {string} email Ya normalizado a minusculas.
 * @returns {Promise<object|null>}
 */
async function buscarPorEmailConHash(email) {
  const { data, error } = await supabase
    .from(TABLAS.USUARIOS)
    .select(`${CAMPOS_PUBLICOS}, password_hash`)
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw traducirError(error);
  }

  return data;
}

/**
 * @param {string} email Ya normalizado a minusculas.
 * @returns {Promise<boolean>}
 */
async function existeEmail(email) {
  const { data, error } = await supabase
    .from(TABLAS.USUARIOS)
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw traducirError(error);
  }

  return data !== null;
}

/**
 * @param {string} id
 * @returns {Promise<object|null>} Usuario sin password_hash.
 */
async function buscarPorId(id) {
  const { data, error } = await supabase
    .from(TABLAS.USUARIOS)
    .select(CAMPOS_PUBLICOS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw traducirError(error);
  }

  return data;
}

/**
 * @param {{ nombre: string, email: string, passwordHash: string, rol: string }} datos
 * @returns {Promise<object>} Usuario creado, sin password_hash.
 */
async function crear({ nombre, email, passwordHash, rol }) {
  const { data, error } = await supabase
    .from(TABLAS.USUARIOS)
    .insert({ nombre, email, password_hash: passwordHash, rol })
    .select(CAMPOS_PUBLICOS)
    .single();

  if (error) {
    throw traducirError(error);
  }

  return data;
}

module.exports = { buscarPorEmailConHash, buscarPorId, existeEmail, crear, CAMPOS_PUBLICOS };
