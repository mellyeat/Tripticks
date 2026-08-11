/**
 * Gestion de cuentas desde la consola (RF-14).
 *
 * La edicion y la asignacion de rol ocurren en un dialogo sobre el listado; la
 * baja es logica, asi que la cuenta desactivada sigue apareciendo y se puede
 * volver a activar desde el mismo formulario.
 */
(function (global) {
  'use strict';

  var documento = global.document;

  var LIMITE = 20;

  var pagina = 1;
  var total = 0;
  var seleccionado = null;

  function mostrar(elemento, visible) {
    if (elemento) {
      elemento.classList.toggle('hidden', !visible);
    }
  }

  function avisar(id, mensaje) {
    var texto = documento.getElementById(id + '-message');

    if (texto) {
      texto.textContent = mensaje;
    }

    mostrar(documento.getElementById(id), Boolean(mensaje));
  }

  function dato(clave, valor) {
    var elemento = documento.querySelector('[data-stat="' + clave + '"]');

    if (elemento) {
      elemento.textContent = String(valor);
    }
  }

  function iniciales(nombre) {
    return String(nombre || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (parte) {
        return parte.charAt(0).toUpperCase();
      })
      .join('');
  }

  function valorDe(id) {
    return documento.getElementById(id).value;
  }

  function limpiarErroresDeCampo() {
    documento.querySelectorAll('#user-form [data-error]').forEach(function (elemento) {
      elemento.textContent = '';
      elemento.classList.add('hidden');
    });
  }

  function pintarFila(usuario, plantilla) {
    var fila = plantilla.content.cloneNode(true);

    var celda = function (clave) {
      return fila.querySelector('[data-cell="' + clave + '"]');
    };

    celda('iniciales').textContent = iniciales(usuario.nombre);
    celda('nombre').textContent = usuario.nombre;
    celda('email').textContent = usuario.email;
    celda('alta').textContent = global.Formato.fecha(usuario.creado_en);

    var rol = celda('rol');
    rol.className = usuario.rol === 'administrador' ? 'role-chip-admin' : 'role-chip-user';
    rol.textContent = usuario.rol === 'administrador' ? 'Administrador' : 'Usuario';

    celda('punto').className = 'status-dot ' + (usuario.activo ? 'bg-deep-teal' : 'bg-error');

    var estado = celda('estado');
    estado.className = 'font-semibold ' + (usuario.activo ? 'text-deep-teal' : 'text-error');
    estado.textContent = usuario.activo ? 'Activo' : 'Inactivo';

    fila.querySelectorAll('[data-action]').forEach(function (boton) {
      boton.setAttribute('data-user-id', usuario.id);
      boton.setAttribute('data-user-nombre', usuario.nombre);
      boton.setAttribute('data-user-email', usuario.email);
      boton.setAttribute('data-user-rol', usuario.rol);
      boton.setAttribute('data-user-activo', String(usuario.activo));
    });

    var baja = fila.querySelector('[data-action="desactivar"]');

    // Una cuenta ya desactivada se reactiva desde el formulario de edicion.
    if (!usuario.activo) {
      baja.remove();
    } else {
      baja.setAttribute('aria-label', 'Desactivar la cuenta de ' + usuario.nombre);
    }

    fila.querySelector('[data-action="editar"]').setAttribute(
      'aria-label',
      'Editar la cuenta de ' + usuario.nombre
    );

    return fila;
  }

  function pintarPaginacion() {
    var navegacion = documento.getElementById('users-pagination');
    var conteo = documento.getElementById('users-count');
    var paginas = Math.max(1, Math.ceil(total / LIMITE));

    conteo.textContent =
      total === 0 ? '' : 'Pagina ' + pagina + ' de ' + paginas + ' - ' + total + ' cuentas';

    navegacion.innerHTML = '';

    if (paginas <= 1) {
      return;
    }

    var boton = function (destino, etiqueta, icono, habilitado) {
      var elemento = documento.createElement('button');
      elemento.type = 'button';
      elemento.className = 'page-btn';
      elemento.disabled = !habilitado;
      elemento.setAttribute('aria-label', etiqueta);
      elemento.innerHTML =
        '<span class="material-symbols-outlined text-xl" aria-hidden="true">' + icono + '</span>';

      elemento.addEventListener('click', function () {
        pagina = destino;
        cargar();
      });

      return elemento;
    };

    navegacion.appendChild(boton(pagina - 1, 'Pagina anterior', 'chevron_left', pagina > 1));
    navegacion.appendChild(boton(pagina + 1, 'Pagina siguiente', 'chevron_right', pagina < paginas));
  }

  /* Los totales de las tarjetas se piden aparte y sin filtros: describen todo
     el padron, no la pagina que se esta viendo. */
  function cargarEstadisticas() {
    global.Api.get('/users?limite=1')
      .then(function (datos) {
        dato('total', datos.paginacion.total);
      })
      .catch(function () {
        // Las cifras son complementarias: el listado se muestra igual.
      });

    global.Api.get('/users?limite=1&activo=true')
      .then(function (datos) {
        dato('activos', datos.paginacion.total);
      })
      .catch(function () {});

    global.Api.get('/users?limite=1&rol=administrador')
      .then(function (datos) {
        dato('administradores', datos.paginacion.total);
      })
      .catch(function () {});
  }

  function cargar() {
    var partes = ['limite=' + LIMITE, 'pagina=' + pagina];
    var busqueda = valorDe('filtro-busqueda').trim();
    var rol = valorDe('filtro-rol');
    var activo = valorDe('filtro-estado');

    if (busqueda) {
      partes.push('busqueda=' + encodeURIComponent(busqueda));
    }

    if (rol) {
      partes.push('rol=' + rol);
    }

    if (activo) {
      partes.push('activo=' + activo);
    }

    mostrar(documento.getElementById('users-loading'), true);
    avisar('users-error', '');

    global.Api.get('/users?' + partes.join('&'))
      .then(function (datos) {
        mostrar(documento.getElementById('users-loading'), false);

        var cuerpo = documento.getElementById('users-body');
        var plantilla = documento.getElementById('user-row-template');

        cuerpo.innerHTML = '';
        total = datos.paginacion.total;

        datos.usuarios.forEach(function (usuario) {
          cuerpo.appendChild(pintarFila(usuario, plantilla));
        });

        mostrar(documento.getElementById('users-empty'), datos.usuarios.length === 0);
        pintarPaginacion();
      })
      .catch(function (fallo) {
        mostrar(documento.getElementById('users-loading'), false);
        avisar('users-error', fallo.message);
      });
  }

  function abrirEdicion(boton) {
    var dialogo = documento.getElementById('user-dialog');

    seleccionado = boton.getAttribute('data-user-id');

    documento.getElementById('editar-nombre').value = boton.getAttribute('data-user-nombre');
    documento.getElementById('editar-email').value = boton.getAttribute('data-user-email');
    documento.getElementById('editar-rol').value = boton.getAttribute('data-user-rol');
    documento.getElementById('editar-activo').value = boton.getAttribute('data-user-activo');

    limpiarErroresDeCampo();
    avisar('user-dialog-error', '');
    dialogo.showModal();
  }

  function abrirBaja(boton) {
    var dialogo = documento.getElementById('deactivate-dialog');

    seleccionado = boton.getAttribute('data-user-id');

    dialogo.querySelector('[data-cell="nombre"]').textContent =
      boton.getAttribute('data-user-nombre') || 'Esta persona';

    avisar('deactivate-error', '');
    dialogo.showModal();
  }

  function conectarEdicion() {
    var dialogo = documento.getElementById('user-dialog');
    var formulario = documento.getElementById('user-form');

    documento.getElementById('user-cancel-btn').addEventListener('click', function () {
      dialogo.close();
    });

    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();
      limpiarErroresDeCampo();
      avisar('user-dialog-error', '');

      var boton = formulario.querySelector('button[type="submit"]');
      boton.disabled = true;

      global.Api.put('/users/' + seleccionado, {
        nombre: valorDe('editar-nombre'),
        email: valorDe('editar-email'),
        rol: valorDe('editar-rol'),
        activo: valorDe('editar-activo') === 'true',
      })
        .then(function () {
          boton.disabled = false;
          dialogo.close();
          avisar('users-success', 'La cuenta se actualizo correctamente.');
          cargar();
          cargarEstadisticas();
        })
        .catch(function (fallo) {
          boton.disabled = false;

          (fallo.detalles || []).forEach(function (detalle) {
            var salida = formulario.querySelector('[data-error="' + detalle.campo + '"]');

            if (salida) {
              salida.textContent = detalle.mensaje;
              salida.classList.remove('hidden');
            }
          });

          avisar('user-dialog-error', fallo.message);
        });
    });
  }

  function conectarBaja() {
    var dialogo = documento.getElementById('deactivate-dialog');
    var confirmar = documento.getElementById('confirm-deactivate-btn');

    confirmar.addEventListener('click', function () {
      confirmar.disabled = true;

      global.Api.del('/users/' + seleccionado)
        .then(function () {
          confirmar.disabled = false;
          dialogo.close();
          avisar('users-success', 'La cuenta quedo desactivada.');
          cargar();
          cargarEstadisticas();
        })
        .catch(function (fallo) {
          confirmar.disabled = false;
          avisar('deactivate-error', fallo.message);
        });
    });
  }

  documento.addEventListener('DOMContentLoaded', function () {
    if (!documento.getElementById('users-body')) {
      return;
    }

    documento.getElementById('users-body').addEventListener('click', function (evento) {
      var boton = evento.target.closest('[data-action]');

      if (!boton) {
        return;
      }

      if (boton.getAttribute('data-action') === 'editar') {
        abrirEdicion(boton);
        return;
      }

      abrirBaja(boton);
    });

    ['filtro-rol', 'filtro-estado', 'filtro-busqueda'].forEach(function (id) {
      documento.getElementById(id).addEventListener('change', function () {
        pagina = 1;
        cargar();
      });
    });

    documento.getElementById('refrescar').addEventListener('click', function () {
      pagina = 1;
      cargar();
      cargarEstadisticas();
    });

    conectarEdicion();
    conectarBaja();
    cargar();
    cargarEstadisticas();
  });
})(window);
