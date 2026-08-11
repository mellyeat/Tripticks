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

  function aplicarInterfaz() {
    var usuario = obtenerUsuario();
    var estado = !usuario ? 'guest' : usuario.rol === 'administrador' ? 'admin' : 'user';

    documento.querySelectorAll('[data-auth]').forEach(function (elemento) {
      var requerido = elemento.getAttribute('data-auth');
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

  /* La pagina llega renderizada por el servidor, que es quien sabe si la cookie
     sigue siendo valida. Si dice que no hay sesion, el token guardado sobra. */
  function sincronizarConServidor() {
    if (documento.body.getAttribute('data-sesion') === 'invitada' && obtenerToken()) {
      cerrar();
    }
  }

  function cerrarSesion() {
    var terminar = function () {
      cerrar();
      global.location.href = '/';
    };

    /* La cookie de sesion es httpOnly: solo el servidor puede borrarla, y es la
       que de verdad manda. Condicionar la llamada al token de localStorage
       dejaba la cookie viva cuando ese espejo estaba vacio, y la sesion volvia
       sola al recargar. Si ya no hay sesion, el 401 tambien termina en terminar. */
    if (global.Api) {
      global.Api.post('/auth/logout').then(terminar, terminar);
      return;
    }

    terminar();
  }

  function exigirSesion() {
    if (!estaAutenticado()) {
      global.location.href = '/login?requerida=1&destino=' + encodeURIComponent(global.location.pathname);
      return false;
    }

    return true;
  }

  function inicializar() {
    sincronizarConServidor();
    aplicarInterfaz();

    documento.querySelectorAll('[data-action="logout"]').forEach(function (boton) {
      boton.addEventListener('click', cerrarSesion);
    });

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
