'use strict';

const supabase = require('../config/supabase');
const ApiError = require('../utils/apiError');
const { TABLAS, MENSAJES, ORDENES_VIAJE } = require('../config/constants');

const CAMPOS_PUBLICOS =
  'id, titulo, destino, descripcion, itinerario, precio, fecha_salida, fecha_regreso, ' +
  'duracion_dias, cupos_totales, cupos_disponibles, imagen_url, activo, creado_en';

const CAMPOS_RESUMEN =
  'id, titulo, destino, precio, fecha_salida, fecha_regreso, duracion_dias, ' +
  'cupos_totales, cupos_disponibles, imagen_url, activo';

const COLUMNAS = Object.freeze({
  titulo: 'titulo',
  destino: 'destino',
  descripcion: 'descripcion',
  itinerario: 'itinerario',
  precio: 'precio',
  fechaSalida: 'fecha_salida',
  fechaRegreso: 'fecha_regreso',
  cuposTotales: 'cupos_totales',
  cuposDisponibles: 'cupos_disponibles',
  imagenUrl: 'imagen_url',
  activo: 'activo',
});

const COLUMNAS_ORDEN = Object.freeze({
  [ORDENES_VIAJE.SALIDA]: 'fecha_salida',
  [ORDENES_VIAJE.PRECIO_ASC]: 'precio',
  [ORDENES_VIAJE.PRECIO_DESC]: 'precio',
  [ORDENES_VIAJE.DESTINO]: 'destino',
});

const ORDENES_DESCENDENTES = [ORDENES_VIAJE.PRECIO_DESC];

function traducirError(error) {
  if (error.code === '23503') {
    return ApiError.conflicto(MENSAJES.VIAJE_CON_RESERVACIONES);
  }

  return ApiError.interno(`Error de base de datos: ${error.message}`);
}

function aColumnas(datos) {
  return Object.keys(COLUMNAS).reduce((fila, clave) => {
    if (datos[clave] !== undefined) {
      fila[COLUMNAS[clave]] = datos[clave];
    }

    return fila;
  }, {});
}

async function listar({ filtros, orden, pagina, limite }) {
  const desde = (pagina - 1) * limite;

  let consulta = supabase.from(TABLAS.VIAJES).select(CAMPOS_RESUMEN, { count: 'exact' });

  if (filtros.soloActivos) {
    consulta = consulta.eq('activo', true);
  }

  if (filtros.salidaDesde) {
    consulta = consulta.gte('fecha_salida', filtros.salidaDesde);
  }

  if (filtros.regresoHasta) {
    consulta = consulta.lte('fecha_regreso', filtros.regresoHasta);
  }

  if (filtros.destino) {
    consulta = consulta.ilike('destino', `%${filtros.destino}%`);
  }

  if (filtros.precioMax !== null) {
    consulta = consulta.lte('precio', filtros.precioMax);
  }

  if (filtros.soloDisponibles) {
    consulta = consulta.gt('cupos_disponibles', 0);
  }

  const { data, error, count } = await consulta
    .order(COLUMNAS_ORDEN[orden], { ascending: !ORDENES_DESCENDENTES.includes(orden) })
    .order('id', { ascending: true })
    .range(desde, desde + limite - 1);

  if (error) {
    throw traducirError(error);
  }

  return { viajes: data, total: count };
}

async function buscarPorId(id) {
  const { data, error } = await supabase
    .from(TABLAS.VIAJES)
    .select(CAMPOS_PUBLICOS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw traducirError(error);
  }

  return data;
}

async function crear(datos) {
  const { data, error } = await supabase
    .from(TABLAS.VIAJES)
    .insert(aColumnas(datos))
    .select(CAMPOS_PUBLICOS)
    .single();

  if (error) {
    throw traducirError(error);
  }

  return data;
}

async function actualizar(id, cambios) {
  const { data, error } = await supabase
    .from(TABLAS.VIAJES)
    .update(aColumnas(cambios))
    .eq('id', id)
    .select(CAMPOS_PUBLICOS)
    .maybeSingle();

  if (error) {
    throw traducirError(error);
  }

  return data;
}

async function eliminar(id) {
  const { data, error } = await supabase
    .from(TABLAS.VIAJES)
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    throw traducirError(error);
  }

  return data !== null;
}

module.exports = { listar, buscarPorId, crear, actualizar, eliminar, CAMPOS_PUBLICOS };
