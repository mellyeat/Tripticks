'use strict';

const dashboardModel = require('../models/dashboard.model');
const reservationModel = require('../models/reservation.model');

const LIMITE_DEMANDA = 5;
const LIMITE_RECIENTES = 5;

function aNumero(valor) {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : 0;
}

// Las dos consultas son independientes, asi que se lanzan en paralelo para no
// sumar sus tiempos de espera (RNF-01).
async function obtenerResumen() {
  const [estadisticas, recientes] = await Promise.all([
    dashboardModel.obtenerEstadisticas(LIMITE_DEMANDA),
    reservationModel.listar({ filtros: {}, pagina: 1, limite: LIMITE_RECIENTES }),
  ]);

  return {
    totales: {
      usuarios: aNumero(estadisticas.usuarios),
      usuariosActivos: aNumero(estadisticas.usuarios_activos),
      administradores: aNumero(estadisticas.administradores),
      viajes: aNumero(estadisticas.viajes),
      viajesActivos: aNumero(estadisticas.viajes_activos),
      reservaciones: aNumero(estadisticas.reservaciones),
      reservacionesActivas: aNumero(estadisticas.reservaciones_activas),
      ingresos: aNumero(estadisticas.ingresos),
    },
    demanda: (estadisticas.demanda || []).map((viaje) => ({
      ...viaje,
      reservaciones: aNumero(viaje.reservaciones),
    })),
    recientes: recientes.reservaciones,
  };
}

module.exports = { obtenerResumen };
