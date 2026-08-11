'use strict';

process.env.NODE_ENV = 'test';

process.env.SUPABASE_URL = 'https://pruebas.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'llave-de-pruebas';
process.env.JWT_SECRET = 'secreto-solo-para-pruebas-no-usar-en-produccion';
process.env.JWT_EXPIRES_IN = '1h';

process.env.BCRYPT_SALT_ROUNDS = '4';
