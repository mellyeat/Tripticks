// Registro de peticiones HTTP con morgan (RNF-15)
'use strict';

const morgan = require('morgan');
const logger = require('../config/logger');
const { esProduccion } = require('../config/env');

// combined incluye IP, user-agent y referer, utiles para auditar en produccion;
// dev es mas legible mientras se desarrolla.
const formato = esProduccion ? 'combined' : 'dev';

module.exports = morgan(formato, { stream: logger.flujoHttp });
