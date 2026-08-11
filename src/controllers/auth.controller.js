'use strict';

const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { exito } = require('../utils/apiResponse');
const { COOKIE_SESION } = require('../config/constants');
const { esProduccion } = require('../config/env');


const OPCIONES_COOKIE = Object.freeze({
  httpOnly: true,
  sameSite: 'lax',
  secure: esProduccion,
  path: '/',
});

const registrar = asyncHandler(async (req, res) => {
  const { nombre, email, password } = req.body;
  const { usuario, token } = await authService.registrar({ nombre, email, password });

  res.cookie(COOKIE_SESION, token, OPCIONES_COOKIE);

  return exito(res, {
    estado: 201,
    mensaje: 'Cuenta creada correctamente.',
    datos: { usuario, token },
  });
});

const iniciarSesion = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { usuario, token } = await authService.iniciarSesion({ email, password });

  res.cookie(COOKIE_SESION, token, OPCIONES_COOKIE);

  return exito(res, {
    mensaje: 'Inicio de sesion exitoso.',
    datos: { usuario, token },
  });
});

const cerrarSesion = asyncHandler(async (req, res) => {
  res.clearCookie(COOKIE_SESION, OPCIONES_COOKIE);

  return exito(res, { mensaje: 'Sesion cerrada correctamente.' });
});

const perfil = asyncHandler(async (req, res) => {
  const usuario = await authService.obtenerPerfil(req.usuario.id);

  return exito(res, { mensaje: 'Perfil obtenido.', datos: { usuario } });
});

module.exports = { registrar, iniciarSesion, cerrarSesion, perfil };
