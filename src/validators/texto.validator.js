'use strict';


const MARCADO = /<[a-z!/?]/i;

const ESQUEMA_EJECUTABLE = /\b(?:javascript|vbscript)\s*:/i;

const MENSAJE = 'El texto no puede contener etiquetas HTML ni codigo ejecutable.';

function sinMarcado(valor) {
  const texto = String(valor);

  if (MARCADO.test(texto) || ESQUEMA_EJECUTABLE.test(texto)) {
    throw new Error(MENSAJE);
  }

  return true;
}

module.exports = { sinMarcado, MENSAJE };
