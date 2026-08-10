'use strict';

const morgan = require('morgan');
const logger = require('../config/logger');
const { esProduccion } = require('../config/env');

const formato = esProduccion ? 'combined' : 'tiny';

module.exports = morgan(formato, { stream: logger.flujoHttp });
