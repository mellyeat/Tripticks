'use strict';

const express = require('express');
const tripController = require('../controllers/trip.controller');
const {
  reglasId,
  reglasListar,
  reglasCrear,
  reglasActualizar,
} = require('../validators/trip.validator');
const validar = require('../middlewares/validate.middleware');
const { requiereAutenticacion, autenticacionOpcional } = require('../middlewares/auth.middleware');
const { requiereAdministrador } = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', reglasListar, validar, autenticacionOpcional, tripController.listar);
router.get('/:id', reglasId, validar, tripController.detalle);

router.post('/', requiereAutenticacion, requiereAdministrador,
  reglasCrear, validar, tripController.crear);

router.put('/:id', requiereAutenticacion, requiereAdministrador,
  reglasId, reglasActualizar, validar, tripController.actualizar);

router.delete('/:id', requiereAutenticacion, requiereAdministrador,
  reglasId, validar, tripController.eliminar);

module.exports = router;
