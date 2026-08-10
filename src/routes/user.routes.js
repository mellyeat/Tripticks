'use strict';

const express = require('express');
const userController = require('../controllers/user.controller');
const {
  reglasId,
  reglasListar,
  reglasCrear,
  reglasActualizar,
} = require('../validators/user.validator');
const validar = require('../middlewares/validate.middleware');
const { requiereAutenticacion } = require('../middlewares/auth.middleware');
const { requiereAdministrador } = require('../middlewares/role.middleware');

const router = express.Router();

router.use(requiereAutenticacion, requiereAdministrador);

router.get('/', reglasListar, validar, userController.listar);
router.get('/:id', reglasId, validar, userController.detalle);

router.post('/', reglasCrear, validar, userController.crear);

router.put('/:id', reglasId, reglasActualizar, validar, userController.actualizar);

// La baja es logica: DELETE pone activo en false y conserva las reservaciones,
// que se irian en cascada si se borrara la fila (RF-14).
router.delete('/:id', reglasId, validar, userController.desactivar);

module.exports = router;
