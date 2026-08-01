// Lectura y validacion de variables de entorno (RNF-13, RNF-17)
'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Si falta una variable critica preferimos caer al arrancar y no a mitad de un
// request: un JWT_SECRET undefined haria que jsonwebtoken firme con "undefined".
const REQUERIDAS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];

function validar() {
  const faltantes = REQUERIDAS.filter((clave) => !process.env[clave]);

  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${faltantes.join(', ')}. ` +
        'Copia .env.example a .env y completa los valores.'
    );
  }
}

function entero(valor, porDefecto) {
  const n = Number.parseInt(valor, 10);
  return Number.isNaN(n) ? porDefecto : n;
}

validar();

module.exports = {
  puerto: entero(process.env.PORT, 3000),
  entorno: process.env.NODE_ENV || 'development',
  esProduccion: process.env.NODE_ENV === 'production',
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  jwt: {
    secreto: process.env.JWT_SECRET,
    expiracion: process.env.JWT_EXPIRES_IN || '2h',
  },
  bcrypt: {
    saltRounds: entero(process.env.BCRYPT_SALT_ROUNDS, 10),
  },
};
