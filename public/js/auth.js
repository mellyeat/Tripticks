// Formularios de registro e inicio de sesion (RF-01, RF-02)
(function (global) {
  'use strict';

  var documento = global.document;

  function mostrarAlerta(contenedor, mensaje) {
    if (!contenedor) {
      return;
    }

    contenedor.textContent = mensaje;
    contenedor.classList.toggle('hidden', !mensaje);
  }

  function limpiarErrores(formulario) {
    formulario.querySelectorAll('[data-error]').forEach(function (elemento) {
      elemento.textContent = '';
      elemento.classList.add('hidden');
    });

    formulario.querySelectorAll('.field').forEach(function (campo) {
      campo.classList.remove('border-error');
      campo.removeAttribute('aria-invalid');
    });
  }

  /** Coloca cada mensaje del backend junto a su campo (RF-19, RF-20). */
  function mostrarErroresDeCampo(formulario, detalles) {
    detalles.forEach(function (detalle) {
      var contenedor = formulario.querySelector('[data-error="' + detalle.campo + '"]');
      var campo = formulario.querySelector('[name="' + detalle.campo + '"]');

      if (contenedor) {
        contenedor.textContent = detalle.mensaje;
        contenedor.classList.remove('hidden');
      }

      if (campo) {
        campo.classList.add('border-error');
        campo.setAttribute('aria-invalid', 'true');
      }
    });
  }

  function alternarCarga(boton, cargando, textoOriginal) {
    boton.disabled = cargando;
    boton.textContent = cargando ? 'Procesando...' : textoOriginal;
  }

  /**
   * Conecta un formulario con su endpoint.
   *
   * @param {HTMLFormElement} formulario
   * @param {string} ruta Endpoint de la API.
   * @param {Function} construirCuerpo Toma un FormData y devuelve el payload.
   */
  function conectar(formulario, ruta, construirCuerpo) {
    var alerta = documento.getElementById('form-alert');
    var boton = formulario.querySelector('button[type="submit"]');
    var textoBoton = boton.textContent.trim();

    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();
      limpiarErrores(formulario);
      mostrarAlerta(alerta, '');

      var datos = new FormData(formulario);
      var cuerpo = construirCuerpo(datos);

      // La confirmacion solo existe en el navegador: se valida aqui porque el
      // backend nunca la recibe.
      if (cuerpo === null) {
        mostrarErroresDeCampo(formulario, [
          { campo: 'passwordConfirmacion', mensaje: 'Las contrasenas no coinciden.' },
        ]);
        return;
      }

      alternarCarga(boton, true, textoBoton);

      global.Api.post(ruta, cuerpo)
        .then(function (respuesta) {
          global.Sesion.guardar(respuesta.token, respuesta.usuario);

          // Tras autenticar se va al destino solicitado, si lo hubo, o al inicio.
          var parametros = new URLSearchParams(global.location.search);
          global.location.href = parametros.get('redirect') || '/index.html';
        })
        .catch(function (error) {
          if (error.detalles && error.detalles.length > 0) {
            mostrarErroresDeCampo(formulario, error.detalles);
          }

          mostrarAlerta(alerta, error.message);
          alternarCarga(boton, false, textoBoton);
        });
    });
  }

  /** Botones de ojo: alternan entre password y text sin perder lo escrito. */
  function conectarMostrarContrasena() {
    documento.querySelectorAll('[data-toggle-password]').forEach(function (boton) {
      boton.addEventListener('click', function () {
        var campo = documento.getElementById(boton.getAttribute('data-toggle-password'));

        if (!campo) {
          return;
        }

        var oculta = campo.type === 'password';
        campo.type = oculta ? 'text' : 'password';
        boton.setAttribute('aria-label', oculta ? 'Ocultar contrasena' : 'Mostrar contrasena');
        boton.querySelector('.material-symbols-outlined').textContent = oculta
          ? 'visibility_off'
          : 'visibility';
      });
    });
  }

  documento.addEventListener('DOMContentLoaded', function () {
    // Quien ya tiene sesion no necesita estas pantallas.
    if (global.Sesion.estaAutenticado()) {
      global.location.href = '/index.html';
      return;
    }

    var parametros = new URLSearchParams(global.location.search);
    var alerta = documento.getElementById('form-alert');

    if (parametros.has('expirada')) {
      mostrarAlerta(alerta, 'Tu sesion expiro. Inicia sesion nuevamente.');
    } else if (parametros.has('requerida')) {
      mostrarAlerta(alerta, 'Debes iniciar sesion para continuar.');
    }

    conectarMostrarContrasena();

    var formularioLogin = documento.getElementById('login-form');
    var formularioRegistro = documento.getElementById('register-form');

    if (formularioLogin) {
      conectar(formularioLogin, '/auth/login', function (datos) {
        return {
          email: datos.get('email'),
          password: datos.get('password'),
        };
      });
    }

    if (formularioRegistro) {
      conectar(formularioRegistro, '/auth/register', function (datos) {
        if (datos.get('password') !== datos.get('passwordConfirmacion')) {
          return null;
        }

        return {
          nombre: datos.get('nombre'),
          email: datos.get('email'),
          password: datos.get('password'),
        };
      });
    }
  });
})(window);
