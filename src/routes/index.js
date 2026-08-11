// Montaje central de las rutas de la API (RF-18)
'use strict';

const express = require('express');
const authRoutes = require('./auth.routes');
const tripRoutes = require('./trip.routes');
const reservationRoutes = require('./reservation.routes');
const userRoutes = require('./user.routes');
const dashboardRoutes = require('./dashboard.routes');
const { limitar } = require('../middlewares/rateLimit.middleware');
const { LIMITES_PETICIONES, MENSAJES } = require('../config/constants');

const router = express.Router();

// Cupo general de la API. El de /auth es mas estrecho y se aplica encima de este.
router.use(
  limitar({
    nombre: 'api',
    ...LIMITES_PETICIONES.GENERAL,
    mensaje: MENSAJES.DEMASIADAS_PETICIONES,
  })
);

// Sonda de salud para el monitoreo del despliegue (RNF-04).
router.get('/health', (req, res) => {
  res.json({ exito: true, mensaje: 'API operativa', datos: { fecha: new Date().toISOString() } });
});

router.use('/auth', authRoutes);
router.use('/trips', tripRoutes);
router.use('/reservations', reservationRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
