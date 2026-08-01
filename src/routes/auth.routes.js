// Rutas de autenticacion (RF-18)
'use strict';

const express = require('express');
const authController = require('../controllers/auth.controller');
const { reglasRegistro, reglasLogin } = require('../validators/auth.validator');
const validar = require('../middlewares/validate.middleware');
const { requiereAutenticacion } = require('../middlewares/auth.middleware');

const router = express.Router();

// Publicas
router.post('/register', reglasRegistro, validar, authController.registrar); // RF-01
router.post('/login', reglasLogin, validar, authController.iniciarSesion); // RF-02

// Protegidas
router.post('/logout', requiereAutenticacion, authController.cerrarSesion); // RF-03
router.get('/me', requiereAutenticacion, authController.perfil);

module.exports = router;
