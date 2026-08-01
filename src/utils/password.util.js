// Hash y verificacion de contrasenas con bcrypt (RNF-02)
'use strict';

const bcrypt = require('bcrypt');
const { bcrypt: config } = require('../config/env');

/**
 * @param {string} plana Contrasena en texto claro.
 * @returns {Promise<string>} Hash con salt incluido.
 */
async function hashear(plana) {
  return bcrypt.hash(plana, config.saltRounds);
}

/**
 * @param {string} plana Contrasena capturada en el formulario.
 * @param {string} hash Hash almacenado en la base de datos.
 * @returns {Promise<boolean>}
 */
async function verificar(plana, hash) {
  // bcrypt.compare rechaza si el hash es null o malformado; un usuario sin hash
  // valido no debe tumbar el login, solo fallar la comparacion.
  if (!plana || !hash) {
    return false;
  }

  return bcrypt.compare(plana, hash);
}

module.exports = { hashear, verificar };
