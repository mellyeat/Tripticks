'use strict';

const reservationService = require('../services/reservation.service');
const asyncHandler = require('../utils/asyncHandler');
const { exito } = require('../utils/apiResponse');

const listar = asyncHandler(async (req, res) => {
  const { reservaciones, paginacion } = await reservationService.listar({
    usuario: req.usuario,
    usuarioId: req.query.usuario_id,
    viajeId: req.query.viaje_id,
    estado: req.query.estado,
    metodoPago: req.query.metodo_pago,
    desde: req.query.desde,
    hasta: req.query.hasta,
    pagina: req.query.pagina,
    limite: req.query.limite,
  });

  return exito(res, {
    mensaje: 'Reservaciones obtenidas.',
    datos: { reservaciones, paginacion },
  });
});

const detalle = asyncHandler(async (req, res) => {
  const reservacion = await reservationService.obtenerDetalle(req.params.id, req.usuario);

  return exito(res, { mensaje: 'Reservacion obtenida.', datos: { reservacion } });
});

const crear = asyncHandler(async (req, res) => {
  const reservacion = await reservationService.crear({
    usuario: req.usuario,
    viajeId: req.body.viaje_id,
    metodoPago: req.body.metodo_pago,
  });

  return exito(res, {
    estado: 201,
    mensaje: 'Reservacion confirmada correctamente.',
    datos: { reservacion },
  });
});

const cambiarEstado = asyncHandler(async (req, res) => {
  const reservacion = await reservationService.cambiarEstado(
    req.params.id,
    req.body.estado,
    req.usuario
  );

  return exito(res, {
    mensaje: 'Estado de la reservacion actualizado.',
    datos: { reservacion },
  });
});

module.exports = { listar, detalle, crear, cambiarEstado };
