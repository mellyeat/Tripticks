'use strict';

const fs = require('fs');
const path = require('path');
const { entorno } = require('./env');

const DIRECTORIO_LOGS = path.resolve(__dirname, '../../logs');

if (!fs.existsSync(DIRECTORIO_LOGS)) {
  fs.mkdirSync(DIRECTORIO_LOGS, { recursive: true });
}

const flujoApp = fs.createWriteStream(path.join(DIRECTORIO_LOGS, 'app.log'), { flags: 'a' });
const flujoErrores = fs.createWriteStream(path.join(DIRECTORIO_LOGS, 'error.log'), { flags: 'a' });

function formatear(nivel, mensaje, meta) {
  const linea = {
    fecha: new Date().toISOString(),
    nivel,
    mensaje,
    ...(meta ? { meta } : {}),
  };
  return `${JSON.stringify(linea)}\n`;
}

function escribir(flujo, nivel, mensaje, meta) {
  const linea = formatear(nivel, mensaje, meta);
  flujo.write(linea);

  if (entorno !== 'test') {
    process.stdout.write(linea);
  }
}

module.exports = {
  info(mensaje, meta) {
    escribir(flujoApp, 'info', mensaje, meta);
  },
  advertencia(mensaje, meta) {
    escribir(flujoApp, 'warn', mensaje, meta);
  },
  error(mensaje, meta) {
    escribir(flujoErrores, 'error', mensaje, meta);
  },
  flujoHttp: {
    write(mensaje) {
      escribir(flujoApp, 'http', mensaje.trim());
    },
  },
};
