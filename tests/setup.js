// Entorno para las pruebas (RNF-18): se ejecuta antes de cargar cada suite.
'use strict';

process.env.NODE_ENV = 'test';

// Valores ficticios: las pruebas no tocan la base real, pero config/env.js
// aborta si faltan y no llegaria a correr nada.
process.env.SUPABASE_URL = 'https://pruebas.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'llave-de-pruebas';
process.env.JWT_SECRET = 'secreto-solo-para-pruebas-no-usar-en-produccion';
process.env.JWT_EXPIRES_IN = '1h';

// bcrypt es lento a proposito. Con 10 rondas cada hash tarda ~100 ms y la suite
// se acerca al timeout de Jest; 4 rondas conservan el comportamiento y son rapidas.
process.env.BCRYPT_SALT_ROUNDS = '4';
