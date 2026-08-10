'use strict';

const supabase = require('../config/supabase');
const ApiError = require('../utils/apiError');
const paginacion = require('../utils/paginacion.util');
const { TABLAS, MENSAJES, ERRORES_RESERVACION } = require('../config/constants');

const CAMPOS_PROPIOS =
  'id, folio, usuario_id, viaje_id, estado, precio_unitario, impuestos, total, ' +
  'metodo_pago, creado_en, cancelado_en';

// La vista de reservaciones necesita el viaje para pintar la tarjeta y la de
// administracion necesita ademas al titular; se piden anidados para no hacer
// una consulta extra por fila.
const CAMPOS_CON_VIAJE =
  `${CAMPOS_PROPIOS}, ` +
  'viaje:viajes(id, titulo, destino, imagen_url, fecha_salida, fecha_regreso, duracion_dias)';

const CAMPOS_COMPLETOS = `${CAMPOS_CON_VIAJE}, usuario:usuarios(id, nombre, email)`;

// Las funciones del esquema marcan los conflictos de negocio con codigos
// propios (TT00x); aqui se traducen al codigo HTTP que les corresponde.
const POR_CODIGO = Object.freeze({
  [ERRORES_RESERVACION.VIAJE_NO_EXISTE]: () => ApiError.noEncontrado(MENSAJES.VIAJE_NO_ENCONTRADO),
  [ERRORES_RESERVACION.SIN_CUPOS]: () => ApiError.conflicto(MENSAJES.VIAJE_SIN_CUPOS),
  [ERRORES_RESERVACION.DUPLICADA]: () => ApiError.conflicto(MENSAJES.RESERVACION_DUPLICADA),
  [ERRORES_RESERVACION.VIAJE_INACTIVO]: () => ApiError.conflicto(MENSAJES.VIAJE_NO_DISPONIBLE),
  [ERRORES_RESERVACION.VIAJE_YA_SALIO]: () => ApiError.conflicto(MENSAJES.VIAJE_YA_SALIO),
  [ERRORES_RESERVACION.NO_EXISTE]: () => ApiError.noEncontrado(MENSAJES.RESERVACION_NO_ENCONTRADA),
  [ERRORES_RESERVACION.AJENA]: () => ApiError.prohibido(MENSAJES.RESERVACION_AJENA),
  [ERRORES_RESERVACION.NO_ACTIVA]: () => ApiError.conflicto(MENSAJES.RESERVACION_NO_ACTIVA),
});

function traducirError(error) {
  const fabrica = POR_CODIGO[error.code];

  if (fabrica) {
    return fabrica();
  }

  return ApiError.interno(`Error de base de datos: ${error.message}`);
}

async function listar({ filtros, pagina, limite }) {
  const { desde, hasta } = paginacion.rango({ pagina, limite });

  let consulta = supabase.from(TABLAS.RESERVACIONES).select(CAMPOS_COMPLETOS, { count: 'exact' });

  if (filtros.usuarioId) {
    consulta = consulta.eq('usuario_id', filtros.usuarioId);
  }

  if (filtros.viajeId) {
    consulta = consulta.eq('viaje_id', filtros.viajeId);
  }

  if (filtros.estado) {
    consulta = consulta.eq('estado', filtros.estado);
  }

  if (filtros.metodoPago) {
    consulta = consulta.eq('metodo_pago', filtros.metodoPago);
  }

  if (filtros.desde) {
    consulta = consulta.gte('creado_en', filtros.desde);
  }

  if (filtros.hasta) {
    consulta = consulta.lte('creado_en', filtros.hasta);
  }

  const { data, error, count } = await consulta
    .order('creado_en', { ascending: false })
    .order('id', { ascending: true })
    .range(desde, hasta);

  if (error) {
    throw traducirError(error);
  }

  return { reservaciones: data, total: count };
}

async function buscarPorId(id) {
  const { data, error } = await supabase
    .from(TABLAS.RESERVACIONES)
    .select(CAMPOS_COMPLETOS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw traducirError(error);
  }

  return data;
}

async function contarDeUsuario(usuarioId) {
  const { count, error } = await supabase
    .from(TABLAS.RESERVACIONES)
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', usuarioId);

  if (error) {
    throw traducirError(error);
  }

  return count || 0;
}

// El alta y el descuento de cupos ocurren dentro de una sola transaccion en la
// base (ver crear_reservacion en database/schema.sql): supabase-js no abre
// transacciones y validar el cupo desde aqui dejaria pasar dos reservaciones
// simultaneas sobre el ultimo lugar.
async function crear({ usuarioId, viajeId, metodoPago, tasaImpuesto }) {
  const { data, error } = await supabase.rpc('crear_reservacion', {
    p_usuario_id: usuarioId,
    p_viaje_id: viajeId,
    p_metodo_pago: metodoPago,
    p_tasa_impuesto: tasaImpuesto,
  });

  if (error) {
    throw traducirError(error);
  }

  return data;
}

async function cancelar({ id, usuarioId, esAdministrador }) {
  const { data, error } = await supabase.rpc('cancelar_reservacion', {
    p_reservacion_id: id,
    p_usuario_id: usuarioId,
    p_es_administrador: esAdministrador,
  });

  if (error) {
    throw traducirError(error);
  }

  return data;
}

async function actualizarEstado(id, estado) {
  const { data, error } = await supabase
    .from(TABLAS.RESERVACIONES)
    .update({ estado })
    .eq('id', id)
    .select(CAMPOS_COMPLETOS)
    .maybeSingle();

  if (error) {
    throw traducirError(error);
  }

  return data;
}

module.exports = {
  listar,
  buscarPorId,
  contarDeUsuario,
  crear,
  cancelar,
  actualizarEstado,
};
