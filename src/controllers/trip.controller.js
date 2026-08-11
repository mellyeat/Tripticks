'use strict';

const tripService = require('../services/trip.service');
const asyncHandler = require('../utils/asyncHandler');
const { exito } = require('../utils/apiResponse');
const { ROLES } = require('../config/constants');

function esVerdadero(valor) {
  return valor === '1' || valor === 'true';
}

function aDatosDeViaje(cuerpo) {
  return {
    titulo: cuerpo.titulo,
    destino: cuerpo.destino,
    descripcion: cuerpo.descripcion,
    itinerario: cuerpo.itinerario,
    precio: cuerpo.precio,
    fechaSalida: cuerpo.fecha_salida,
    fechaRegreso: cuerpo.fecha_regreso,
    cuposTotales: cuerpo.cupos_totales,
    cuposDisponibles: cuerpo.cupos_disponibles,
    imagenUrl: cuerpo.imagen_url,
    activo: cuerpo.activo,
  };
}

const listar = asyncHandler(async (req, res) => {
  const { viajes, paginacion } = await tripService.listarCatalogo({
    destino: req.query.destino,
    precioMax: req.query.precio_max,
    salida: req.query.salida,
    regreso: req.query.regreso,
    soloDisponibles: esVerdadero(req.query.disponibles),
    incluirInactivos: esVerdadero(req.query.incluir_inactivos),
    esAdministrador: Boolean(req.usuario) && req.usuario.rol === ROLES.ADMINISTRADOR,
    orden: req.query.orden,
    pagina: req.query.pagina,
    limite: req.query.limite,
  });

  return exito(res, { mensaje: 'Viajes obtenidos.', datos: { viajes, paginacion } });
});

const detalle = asyncHandler(async (req, res) => {
  const viaje = await tripService.obtenerDetalle(req.params.id);

  return exito(res, { mensaje: 'Viaje obtenido.', datos: { viaje } });
});

const crear = asyncHandler(async (req, res) => {
  const viaje = await tripService.crear(aDatosDeViaje(req.body));

  return exito(res, {
    estado: 201,
    mensaje: 'Viaje creado correctamente.',
    datos: { viaje },
  });
});

const actualizar = asyncHandler(async (req, res) => {
  const viaje = await tripService.actualizar(req.params.id, aDatosDeViaje(req.body));

  return exito(res, { mensaje: 'Viaje actualizado correctamente.', datos: { viaje } });
});

const eliminar = asyncHandler(async (req, res) => {
  await tripService.eliminar(req.params.id);

  return exito(res, { mensaje: 'Viaje eliminado correctamente.' });
});

module.exports = { listar, detalle, crear, actualizar, eliminar };
