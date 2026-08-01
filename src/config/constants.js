// Constantes compartidas: roles, estados de reservacion, mensajes
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

// Mensajes de error visibles al usuario (RF-20).
const MENSAJES = Object.freeze({
  EMAIL_YA_REGISTRADO: 'El correo electronico ya esta registrado.',
  CREDENCIALES_INVALIDAS: 'Correo electronico o contrasena incorrectos.',
  CUENTA_DESACTIVADA: 'La cuenta esta desactivada. Contacta al administrador.',
  TOKEN_FALTANTE: 'Debes iniciar sesion para acceder a este recurso.',
  TOKEN_INVALIDO: 'La sesion no es valida. Inicia sesion nuevamente.',
  TOKEN_EXPIRADO: 'La sesion expiro. Inicia sesion nuevamente.',
  SIN_PERMISOS: 'No tienes permisos para realizar esta accion.',
  USUARIO_NO_ENCONTRADO: 'El usuario no existe.',
  DATOS_INVALIDOS: 'Los datos enviados no son validos.',
  RUTA_NO_ENCONTRADA: 'El recurso solicitado no existe.',
  ERROR_INTERNO: 'Ocurrio un error interno del servidor.',
});

const TABLAS = Object.freeze({
  USUARIOS: 'usuarios',
  VIAJES: 'viajes',
  RESERVACIONES: 'reservaciones',
});

module.exports = { ROLES, ESTADOS_RESERVACION, MENSAJES, TABLAS };
