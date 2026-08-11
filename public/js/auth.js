(function (global) {
  'use strict';

  var documento = global.document;

  /* Los cuatro criterios son los mismos que valida reglasRegistro en el
     backend, de modo que el medidor no promete nada que el API vaya a
     rechazar despues. */
  var CRITERIOS_PASSWORD = [
    function (valor) {
      return valor.length >= 8;
    },
    function (valor) {
      return /[a-z]/.test(valor);
    },
    function (valor) {
      return /[A-Z]/.test(valor);
    },
    function (valor) {
      return /\d/.test(valor);
    },
  ];

  var ETIQUETAS_FUERZA = ['', 'Muy debil', 'Debil', 'Aceptable', 'Segura'];

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

    formulario.querySelectorAll('[aria-invalid]').forEach(function (campo) {
      campo.classList.remove('border-error');
      campo.removeAttribute('aria-invalid');
    });
  }

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

  /* El boton de registro lleva un icono ademas del texto, asi que se guarda y
     se restaura el contenido completo en lugar de solo la etiqueta. */
  function alternarCarga(boton, cargando, contenidoOriginal) {
    boton.disabled = cargando;

    if (cargando) {
      boton.textContent = 'Procesando...';
      return;
    }

    boton.innerHTML = contenidoOriginal;
  }

  /* construirCuerpo devuelve { cuerpo } cuando los datos son validos o
     { errores } con la lista de campos que el navegador puede comprobar sin
     consultar al servidor. */
  function conectar(formulario, ruta, construirCuerpo) {
    var alerta = documento.getElementById('form-alert');
    var boton = formulario.querySelector('button[type="submit"]');
    var contenidoBoton = boton.innerHTML;

    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();
      limpiarErrores(formulario);
      mostrarAlerta(alerta, '');

      var datos = new FormData(formulario);
      var resultado = construirCuerpo(datos);

      if (resultado.errores) {
        mostrarErroresDeCampo(formulario, resultado.errores);
        return;
      }

      alternarCarga(boton, true, contenidoBoton);

      global.Api.post(ruta, resultado.cuerpo)
        .then(function (respuesta) {
          global.Sesion.guardar(respuesta.token, respuesta.usuario);

          var parametros = new URLSearchParams(global.location.search);
          global.location.href = destinoSeguro(parametros.get('destino'));
        })
        .catch(function (error) {
          if (error.detalles && error.detalles.length > 0) {
            mostrarErroresDeCampo(formulario, error.detalles);
          }

          mostrarAlerta(alerta, error.message);
          alternarCarga(boton, false, contenidoBoton);
        });
    });
  }

  /* El destino de vuelta llega en la barra de direcciones, asi que lo elige
     quien arme el enlace, no la aplicacion. Sin comprobarlo, un enlace como
     /login?destino=https://sitio-falso o ?destino=javascript:... lleva al
     usuario fuera del sitio (o ejecuta codigo en el nuestro) justo despues de
     que escribio su contrasena, que es el peor momento posible.

     Solo se acepta una ruta interna: una barra sola al principio. Se descartan
     "//host" y "/\host", que el navegador interpreta como otro dominio. */
  function destinoSeguro(valor) {
    if (typeof valor !== 'string' || valor.charAt(0) !== '/') {
      return '/';
    }

    if (valor.charAt(1) === '/' || valor.charAt(1) === '\\') {
      return '/';
    }

    return valor;
  }

  function conectarMedidorDeFuerza(formulario) {
    var campo = formulario.querySelector('[name="password"]');
    var barras = formulario.querySelectorAll('[data-strength-bar]');
    var etiqueta = formulario.querySelector('[data-strength-label]');

    if (!campo || barras.length === 0) {
      return;
    }

    campo.addEventListener('input', function () {
      var cumplidos = !campo.value
        ? 0
        : CRITERIOS_PASSWORD.filter(function (criterio) {
            return criterio(campo.value);
          }).length;

      barras.forEach(function (barra, indice) {
        barra.classList.toggle('strength-bar-on', indice < cumplidos);
      });

      if (etiqueta) {
        etiqueta.textContent = ETIQUETAS_FUERZA[cumplidos];
      }
    });
  }

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

  // Quien ya tiene sesion no llega hasta aqui: la ruta /login la corta antes
  // el guard soloInvitados en el servidor.
  documento.addEventListener('DOMContentLoaded', function () {
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
          cuerpo: {
            email: datos.get('email'),
            password: datos.get('password'),
          },
        };
      });
    }

    if (formularioRegistro) {
      conectarMedidorDeFuerza(formularioRegistro);

      conectar(formularioRegistro, '/auth/register', function (datos) {
        var errores = [];

        if (datos.get('password') !== datos.get('passwordConfirmacion')) {
          errores.push({
            campo: 'passwordConfirmacion',
            mensaje: 'Las contrasenas no coinciden.',
          });
        }

        if (!datos.get('terminos')) {
          errores.push({
            campo: 'terminos',
            mensaje: 'Debes aceptar los terminos y condiciones para continuar.',
          });
        }

        if (errores.length > 0) {
          return { errores: errores };
        }

        // "nacionalidad" se captura en el formulario por indicacion del diseno,
        // pero no forma parte de RF-01 ni de la tabla de usuarios: se queda en
        // el navegador y no viaja en la peticion.
        return {
          cuerpo: {
            nombre: datos.get('nombre'),
            email: datos.get('email'),
            password: datos.get('password'),
          },
        };
      });
    }
  });

  // Se expone solo para poder probarlo; el resto del modulo queda encerrado.
  global.Acceso = { destinoSeguro: destinoSeguro };
})(window);
