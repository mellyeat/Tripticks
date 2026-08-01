// Error de aplicacion con codigo HTTP, distinguible de una excepcion inesperada (RF-20)
'use strict';

class ApiError extends Error {
  /**
   * @param {number} estado Codigo HTTP.
   * @param {string} mensaje Mensaje apto para mostrar al usuario.
   * @param {Array} detalles Errores de validacion por campo, si aplica.
   */
  constructor(estado, mensaje, detalles = []) {
    super(mensaje);
    this.name = 'ApiError';
    this.estado = estado;
    this.detalles = detalles;
    // Marca los errores previstos: el middleware muestra su mensaje tal cual,
    // mientras que a los inesperados les responde un texto generico.
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

  static interno(mensaje) {
    return new ApiError(500, mensaje);
  }
}

module.exports = ApiError;
