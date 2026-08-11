'use strict';

const supabase = require('../config/supabase');
const paginacion = require('../utils/paginacion.util');
const { TABLAS, MENSAJES, ROLES } = require('../config/constants');
const ApiError = require('../utils/apiError');

const CAMPOS_PUBLICOS = 'id, nombre, email, rol, activo, creado_en';

const COLUMNAS = Object.freeze({
  nombre: 'nombre',
  email: 'email',
  rol: 'rol',
  activo: 'activo',
});

function traducirError(error) {
  if (error.code === '23505') {
    return ApiError.conflicto(MENSAJES.EMAIL_YA_REGISTRADO);
  }

  return ApiError.interno(`Error de base de datos: ${error.message}`);
}

async function buscarPorEmailConHash(email) {
  const { data, error } = await supabase
    .from(TABLAS.USUARIOS)
    .select(`${CAMPOS_PUBLICOS}, password_hash`)
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw traducirError(error);
  }

  return data;
}

async function existeEmail(email) {
  const { data, error } = await supabase
    .from(TABLAS.USUARIOS)
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw traducirError(error);
  }

  return data !== null;
}

async function buscarPorId(id) {
  const { data, error } = await supabase
    .from(TABLAS.USUARIOS)
    .select(CAMPOS_PUBLICOS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw traducirError(error);
  }

  return data;
}

async function crear({ nombre, email, passwordHash, rol }) {
  const { data, error } = await supabase
    .from(TABLAS.USUARIOS)
    .insert({ nombre, email, password_hash: passwordHash, rol })
    .select(CAMPOS_PUBLICOS)
    .single();

  if (error) {
    throw traducirError(error);
  }

  return data;
}

function aColumnas(datos) {
  return Object.keys(COLUMNAS).reduce((fila, clave) => {
    if (datos[clave] !== undefined) {
      fila[COLUMNAS[clave]] = datos[clave];
    }

    return fila;
  }, {});
}

async function listar({ filtros, pagina, limite }) {
  const { desde, hasta } = paginacion.rango({ pagina, limite });

  let consulta = supabase.from(TABLAS.USUARIOS).select(CAMPOS_PUBLICOS, { count: 'exact' });

  if (filtros.rol) {
    consulta = consulta.eq('rol', filtros.rol);
  }

  if (filtros.activo !== null) {
    consulta = consulta.eq('activo', filtros.activo);
  }

  if (filtros.busqueda) {
    consulta = consulta.or(`nombre.ilike.%${filtros.busqueda}%,email.ilike.%${filtros.busqueda}%`);
  }

  const { data, error, count } = await consulta
    .order('creado_en', { ascending: false })
    .order('id', { ascending: true })
    .range(desde, hasta);

  if (error) {
    throw traducirError(error);
  }

  return { usuarios: data, total: count };
}

async function actualizar(id, cambios) {
  const { data, error } = await supabase
    .from(TABLAS.USUARIOS)
    .update(aColumnas(cambios))
    .eq('id', id)
    .select(CAMPOS_PUBLICOS)
    .maybeSingle();

  if (error) {
    throw traducirError(error);
  }

  return data;
}

async function contarAdministradoresActivos() {
  const { count, error } = await supabase
    .from(TABLAS.USUARIOS)
    .select('id', { count: 'exact', head: true })
    .eq('rol', ROLES.ADMINISTRADOR)
    .eq('activo', true);

  if (error) {
    throw traducirError(error);
  }

  return count || 0;
}

module.exports = {
  buscarPorEmailConHash,
  buscarPorId,
  existeEmail,
  crear,
  listar,
  actualizar,
  contarAdministradoresActivos,
  CAMPOS_PUBLICOS,
};
