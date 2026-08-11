(function (global) {
  'use strict';

  var BASE = '/api';

  function ErrorApi(mensaje, estado, detalles) {
    var error = new Error(mensaje);
    error.name = 'ErrorApi';
    error.estado = estado;
    error.detalles = detalles || [];
    return error;
  }

  function tokenActual() {
    return global.Sesion ? global.Sesion.obtenerToken() : null;
  }

  function solicitar(metodo, ruta, cuerpo) {
    var opciones = {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
    };

    var token = tokenActual();

    if (token) {
      opciones.headers.Authorization = 'Bearer ' + token;
    }

    if (cuerpo !== undefined) {
      opciones.body = JSON.stringify(cuerpo);
    }

    return fetch(BASE + ruta, opciones).then(function (respuesta) {
      return respuesta
        .json()
        .catch(function () {
          return { exito: false, mensaje: 'El servidor no respondio correctamente.' };
        })
        .then(function (datos) {
          if (respuesta.ok) {
            return datos.datos;
          }

          if (respuesta.status === 401 && tokenActual() && global.Sesion) {
            global.Sesion.cerrar();
            global.location.href = '/login?expirada=1';
          }

          throw ErrorApi(datos.mensaje || 'Ocurrio un error.', respuesta.status, datos.detalles);
        });
    });
  }

  global.Api = {
    get: function (ruta) {
      return solicitar('GET', ruta);
    },
    post: function (ruta, cuerpo) {
      return solicitar('POST', ruta, cuerpo);
    },
    put: function (ruta, cuerpo) {
      return solicitar('PUT', ruta, cuerpo);
    },
    patch: function (ruta, cuerpo) {
      return solicitar('PATCH', ruta, cuerpo);
    },
    del: function (ruta) {
      return solicitar('DELETE', ruta);
    },
  };
})(window);
