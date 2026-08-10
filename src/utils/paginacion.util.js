'use strict';

const { PAGINACION } = require('../config/constants');

function entero(valor, porDefecto) {
  const numero = Number.parseInt(valor, 10);

  return Number.isNaN(numero) || numero < 1 ? porDefecto : numero;
}

function normalizar({ pagina, limite } = {}) {
  return {
    pagina: entero(pagina, 1),
    limite: Math.min(entero(limite, PAGINACION.LIMITE_POR_DEFECTO), PAGINACION.LIMITE_MAXIMO),
  };
}

// El rango que espera Supabase es inclusivo en ambos extremos.
function rango({ pagina, limite }) {
  const desde = (pagina - 1) * limite;

  return { desde, hasta: desde + limite - 1 };
}

function resumen({ pagina, limite, total }) {
  const cuantos = total || 0;

  return {
    pagina,
    limite,
    total: cuantos,
    paginas: Math.max(1, Math.ceil(cuantos / limite)),
  };
}

module.exports = { normalizar, rango, resumen };
