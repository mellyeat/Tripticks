'use strict';

const ROLES = Object.freeze({
  USUARIO: 'usuario',
  ADMINISTRADOR: 'administrador',
});

const ESTADOS_RESERVACION = Object.freeze({
  ACTIVA: 'activa',
  CANCELADA: 'cancelada',
  COMPLETADA: 'completada',
});

const METODOS_PAGO = Object.freeze({
  TARJETA: 'tarjeta',
  PAYPAL: 'paypal',
});

// Impuesto aplicado sobre el precio del viaje al reservar. Es un valor de
// dominio, no de entorno: cambiarlo cambia lo que se le cobra al viajero.
const TASA_IMPUESTO = 0.16;

// Codigos que levantan las funciones crear_reservacion y cancelar_reservacion
// en database/schema.sql. La traduccion a HTTP vive en reservation.model.js.
const ERRORES_RESERVACION = Object.freeze({
  VIAJE_NO_EXISTE: 'TT001',
  SIN_CUPOS: 'TT002',
  DUPLICADA: 'TT003',
  VIAJE_INACTIVO: 'TT004',
  VIAJE_YA_SALIO: 'TT005',
  NO_EXISTE: 'TT006',
  AJENA: 'TT007',
  NO_ACTIVA: 'TT008',
});

const ORDENES_VIAJE = Object.freeze({
  SALIDA: 'salida',
  PRECIO_ASC: 'precio_asc',
  PRECIO_DESC: 'precio_desc',
  DESTINO: 'destino',
});

const PAGINACION = Object.freeze({
  LIMITE_POR_DEFECTO: 9,
  LIMITE_MAXIMO: 50,
});

/* Cupos de peticiones por IP. El de acceso es agresivo a proposito: sin el,
   probar contrasenas contra /auth/login no tiene costo para quien lo intenta. */
const LIMITES_PETICIONES = Object.freeze({
  ACCESO: Object.freeze({ maximo: 10, ventanaMs: 10 * 60 * 1000 }),
  ESCRITURA: Object.freeze({ maximo: 60, ventanaMs: 10 * 60 * 1000 }),
  GENERAL: Object.freeze({ maximo: 300, ventanaMs: 10 * 60 * 1000 }),
});

const COOKIE_SESION = 'tripticks.token';

// Origenes de las imagenes de los viajes. Sin esto, la politica de contenido
// que aplica helmet (img-src 'self' data:) bloquea las fotografias del catalogo.
const ORIGENES_IMAGEN = Object.freeze([
  "'self'",
  'data:',
  'https://images.unsplash.com',
  'https://picsum.photos',
  'https://fastly.picsum.photos',
]);

const MENSAJES = Object.freeze({
  EMAIL_YA_REGISTRADO: 'El correo electronico ya esta registrado.',
  CREDENCIALES_INVALIDAS: 'Correo electronico o contrasena incorrectos.',
  CUENTA_DESACTIVADA: 'La cuenta esta desactivada. Contacta al administrador.',
  TOKEN_FALTANTE: 'Debes iniciar sesion para acceder a este recurso.',
  TOKEN_INVALIDO: 'La sesion no es valida. Inicia sesion nuevamente.',
  TOKEN_EXPIRADO: 'La sesion expiro. Inicia sesion nuevamente.',
  SIN_PERMISOS: 'No tienes permisos para realizar esta accion.',
  USUARIO_NO_ENCONTRADO: 'El usuario no existe.',
  VIAJE_NO_ENCONTRADO: 'El viaje no existe.',
  VIAJE_CON_RESERVACIONES:
    'No se puede eliminar un viaje con reservaciones asociadas. Desactivalo en su lugar.',
  FECHAS_INCOHERENTES: 'La fecha de regreso no puede ser anterior a la de salida.',
  FECHA_SALIDA_PASADA: 'La fecha de salida no puede estar en el pasado.',
  CUPOS_INCOHERENTES: 'Los cupos disponibles no pueden superar los cupos totales.',
  DATOS_INVALIDOS: 'Los datos enviados no son validos.',
  RUTA_NO_ENCONTRADA: 'El recurso solicitado no existe.',
  DEMASIADOS_INTENTOS: 'Demasiados intentos. Espera unos minutos antes de volver a probar.',
  DEMASIADAS_PETICIONES: 'Estas haciendo demasiadas peticiones. Intenta de nuevo mas tarde.',
  ERROR_INTERNO: 'Ocurrio un error interno del servidor.',
  RESERVACION_NO_ENCONTRADA: 'La reservacion no existe.',
  RESERVACION_AJENA: 'La reservacion no te pertenece.',
  RESERVACION_NO_ACTIVA: 'La reservacion ya no esta activa.',
  RESERVACION_DUPLICADA: 'Ya tienes una reservacion activa para este viaje.',
  VIAJE_SIN_CUPOS: 'El viaje ya no tiene cupos disponibles.',
  VIAJE_NO_DISPONIBLE: 'El viaje no esta disponible para reservar.',
  VIAJE_YA_SALIO: 'El viaje ya salio y no admite nuevas reservaciones.',
  ESTADO_NO_PERMITIDO: 'Solo puedes cancelar tus reservaciones.',
  ULTIMO_ADMINISTRADOR: 'No puedes quitar el ultimo administrador del sistema.',
  CUENTA_PROPIA: 'No puedes cambiar tu propio rol ni desactivar tu cuenta.',
});

const VISTAS = Object.freeze({
  ERROR: 'pages/error',
});

const TABLAS = Object.freeze({
  USUARIOS: 'usuarios',
  VIAJES: 'viajes',
  RESERVACIONES: 'reservaciones',
});

module.exports = {
  ROLES,
  ESTADOS_RESERVACION,
  METODOS_PAGO,
  TASA_IMPUESTO,
  ERRORES_RESERVACION,
  ORDENES_VIAJE,
  PAGINACION,
  LIMITES_PETICIONES,
  COOKIE_SESION,
  ORIGENES_IMAGEN,
  MENSAJES,
  VISTAS,
  TABLAS,
};
