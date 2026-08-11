'use strict';

const bcrypt = require('bcrypt');
const { bcrypt: config } = require('../config/env');

async function hashear(plana) {
  return bcrypt.hash(plana, config.saltRounds);
}

async function verificar(plana, hash) {
  if (!plana || !hash) {
    return false;
  }

  return bcrypt.compare(plana, hash);
}

/* Comparacion contra un hash de descarte, para cuando el correo no existe.
   Sin esto, esa respuesta vuelve de inmediato y la del correo correcto tarda lo
   que tarda bcrypt: la diferencia de tiempo revela que cuentas existen, que es
   justo lo que el mensaje unico de error trata de ocultar.

   El hash se calcula una sola vez y con las mismas rondas configuradas, para
   que el trabajo sea el mismo por ambos caminos. */
let hashDeDescarte = null;

async function verificarInexistente(plana) {
  if (!hashDeDescarte) {
    hashDeDescarte = await hashear(`descarte:${Date.now()}:${Math.random()}`);
  }

  return bcrypt.compare(String(plana || ''), hashDeDescarte);
}

module.exports = { hashear, verificar, verificarInexistente };
