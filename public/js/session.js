// Estado de sesion en el navegador y ajuste de la interfaz segun el rol (RF-03, RF-17)
(function (global) {
  'use strict';

  var CLAVE_TOKEN = 'tripticks.token';
  var CLAVE_USUARIO = 'tripticks.usuario';

  var documento = global.document;

  function obtenerToken() {
    return global.localStorage.getItem(CLAVE_TOKEN);
  }

  function obtenerUsuario() {
    try {
      return JSON.parse(global.localStorage.getItem(CLAVE_USUARIO));
    } catch (error) {
      // Un valor corrupto no debe dejar la pagina inservible: se trata como
      // sesion inexistente y el usuario vuelve a iniciar sesion.
      return null;
    }
  }

  function guardar(token, usuario) {
    global.localStorage.setItem(CLAVE_TOKEN, token);
    global.localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
  }

  function cerrar() {
    global.localStorage.removeItem(CLAVE_TOKEN);
    global.localStorage.removeItem(CLAVE_USUARIO);
  }

  function estaAutenticado() {
    return Boolean(obtenerToken());
  }

  function esAdministrador() {
    var usuario = obtenerUsuario();
    return Boolean(usuario) && usuario.rol === 'administrador';
  }

  /**
   * Muestra u oculta los elementos marcados con data-auth segun quien mira.
   * Es solo presentacion: la autorizacion real la aplica el backend (RF-17).
   */
  function aplicarInterfaz() {
    var usuario = obtenerUsuario();
    var estado = !usuario ? 'guest' : usuario.rol === 'administrador' ? 'admin' : 'user';

    documento.querySelectorAll('[data-auth]').forEach(function (elemento) {
      var requerido = elemento.getAttribute('data-auth');
      // Un administrador tambien es un usuario autenticado, asi que ve los
      // enlaces de data-auth="user" ademas de los suyos.
      var visible =
        requerido === estado || (requerido === 'user' && estado === 'admin');

      elemento.classList.toggle('hidden', !visible);
    });

    if (usuario) {
      documento.querySelectorAll('[data-user="nombre"]').forEach(function (elemento) {
        elemento.textContent = usuario.nombre;
      });
    }
  }

  /**
   * Cierra sesion (RF-03). Se avisa al backend para dejar el evento en la
   * bitacora, pero el token se borra pase lo que pase: si la red falla, la
   * sesion local igual debe terminar.
   */
  function cerrarSesion() {
    var terminar = function () {
      cerrar();
      global.location.href = '/index.html';
    };

    if (global.Api && estaAutenticado()) {
      global.Api.post('/auth/logout').then(terminar, terminar);
      return;
    }

    terminar();
  }

  /** Redirige a login si la pagina exige sesion. Llamar desde paginas privadas. */
  function exigirSesion() {
    if (!estaAutenticado()) {
      global.location.href = '/pages/login.html?requerida=1';
      return false;
    }

    return true;
  }

  function inicializar() {
    aplicarInterfaz();

    var botonSalir = documento.getElementById('logout-btn');

    if (botonSalir) {
      botonSalir.addEventListener('click', cerrarSesion);
    }

    // El menu movil vive en el encabezado compartido por todas las paginas,
    // igual que los controles de sesion, por eso se conecta aqui (RNF-08).
    var botonMenu = documento.getElementById('mobile-menu-btn');
    var menu = documento.getElementById('mobile-menu');

    if (botonMenu && menu) {
      botonMenu.addEventListener('click', function () {
        var abierto = menu.classList.toggle('hidden') === false;
        botonMenu.setAttribute('aria-expanded', String(abierto));
        botonMenu.setAttribute('aria-label', abierto ? 'Cerrar menu' : 'Abrir menu');
      });
    }
  }

  documento.addEventListener('DOMContentLoaded', inicializar);

  global.Sesion = {
    obtenerToken: obtenerToken,
    obtenerUsuario: obtenerUsuario,
    guardar: guardar,
    cerrar: cerrar,
    cerrarSesion: cerrarSesion,
    estaAutenticado: estaAutenticado,
    esAdministrador: esAdministrador,
    exigirSesion: exigirSesion,
    aplicarInterfaz: aplicarInterfaz,
  };
})(window);
