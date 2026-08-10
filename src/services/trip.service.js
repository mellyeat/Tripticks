'use strict';

const tripModel = require('../models/trip.model');
const ApiError = require('../utils/apiError');
const paginacion = require('../utils/paginacion.util');
const logger = require('../config/logger');
const { MENSAJES, ORDENES_VIAJE } = require('../config/constants');

const ORDENES_VALIDOS = Object.values(ORDENES_VIAJE);

/* El itinerario se guarda como jsonb, que acepta cualquier forma. Se reconstruye
   dia por dia con solo las tres claves previstas: sin esto, todo lo que venga en
   el cuerpo de la peticion queda almacenado tal cual, incluidas claves que nadie
   valido y que despues alguna vista podria leer. */
function normalizarItinerario(valor) {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.map((dia, indice) => ({
    dia: Number.parseInt(dia && dia.dia, 10) || indice + 1,
    titulo: String((dia && dia.titulo) || '').trim(),
    descripcion: String((dia && dia.descripcion) || '').trim(),
  }));
}

const NORMALIZADORES = Object.freeze({
  titulo: (valor) => String(valor).trim(),
  destino: (valor) => String(valor).trim(),
  descripcion: (valor) => String(valor).trim(),
  imagenUrl: (valor) => String(valor).trim(),
  itinerario: normalizarItinerario,
  precio: Number,
  fechaSalida: String,
  fechaRegreso: String,
  cuposTotales: Number,
  cuposDisponibles: Number,
  activo: Boolean,
});

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

/* Los comodines de LIKE se quitan para que quien busca no pueda ampliar el
   criterio escribiendo "%" y traerse el catalogo completo.
   Aqui basta con eso, a diferencia de la busqueda de usuarios: este texto viaja
   como valor de un filtro ilike, que supabase-js codifica aparte, mientras que
   alla se arma a mano la cadena de un filtro "or" de PostgREST. Por eso la coma
   se conserva: destinos como "Dolomitas, Italia" son criterios legitimos. */
function normalizarBusqueda(destino) {
  if (destino === undefined || destino === null) {
    return null;
  }

  const limpio = String(destino).trim().replace(/[%_]/g, '');

  return limpio.length > 0 ? limpio : null;
}

function numeroONulo(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return null;
  }

  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : null;
}

function fechaMayor(primera, segunda) {
  if (!segunda) {
    return primera;
  }

  return segunda > primera ? segunda : primera;
}

function normalizarCampos(datos) {
  return Object.keys(NORMALIZADORES).reduce((limpios, clave) => {
    if (datos[clave] !== undefined) {
      limpios[clave] = NORMALIZADORES[clave](datos[clave]);
    }

    return limpios;
  }, {});
}

function validarCoherencia({ fechaSalida, fechaRegreso, cuposTotales, cuposDisponibles }) {
  if (fechaRegreso < fechaSalida) {
    throw ApiError.solicitudInvalida(MENSAJES.FECHAS_INCOHERENTES);
  }

  if (cuposDisponibles > cuposTotales) {
    throw ApiError.solicitudInvalida(MENSAJES.CUPOS_INCOHERENTES);
  }
}

async function listarCatalogo({
  destino,
  precioMax,
  salida,
  regreso,
  soloDisponibles,
  incluirInactivos,
  esAdministrador,
  orden,
  pagina,
  limite,
} = {}) {
  const verTodo = Boolean(esAdministrador && incluirInactivos);
  const paginado = paginacion.normalizar({ pagina, limite });

  const { viajes, total } = await tripModel.listar({
    filtros: {
      destino: normalizarBusqueda(destino),
      precioMax: numeroONulo(precioMax),
      salidaDesde: verTodo ? salida || null : fechaMayor(hoyISO(), salida),
      regresoHasta: regreso || null,
      soloDisponibles: Boolean(soloDisponibles),
      soloActivos: !verTodo,
    },
    orden: ORDENES_VALIDOS.includes(orden) ? orden : ORDENES_VIAJE.SALIDA,
    pagina: paginado.pagina,
    limite: paginado.limite,
  });

  return {
    viajes,
    paginacion: paginacion.resumen({ ...paginado, total }),
  };
}

async function obtenerDetalle(id) {
  const viaje = await tripModel.buscarPorId(id);

  if (!viaje) {
    throw ApiError.noEncontrado(MENSAJES.VIAJE_NO_ENCONTRADO);
  }

  return viaje;
}

async function crear(datos) {
  const nuevo = normalizarCampos(datos);

  if (nuevo.itinerario === undefined) {
    nuevo.itinerario = [];
  }

  if (nuevo.cuposDisponibles === undefined) {
    nuevo.cuposDisponibles = nuevo.cuposTotales;
  }

  if (nuevo.activo === undefined) {
    nuevo.activo = true;
  }

  if (nuevo.fechaSalida < hoyISO()) {
    throw ApiError.solicitudInvalida(MENSAJES.FECHA_SALIDA_PASADA);
  }

  validarCoherencia(nuevo);

  const viaje = await tripModel.crear(nuevo);

  logger.info('Viaje creado', { id: viaje.id, destino: viaje.destino });

  return viaje;
}

async function actualizar(id, datos) {
  const actual = await obtenerDetalle(id);
  const cambios = normalizarCampos(datos);

  if (Object.keys(cambios).length === 0) {
    throw ApiError.solicitudInvalida(MENSAJES.DATOS_INVALIDOS);
  }

  if (cambios.fechaSalida !== undefined && cambios.fechaSalida < hoyISO()) {
    throw ApiError.solicitudInvalida(MENSAJES.FECHA_SALIDA_PASADA);
  }

  validarCoherencia({
    fechaSalida: cambios.fechaSalida ?? actual.fecha_salida,
    fechaRegreso: cambios.fechaRegreso ?? actual.fecha_regreso,
    cuposTotales: cambios.cuposTotales ?? actual.cupos_totales,
    cuposDisponibles: cambios.cuposDisponibles ?? actual.cupos_disponibles,
  });

  const viaje = await tripModel.actualizar(id, cambios);

  if (!viaje) {
    throw ApiError.noEncontrado(MENSAJES.VIAJE_NO_ENCONTRADO);
  }

  logger.info('Viaje actualizado', { id: viaje.id, campos: Object.keys(cambios) });

  return viaje;
}

async function eliminar(id) {
  const eliminado = await tripModel.eliminar(id);

  if (!eliminado) {
    throw ApiError.noEncontrado(MENSAJES.VIAJE_NO_ENCONTRADO);
  }

  logger.info('Viaje eliminado', { id });
}

module.exports = { listarCatalogo, obtenerDetalle, crear, actualizar, eliminar };
