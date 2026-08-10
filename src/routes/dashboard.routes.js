'use strict';

const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { requiereAutenticacion } = require('../middlewares/auth.middleware');
const { requiereAdministrador } = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/', requiereAutenticacion, requiereAdministrador, dashboardController.resumen);

module.exports = router;
