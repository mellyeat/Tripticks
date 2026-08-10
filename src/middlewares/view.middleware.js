'use strict';

const ApiError = require('../utils/apiError');
const { ROLES, MENSAJES } = require('../config/constants');

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function iniciales(nombre) {
  return String(nombre || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');
}

/* Mismo formato que public/js/formato.js, para que lo que pinta el servidor y
   lo que pinta el navegador se lean igual. Las columnas date llegan como
   "AAAA-MM-DD" y se parten a mano: new Date(texto) las lee en UTC y al oeste de
   Greenwich la fecha mostrada se corre un dia. */
function partes(iso) {
  const trozos = String(iso || '').slice(0, 10).split('-');

  return trozos.length === 3 ? trozos.map(Number) : null;
}

function fecha(iso) {
  const valor = partes(iso);

  return valor ? `${valor[2]} ${MESES[valor[1] - 1]} ${valor[0]}` : '';
}

function rangoFechas(salida, regreso) {
  const desde = partes(salida);
  const hasta = partes(regreso);

  if (!desde || !hasta) {
    return fecha(salida) || fecha(regreso);
  }

  if (desde[0] === hasta[0] && desde[1] === hasta[1]) {
    return `${desde[2]} - ${hasta[2]} ${MESES[hasta[1] - 1]} ${hasta[0]}`;
  }

  return `${fecha(salida)} - ${fecha(regreso)}`;
}

function moneda(valor) {
  const numero = Number(valor);

  return Number.isFinite(numero) ? `$${Math.round(numero).toLocaleString('en-US')}` : '';
}

// Las plantillas leen siempre estos locales, tanto con sesion como sin ella.
function exponerUsuario(req, res, next) {
  res.locals.usuario = req.usuario || null;
  res.locals.iniciales = req.usuario ? iniciales(req.usuario.nombre) : '';
  res.locals.filtros = req.query || {};
  res.locals.formato = { fecha, rangoFechas, moneda };

  return next();
}

// A diferencia de la API, una vista no responde 401: lleva al formulario de
// acceso y vuelve al destino original una vez iniciada la sesion.
function requiereSesionWeb(req, res, next) {
  if (!req.usuario) {
    const destino = encodeURIComponent(req.originalUrl);
    return res.redirect(`/login?requerida=1&destino=${destino}`);
  }

  return next();
}

function requiereAdministradorWeb(req, res, next) {
  if (!req.usuario) {
    const destino = encodeURIComponent(req.originalUrl);
    return res.redirect(`/login?requerida=1&destino=${destino}`);
  }

  if (req.usuario.rol !== ROLES.ADMINISTRADOR) {
    return next(ApiError.prohibido(MENSAJES.SIN_PERMISOS));
  }

  return next();
}

function soloInvitados(req, res, next) {
  if (req.usuario) {
    return res.redirect('/');
  }

  return next();
}

module.exports = {
  exponerUsuario,
  requiereSesionWeb,
  requiereAdministradorWeb,
  soloInvitados,
};
