// Controlador de autenticacion: traduce HTTP a llamadas del servicio (RNF-06)
'use strict';

const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { exito } = require('../utils/apiResponse');

/**
 * POST /api/auth/register (RF-01)
 */
const registrar = asyncHandler(async (req, res) => {
  const { nombre, email, password } = req.body;
  const { usuario, token } = await authService.registrar({ nombre, email, password });

  return exito(res, {
    estado: 201,
    mensaje: 'Cuenta creada correctamente.',
    datos: { usuario, token },
  });
});

/**
 * POST /api/auth/login (RF-02)
 */
const iniciarSesion = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { usuario, token } = await authService.iniciarSesion({ email, password });

  return exito(res, {
    mensaje: 'Inicio de sesion exitoso.',
    datos: { usuario, token },
  });
});

/**
 * POST /api/auth/logout (RF-03)
 *
 * Con JWT sin estado el cierre de sesion ocurre en el cliente, que descarta el
 * token. El endpoint existe para dejar el evento en la bitacora y para que el
 * frontend tenga un punto unico al que llamar.
 */
const cerrarSesion = asyncHandler(async (req, res) => {
  return exito(res, { mensaje: 'Sesion cerrada correctamente.' });
});

/**
 * GET /api/auth/me
 *
 * Permite al frontend validar el token guardado y recuperar el rol vigente.
 */
const perfil = asyncHandler(async (req, res) => {
  const usuario = await authService.obtenerPerfil(req.usuario.id);

  return exito(res, { mensaje: 'Perfil obtenido.', datos: { usuario } });
});

module.exports = { registrar, iniciarSesion, cerrarSesion, perfil };
