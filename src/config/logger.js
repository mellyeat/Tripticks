// Configuracion del registro de eventos y errores (RNF-15)
'use strict';

const fs = require('fs');
const path = require('path');
const { entorno } = require('./env');

const DIRECTORIO_LOGS = path.resolve(__dirname, '../../logs');

if (!fs.existsSync(DIRECTORIO_LOGS)) {
  fs.mkdirSync(DIRECTORIO_LOGS, { recursive: true });
}

// Append en modo flujo: evita abrir y cerrar el archivo en cada linea.
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

  // En pruebas el ruido de consola estorba; el archivo sigue recibiendo todo.
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
  // Consumido por morgan como destino de escritura (RNF-15).
  flujoHttp: {
    write(mensaje) {
      escribir(flujoApp, 'http', mensaje.trim());
    },
  },
};
