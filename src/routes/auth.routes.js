'use strict';

const express = require('express');
const authController = require('../controllers/auth.controller');
const { reglasRegistro, reglasLogin } = require('../validators/auth.validator');
const validar = require('../middlewares/validate.middleware');
const { requiereAutenticacion } = require('../middlewares/auth.middleware');
const { limitar } = require('../middlewares/rateLimit.middleware');
const { LIMITES_PETICIONES, MENSAJES } = require('../config/constants');

const router = express.Router();

/* Registro e inicio de sesion son las dos puertas que se pueden empujar sin
   credenciales, asi que llevan el cupo mas estrecho: sin el, probar contrasenas
   o averiguar que correos existen no le cuesta nada a quien lo intente. */
const limitarAcceso = limitar({
  nombre: 'acceso',
  ...LIMITES_PETICIONES.ACCESO,
  mensaje: MENSAJES.DEMASIADOS_INTENTOS,
});

router.post('/register', limitarAcceso, reglasRegistro, validar, authController.registrar);
router.post('/login', limitarAcceso, reglasLogin, validar, authController.iniciarSesion);

router.post('/logout', requiereAutenticacion, authController.cerrarSesion);
router.get('/me', requiereAutenticacion, authController.perfil);

module.exports = router;
