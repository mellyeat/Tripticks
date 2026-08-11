'use strict';

const reservationModel = require('../models/reservation.model');
const ApiError = require('../utils/apiError');
const paginacion = require('../utils/paginacion.util');
const logger = require('../config/logger');
const {
  ROLES,
  ESTADOS_RESERVACION,
  METODOS_PAGO,
  TASA_IMPUESTO,
  MENSAJES,
} = require('../config/constants');

const ESTADOS_VALIDOS = Object.values(ESTADOS_RESERVACION);
const METODOS_VALIDOS = Object.values(METODOS_PAGO);

function esAdministrador(usuario) {
  return Boolean(usuario) && usuario.rol === ROLES.ADMINISTRADOR;
}

function valorDeLista(valor, permitidos) {
  return permitidos.includes(valor) ? valor : null;
}

async function obtenerDetalle(id, usuario) {
  const reservacion = await reservationModel.buscarPorId(id);

  if (!reservacion) {
    throw ApiError.noEncontrado(MENSAJES.RESERVACION_NO_ENCONTRADA);
  }

  if (!esAdministrador(usuario) && reservacion.usuario_id !== usuario.id) {
    throw ApiError.prohibido(MENSAJES.RESERVACION_AJENA);
  }

  return reservacion;
}

// Un usuario solo ve las suyas; el administrador ve todas y puede acotarlas por
// titular con el parametro usuario_id (RF-10 y RF-15).
async function listar({
  usuario,
  usuarioId,
  viajeId,
  estado,
  metodoPago,
  desde,
  hasta,
  pagina,
  limite,
} = {}) {
  const paginado = paginacion.normalizar({ pagina, limite });

  const { reservaciones, total } = await reservationModel.listar({
    filtros: {
      usuarioId: esAdministrador(usuario) ? usuarioId || null : usuario.id,
      viajeId: viajeId || null,
      estado: valorDeLista(estado, ESTADOS_VALIDOS),
      metodoPago: valorDeLista(metodoPago, METODOS_VALIDOS),
      desde: desde || null,
      hasta: hasta || null,
    },
    pagina: paginado.pagina,
    limite: paginado.limite,
  });

  return {
    reservaciones,
    paginacion: paginacion.resumen({ ...paginado, total }),
  };
}

async function crear({ usuario, viajeId, metodoPago }) {
  const nueva = await reservationModel.crear({
    usuarioId: usuario.id,
    viajeId,
    metodoPago: valorDeLista(metodoPago, METODOS_VALIDOS) || METODOS_PAGO.TARJETA,
    tasaImpuesto: TASA_IMPUESTO,
  });

  logger.info('Reservacion creada', {
    id: nueva.id,
    folio: nueva.folio,
    usuarioId: usuario.id,
    viajeId,
  });

  // La funcion de la base devuelve la fila cruda; se relee para responder con
  // el viaje anidado que la vista necesita.
  return reservationModel.buscarPorId(nueva.id);
}

async function cancelar(id, usuario) {
  await reservationModel.cancelar({
    id,
    usuarioId: usuario.id,
    esAdministrador: esAdministrador(usuario),
  });

  logger.info('Reservacion cancelada', { id, usuarioId: usuario.id });

  return reservationModel.buscarPorId(id);
}

// Cancelar libera un cupo, asi que pasa por la funcion transaccional. Los demas
// cambios de estado no lo tocan y son un update directo, reservado al
// administrador (RF-15).
async function cambiarEstado(id, estado, usuario) {
  if (!ESTADOS_VALIDOS.includes(estado)) {
    throw ApiError.solicitudInvalida(MENSAJES.DATOS_INVALIDOS);
  }

  if (estado === ESTADOS_RESERVACION.CANCELADA) {
    return cancelar(id, usuario);
  }

  if (!esAdministrador(usuario)) {
    throw ApiError.prohibido(MENSAJES.ESTADO_NO_PERMITIDO);
  }

  const actual = await obtenerDetalle(id, usuario);

  // Reactivar una cancelada exigiria volver a tomar un cupo que ya se libero.
  if (actual.estado === ESTADOS_RESERVACION.CANCELADA) {
    throw ApiError.conflicto(MENSAJES.RESERVACION_NO_ACTIVA);
  }

  const reservacion = await reservationModel.actualizarEstado(id, estado);

  if (!reservacion) {
    throw ApiError.noEncontrado(MENSAJES.RESERVACION_NO_ENCONTRADA);
  }

  logger.info('Estado de reservacion actualizado', { id, estado });

  return reservacion;
}

module.exports = { listar, obtenerDetalle, crear, cambiarEstado };
