'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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

// Lista separada por comas. Vacia significa "solo el mismo origen": la API y las
// vistas viajan juntas, asi que ningun navegador legitimo necesita CORS.
function lista(valor) {
  return String(valor || '')
    .split(',')
    .map((origen) => origen.trim())
    .filter((origen) => origen.length > 0);
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
  corsOrigenes: lista(process.env.CORS_ORIGINS),
  // Numero de proxies de confianza delante de la aplicacion. Sin esto, detras de
  // un balanceador todas las peticiones comparten la IP del proxy y el cupo de
  // peticiones se agotaria para todo el mundo a la vez.
  proxiesDeConfianza: entero(process.env.TRUST_PROXY, 0),
};
