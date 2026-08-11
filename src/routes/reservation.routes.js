'use strict';

const express = require('express');
const reservationController = require('../controllers/reservation.controller');
const {
  reglasId,
  reglasListar,
  reglasCrear,
  reglasCambiarEstado,
} = require('../validators/reservation.validator');
const validar = require('../middlewares/validate.middleware');
const { requiereAutenticacion } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(requiereAutenticacion);

router.get('/', reglasListar, validar, reservationController.listar);
router.get('/:id', reglasId, validar, reservationController.detalle);

router.post('/', reglasCrear, validar, reservationController.crear);

// Una reservacion nunca se borra: cancelarla es cambiarle el estado, y por eso
// no hay DELETE. El mismo PATCH sirve al titular (RF-09) y al administrador
// (RF-15); el servicio decide que transiciones puede hacer cada uno.
router.patch('/:id', reglasId, reglasCambiarEstado, validar, reservationController.cambiarEstado);

module.exports = router;
