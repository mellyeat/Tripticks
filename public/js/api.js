// Cliente HTTP del frontend: centraliza la base de la API y el envio del token (RF-18)
(function (global) {
  'use strict';

  var BASE = '/api';

  /**
   * Error con el mensaje y los detalles por campo que devolvio la API,
   * para que los formularios puedan marcar los campos invalidos (RF-19, RF-20).
   */
  function ErrorApi(mensaje, estado, detalles) {
    var error = new Error(mensaje);
    error.name = 'ErrorApi';
    error.estado = estado;
    error.detalles = detalles || [];
    return error;
  }

  // El token lo administra session.js; se consulta al vuelo para no quedarse
  // con un valor viejo despues de iniciar o cerrar sesion.
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
          // Una respuesta sin JSON valido (502, timeout del proxy) no debe
          // reventar aqui: se convierte en un error con mensaje presentable.
          return { exito: false, mensaje: 'El servidor no respondio correctamente.' };
        })
        .then(function (datos) {
          if (respuesta.ok) {
            return datos.datos;
          }

          // El token dejo de servir: se limpia la sesion y se manda a login.
          // Solo si habia token, para no desviar un login fallido (RF-03).
          if (respuesta.status === 401 && tokenActual() && global.Sesion) {
            global.Sesion.cerrar();
            global.location.href = '/pages/login.html?expirada=1';
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
    del: function (ruta) {
      return solicitar('DELETE', ruta);
    },
  };
})(window);
