'use strict';

class ApiError extends Error {
  constructor(estado, mensaje, detalles = []) {
    super(mensaje);
    this.name = 'ApiError';
    this.estado = estado;
    this.detalles = detalles;
    this.esOperacional = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static solicitudInvalida(mensaje, detalles) {
    return new ApiError(400, mensaje, detalles);
  }

  static noAutenticado(mensaje) {
    return new ApiError(401, mensaje);
  }

  static prohibido(mensaje) {
    return new ApiError(403, mensaje);
  }

  static noEncontrado(mensaje) {
    return new ApiError(404, mensaje);
  }

  static conflicto(mensaje) {
    return new ApiError(409, mensaje);
  }

  static demasiadasPeticiones(mensaje) {
    return new ApiError(429, mensaje);
  }

  static interno(mensaje) {
    return new ApiError(500, mensaje);
  }
}

module.exports = ApiError;
