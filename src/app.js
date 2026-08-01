// Instancia de Express: middlewares globales, archivos estaticos, montaje de rutas y manejo de errores
'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const rutas = require('./routes');
const registroHttp = require('./middlewares/logger.middleware');
const noEncontrado = require('./middlewares/notFound.middleware');
const manejarErrores = require('./middlewares/error.middleware');

const app = express();

// Seguridad y parseo
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Bitacora de peticiones (RNF-15)
app.use(registroHttp);

// Frontend estatico
app.use(express.static(path.resolve(__dirname, '../public')));

// API REST (RF-18)
app.use('/api', rutas);

// La cadena termina con 404 y luego el manejador de errores: el orden importa,
// cualquier middleware montado despues nunca se ejecutaria.
app.use(noEncontrado);
app.use(manejarErrores);

module.exports = app;
