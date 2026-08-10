'use strict';

const dashboardService = require('../services/dashboard.service');
const asyncHandler = require('../utils/asyncHandler');
const { exito } = require('../utils/apiResponse');

const resumen = asyncHandler(async (req, res) => {
  const { totales, demanda, recientes } = await dashboardService.obtenerResumen();

  return exito(res, {
    mensaje: 'Estadisticas obtenidas.',
    datos: { totales, demanda, recientes },
  });
});

module.exports = { resumen };
