'use strict';

const supabase = require('../config/supabase');
const ApiError = require('../utils/apiError');

function traducirError(error) {
  return ApiError.interno(`Error de base de datos: ${error.message}`);
}

async function obtenerEstadisticas(limiteDemanda) {
  const { data, error } = await supabase.rpc('estadisticas_dashboard', {
    p_limite_demanda: limiteDemanda,
  });

  if (error) {
    throw traducirError(error);
  }

  return data;
}

module.exports = { obtenerEstadisticas };
