// Punto de entrada: carga variables de entorno, levanta el servidor HTTP y escucha el puerto (RNF-13)
'use strict';

const app = require('./src/app');
const { puerto, entorno } = require('./src/config/env');
const logger = require('./src/config/logger');

const servidor = app.listen(puerto, () => {
  logger.info(`Servidor escuchando en http://localhost:${puerto} (${entorno})`);
});

// Sin estos manejadores un fallo asincrono fuera de Express dejaria el proceso
// vivo pero inconsistente, y sin rastro en la bitacora (RNF-15).
process.on('unhandledRejection', (razon) => {
  logger.error('Promesa rechazada sin manejar', { razon: String(razon) });
  servidor.close(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
  logger.error('Excepcion no capturada', { mensaje: error.message, stack: error.stack });
  process.exit(1);
});

// Cierre ordenado: permite terminar las peticiones en curso al reiniciar o
// desplegar en lugar de cortarlas a la mitad (RNF-04).
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido, cerrando servidor');
  servidor.close(() => process.exit(0));
});

module.exports = servidor;
