'use strict';

const userModel = require('../models/user.model');
const password = require('../utils/password.util');
const ApiError = require('../utils/apiError');
const paginacion = require('../utils/paginacion.util');
const logger = require('../config/logger');
const { ROLES, MENSAJES } = require('../config/constants');

const ROLES_VALIDOS = Object.values(ROLES);

function normalizarEmail(email) {
  return String(email).trim().toLowerCase();
}

/* El texto entra en un filtro "or" de PostgREST, que es una cadena con sintaxis
   propia: la coma separa condiciones, los parentesis agrupan y las comillas
   delimitan valores. Se usa lista blanca y no lista negra: enumerar lo que se
   permite deja fuera cualquier metacaracter que no se haya previsto, mientras
   que enumerar lo prohibido solo protege de lo que ya se conocia.
   Se conservan letras (con acentos), digitos, espacio, guion, punto y arroba,
   que es lo que puede aparecer en un nombre o en un correo. */
const PERMITIDO_EN_BUSQUEDA = /[^\p{L}\p{N} .@-]/gu;

function normalizarBusqueda(texto) {
  if (texto === undefined || texto === null) {
    return null;
  }

  const limpio = String(texto).trim().replace(PERMITIDO_EN_BUSQUEDA, '');

  return limpio.length > 0 ? limpio : null;
}

function booleanoONulo(valor) {
  if (valor === 'true' || valor === true) {
    return true;
  }

  if (valor === 'false' || valor === false) {
    return false;
  }

  return null;
}

async function obtenerDetalle(id) {
  const usuario = await userModel.buscarPorId(id);

  if (!usuario) {
    throw ApiError.noEncontrado(MENSAJES.USUARIO_NO_ENCONTRADO);
  }

  return usuario;
}

// Quitar al ultimo administrador activo dejaria el sistema sin nadie capaz de
// administrarlo, y no habria forma de recuperarlo desde la propia aplicacion.
async function protegerUltimoAdministrador(usuario) {
  if (usuario.rol !== ROLES.ADMINISTRADOR || !usuario.activo) {
    return;
  }

  const activos = await userModel.contarAdministradoresActivos();

  if (activos <= 1) {
    throw ApiError.conflicto(MENSAJES.ULTIMO_ADMINISTRADOR);
  }
}

async function listar({ rol, activo, busqueda, pagina, limite } = {}) {
  const paginado = paginacion.normalizar({ pagina, limite });

  const { usuarios, total } = await userModel.listar({
    filtros: {
      rol: ROLES_VALIDOS.includes(rol) ? rol : null,
      activo: booleanoONulo(activo),
      busqueda: normalizarBusqueda(busqueda),
    },
    pagina: paginado.pagina,
    limite: paginado.limite,
  });

  return {
    usuarios,
    paginacion: paginacion.resumen({ ...paginado, total }),
  };
}

async function crear({ nombre, email, password: passwordPlano, rol, activo }) {
  const emailNormalizado = normalizarEmail(email);

  if (await userModel.existeEmail(emailNormalizado)) {
    throw ApiError.conflicto(MENSAJES.EMAIL_YA_REGISTRADO);
  }

  const usuario = await userModel.crear({
    nombre: String(nombre).trim(),
    email: emailNormalizado,
    passwordHash: await password.hashear(passwordPlano),
    rol: ROLES_VALIDOS.includes(rol) ? rol : ROLES.USUARIO,
  });

  logger.info('Usuario creado por un administrador', { id: usuario.id, rol: usuario.rol });

  if (activo === false) {
    return userModel.actualizar(usuario.id, { activo: false });
  }

  return usuario;
}

async function actualizar(id, datos, solicitante) {
  const actual = await obtenerDetalle(id);
  const cambios = {};

  if (datos.nombre !== undefined) {
    cambios.nombre = String(datos.nombre).trim();
  }

  if (datos.email !== undefined) {
    const emailNormalizado = normalizarEmail(datos.email);

    if (emailNormalizado !== actual.email && (await userModel.existeEmail(emailNormalizado))) {
      throw ApiError.conflicto(MENSAJES.EMAIL_YA_REGISTRADO);
    }

    cambios.email = emailNormalizado;
  }

  if (datos.rol !== undefined && datos.rol !== actual.rol) {
    cambios.rol = datos.rol;
  }

  if (datos.activo !== undefined && datos.activo !== actual.activo) {
    cambios.activo = datos.activo;
  }

  if (Object.keys(cambios).length === 0) {
    throw ApiError.solicitudInvalida(MENSAJES.DATOS_INVALIDOS);
  }

  const pierdePermisos = cambios.rol === ROLES.USUARIO || cambios.activo === false;

  if (pierdePermisos) {
    if (actual.id === solicitante.id) {
      throw ApiError.conflicto(MENSAJES.CUENTA_PROPIA);
    }

    await protegerUltimoAdministrador(actual);
  }

  const usuario = await userModel.actualizar(id, cambios);

  if (!usuario) {
    throw ApiError.noEncontrado(MENSAJES.USUARIO_NO_ENCONTRADO);
  }

  logger.info('Usuario actualizado', { id: usuario.id, campos: Object.keys(cambios) });

  return usuario;
}

// RF-14: la baja es logica. Borrar la fila arrastraria en cascada todas las
// reservaciones del usuario y con ellas el historial del negocio.
async function desactivar(id, solicitante) {
  const actual = await obtenerDetalle(id);

  if (actual.id === solicitante.id) {
    throw ApiError.conflicto(MENSAJES.CUENTA_PROPIA);
  }

  if (!actual.activo) {
    return actual;
  }

  await protegerUltimoAdministrador(actual);

  const usuario = await userModel.actualizar(id, { activo: false });

  logger.info('Usuario desactivado', { id, por: solicitante.id });

  return usuario;
}

module.exports = { listar, obtenerDetalle, crear, actualizar, desactivar };
