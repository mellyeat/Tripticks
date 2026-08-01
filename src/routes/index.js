// Montaje central de las rutas de la API (RF-18)
'use strict';

const express = require('express');
const authRoutes = require('./auth.routes');

const router = express.Router();

// Sonda de salud para el monitoreo del despliegue (RNF-04).
router.get('/health', (req, res) => {
  res.json({ exito: true, mensaje: 'API operativa', datos: { fecha: new Date().toISOString() } });
});

router.use('/auth', authRoutes);

// Pendientes: /trips (RF-04 al RF-07, RF-13), /reservations (RF-08 al RF-12, RF-15),
// /users (RF-14) y /dashboard (RF-16).

module.exports = router;
