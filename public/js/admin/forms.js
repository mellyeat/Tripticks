/**
 * Formularios de alta y edicion de la consola (RF-13, RF-14).
 *
 * Cubre las tres pantallas con formulario: crear viaje, editar viaje y anadir
 * usuario. Ademas del envio a la API, resuelve el comportamiento de interfaz
 * comun (contador de caracteres, bloques de itinerario, mostrar contrasena).
 */
(function (global) {
  'use strict';

  var documento = global.document;

  function mostrar(elemento, visible) {
    if (elemento) {
      elemento.classList.toggle('hidden', !visible);
    }
  }

  function idDeLaRuta(posicionDesdeElFinal) {
    var partes = global.location.pathname.split('/').filter(function (parte) {
      return parte.length > 0;
    });

    return partes[partes.length - posicionDesdeElFinal] || '';
  }

  function conectarContadores() {
    documento.querySelectorAll('[data-contador]').forEach(function (campo) {
      var salida = documento.getElementById(campo.getAttribute('data-contador'));

      if (!salida) {
        return;
      }

      var actualizar = function () {
        salida.textContent = String(campo.value.length);
      };

      campo.addEventListener('input', actualizar);
      actualizar();
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

  /* Cada bloque corresponde a un objeto { dia, titulo, descripcion } del
     arreglo jsonb que guarda la columna "itinerario". */
  function crearBloqueDeDia(numero, dia) {
    var elemento = documento.createElement('li');
    elemento.className =
      'rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4 space-y-4';

    elemento.innerHTML = [
      '<div class="flex items-center justify-between gap-4">',
      '  <p class="font-label-caps text-label-caps text-deep-teal">DIA <span data-numero-dia></span></p>',
      '  <button type="button" data-quitar-dia',
      '          class="link-danger" aria-label="Quitar este dia">',
      '    <span class="material-symbols-outlined text-lg" aria-hidden="true">delete</span>',
      '    Quitar',
      '  </button>',
      '</div>',
      '<div>',
      '  <label class="field-label">TITULO DEL DIA</label>',
      '  <input type="text" name="itinerario_titulo" class="field"',
      '         placeholder="Ej. Llegada y bienvenida alpina" />',
      '</div>',
      '<div>',
      '  <label class="field-label">DESCRIPCION DEL DIA</label>',
      '  <textarea name="itinerario_descripcion" class="field min-h-24"',
      '            placeholder="Que incluye la jornada..."></textarea>',
      '</div>',
    ].join('');

    elemento.querySelector('[data-numero-dia]').textContent = String(numero);

    if (dia) {
      elemento.querySelector('[name="itinerario_titulo"]').value = dia.titulo || '';
      elemento.querySelector('[name="itinerario_descripcion"]').value = dia.descripcion || '';
    }

    return elemento;
  }

  function renumerarDias(lista) {
    lista.querySelectorAll('[data-numero-dia]').forEach(function (marca, indice) {
      marca.textContent = String(indice + 1);
    });
  }

  function conectarItinerario() {
    var lista = documento.getElementById('itinerario');
    var boton = documento.getElementById('agregar-dia');

    if (!lista || !boton) {
      return;
    }

    boton.addEventListener('click', function () {
      lista.appendChild(crearBloqueDeDia(lista.children.length + 1));
    });

    lista.addEventListener('click', function (evento) {
      var quitar = evento.target.closest('[data-quitar-dia]');

      if (!quitar) {
        return;
      }

      quitar.closest('li').remove();
      renumerarDias(lista);
    });

    // En el alta el itinerario arranca con un dia para que no quede vacio; al
    // editar, los dias ya vienen puestos y no hay que agregar ninguno.
    if (lista.children.length === 0) {
      lista.appendChild(crearBloqueDeDia(1));
    }
  }

  function leerItinerario() {
    var lista = documento.getElementById('itinerario');

    if (!lista) {
      return [];
    }

    var dias = [];

    [].slice.call(lista.children).forEach(function (bloque) {
      var titulo = bloque.querySelector('[name="itinerario_titulo"]');
      var descripcion = bloque.querySelector('[name="itinerario_descripcion"]');

      if (!titulo || !descripcion) {
        return;
      }

      // Un bloque a medias no se envia: el validador exige titulo y descripcion.
      if (!titulo.value.trim() || !descripcion.value.trim()) {
        return;
      }

      dias.push({
        dia: dias.length + 1,
        titulo: titulo.value.trim(),
        descripcion: descripcion.value.trim(),
      });
    });

    return dias;
  }

  function limpiarErrores(formulario) {
    documento.querySelectorAll('[data-error]').forEach(function (elemento) {
      elemento.textContent = '';
      elemento.classList.add('hidden');
    });

    formulario.querySelectorAll('[aria-invalid]').forEach(function (campo) {
      campo.classList.remove('border-error');
      campo.removeAttribute('aria-invalid');
    });
  }

  /* Los nombres de los campos del formulario son los mismos del contrato JSON,
     asi que el mensaje de cada detalle cae debajo del campo que lo provoco. */
  function pintarErrores(formulario, fallo) {
    var salida = documento.getElementById('form-error-message');

    if (salida) {
      salida.textContent = fallo.message;
    }

    mostrar(documento.getElementById('form-error'), true);

    (fallo.detalles || []).forEach(function (detalle) {
      var mensaje = documento.querySelector('[data-error="' + detalle.campo + '"]');
      var campo = formulario.querySelector('[name="' + detalle.campo + '"]');

      if (mensaje) {
        mensaje.textContent = detalle.mensaje;
        mensaje.classList.remove('hidden');
      }

      if (campo) {
        campo.classList.add('border-error');
        campo.setAttribute('aria-invalid', 'true');
      }
    });
  }

  function botonesDe(formulario) {
    return [].slice.call(documento.querySelectorAll('[form="' + formulario.id + '"]')).concat(
      [].slice.call(formulario.querySelectorAll('button[type="submit"]'))
    );
  }

  function conectar(formulario, enviar, destino) {
    var botones = botonesDe(formulario);

    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();
      limpiarErrores(formulario);
      mostrar(documento.getElementById('form-error'), false);

      botones.forEach(function (boton) {
        boton.disabled = true;
      });

      enviar()
        .then(function () {
          global.location.href = destino;
        })
        .catch(function (fallo) {
          botones.forEach(function (boton) {
            boton.disabled = false;
          });

          pintarErrores(formulario, fallo);
        });
    });
  }

  function datosDelViaje(formulario) {
    var datos = new global.FormData(formulario);
    var activo = documento.getElementById('activo');

    var viaje = {
      titulo: datos.get('titulo'),
      destino: datos.get('destino'),
      descripcion: datos.get('descripcion'),
      itinerario: leerItinerario(),
      precio: Number(datos.get('precio')),
      fecha_salida: datos.get('fecha_salida'),
      fecha_regreso: datos.get('fecha_regreso'),
      cupos_totales: Number(datos.get('cupos_totales')),
      imagen_url: datos.get('imagen_url'),
    };

    if (activo) {
      viaje.activo = activo.type === 'checkbox' ? activo.checked : activo.value === 'true';
    }

    return viaje;
  }

  function iniciarAltaDeViaje(formulario) {
    conectar(
      formulario,
      function () {
        return global.Api.post('/trips', datosDelViaje(formulario));
      },
      '/admin/trips'
    );
  }

  function iniciarEdicionDeViaje(formulario) {
    // La ruta es /admin/trips/:id/edit, asi que el id es el penultimo tramo.
    var id = idDeLaRuta(2);

    conectar(
      formulario,
      function () {
        return global.Api.put('/trips/' + id, datosDelViaje(formulario));
      },
      '/admin/trips'
    );
  }

  function iniciarAltaDeUsuario(formulario) {
    conectar(
      formulario,
      function () {
        var datos = new global.FormData(formulario);
        var activo = documento.getElementById('activo');

        return global.Api.post('/users', {
          nombre: datos.get('nombre'),
          email: datos.get('email'),
          password: datos.get('password'),
          rol: datos.get('rol'),
          activo: activo ? activo.value === 'true' : true,
        });
      },
      '/admin/users'
    );
  }

  documento.addEventListener('DOMContentLoaded', function () {
    conectarContadores();
    conectarMostrarContrasena();
    conectarItinerario();

    var alta = documento.getElementById('trip-form');
    var edicion = documento.getElementById('trip-edit-form');
    var usuario = documento.getElementById('user-form');

    if (alta) {
      iniciarAltaDeViaje(alta);
      return;
    }

    if (edicion) {
      iniciarEdicionDeViaje(edicion);
      return;
    }

    if (usuario) {
      iniciarAltaDeUsuario(usuario);
    }
  });

  global.FormulariosAdmin = { crearBloqueDeDia: crearBloqueDeDia };
})(window);
