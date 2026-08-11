// Logica de negocio de autenticacion (RF-01, RF-02, RF-03)
'use strict';

const userModel = require('../models/user.model');
const password = require('../utils/password.util');
const jwtUtil = require('../utils/jwt.util');
const ApiError = require('../utils/apiError');
const logger = require('../config/logger');
const { ROLES, MENSAJES } = require('../config/constants');

/**
 * Los correos se guardan y comparan en minusculas para que "Ana@x.com" y
 * "ana@x.com" no puedan registrarse como dos cuentas distintas (RF-01).
 */
function normalizarEmail(email) {
  return String(email).trim().toLowerCase();
}

/**
 * Registro de usuario (RF-01).
 *
 * @param {{ nombre: string, email: string, password: string }} datos
 * @returns {Promise<{ usuario: object, token: string }>}
 * @throws {ApiError} 409 si el correo ya existe.
 */
async function registrar({ nombre, email, password: passwordPlano }) {
  const emailNormalizado = normalizarEmail(email);

  if (await userModel.existeEmail(emailNormalizado)) {
    throw ApiError.conflicto(MENSAJES.EMAIL_YA_REGISTRADO);
  }

  const passwordHash = await password.hashear(passwordPlano);

  // El rol nunca se toma del cuerpo del request: si el cliente pudiera enviarlo,
  // cualquiera se registraria como administrador (RF-17). Los admin se asignan
  // desde la administracion de usuarios (RF-14).
  const usuario = await userModel.crear({
    nombre: String(nombre).trim(),
    email: emailNormalizado,
    passwordHash,
    rol: ROLES.USUARIO,
  });

  logger.info('Usuario registrado', { id: usuario.id, email: usuario.email });

  return { usuario, token: jwtUtil.firmar(usuario) };
}

/**
 * Inicio de sesion (RF-02).
 *
 * @param {{ email: string, password: string }} credenciales
 * @returns {Promise<{ usuario: object, token: string }>}
 * @throws {ApiError} 401 si las credenciales no coinciden.
 */
async function iniciarSesion({ email, password: passwordPlano }) {
  const emailNormalizado = normalizarEmail(email);
  const usuario = await userModel.buscarPorEmailConHash(emailNormalizado);

  // Mismo mensaje para "no existe" y "contrasena incorrecta": distinguirlos
  // permitiria averiguar que correos estan registrados.
  if (!usuario) {
    // Mismo mensaje no basta: responder al instante aqui delataria, por el
    // tiempo de respuesta, que el correo no esta registrado. Se compara contra
    // un hash de descarte para gastar lo mismo que un login real.
    await password.verificarInexistente(passwordPlano);

    logger.advertencia('Intento de login con correo inexistente', { email: emailNormalizado });
    throw ApiError.noAutenticado(MENSAJES.CREDENCIALES_INVALIDAS);
  }

  const coincide = await password.verificar(passwordPlano, usuario.password_hash);

  if (!coincide) {
    logger.advertencia('Intento de login con contrasena incorrecta', { id: usuario.id });
    throw ApiError.noAutenticado(MENSAJES.CREDENCIALES_INVALIDAS);
  }

  if (!usuario.activo) {
    throw ApiError.prohibido(MENSAJES.CUENTA_DESACTIVADA);
  }

  // El hash no sale del servicio bajo ninguna circunstancia.
  delete usuario.password_hash;

  logger.info('Inicio de sesion exitoso', { id: usuario.id });

  return { usuario, token: jwtUtil.firmar(usuario) };
}

/**
 * Perfil del usuario autenticado, releido de la base para reflejar cambios de
 * rol o desactivaciones ocurridos despues de emitir el token.
 *
 * @param {string} id
 * @returns {Promise<object>}
 * @throws {ApiError} 404 si el usuario ya no existe.
 */
async function obtenerPerfil(id) {
  const usuario = await userModel.buscarPorId(id);

  if (!usuario) {
    throw ApiError.noEncontrado(MENSAJES.USUARIO_NO_ENCONTRADO);
  }

  return usuario;
}

module.exports = { registrar, iniciarSesion, obtenerPerfil };
