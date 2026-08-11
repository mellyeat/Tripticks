/**
 * Gestion del catalogo desde la consola (RF-13).
 *
 * Lista con incluir_inactivos=1 para que el administrador vea tambien los
 * viajes retirados y los que ya salieron, que es justo lo que el catalogo
 * publico oculta.
 */
(function (global) {
  'use strict';

  var documento = global.document;

  var LIMITE = 20;

  var viajes = [];
  var pagina = 1;
  var total = 0;
  var seleccionado = null;

  function mostrar(elemento, visible) {
    if (elemento) {
      elemento.classList.toggle('hidden', !visible);
    }
  }

  function hoyISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function avisar(id, mensaje) {
    var contenedor = documento.getElementById(id);
    var texto = documento.getElementById(id + '-message');

    if (texto) {
      texto.textContent = mensaje;
    }

    mostrar(contenedor, Boolean(mensaje));
  }

  function dato(clave, valor) {
    var elemento = documento.querySelector('[data-stat="' + clave + '"]');

    if (elemento) {
      elemento.textContent = String(valor);
    }
  }

  function estadoDe(viaje) {
    if (!viaje.activo) {
      return { clase: 'badge-inactivo', etiqueta: 'Inactivo', clave: 'inactivo' };
    }

    if (Number(viaje.cupos_disponibles) === 0) {
      return { clase: 'badge-agotado', etiqueta: 'Agotado', clave: 'agotado' };
    }

    return { clase: 'badge-disponible', etiqueta: 'Disponible', clave: 'disponible' };
  }

  function pintarEstadisticas() {
    dato('total', total);
    dato(
      'activos',
      viajes.filter(function (viaje) {
        return viaje.activo;
      }).length
    );
    dato(
      'agotados',
      viajes.filter(function (viaje) {
        return Number(viaje.cupos_disponibles) === 0;
      }).length
    );
    dato(
      'proximas',
      viajes.filter(function (viaje) {
        return viaje.fecha_salida >= hoyISO();
      }).length
    );
  }

  function visibles() {
    var filtro = documento.getElementById('filtro-estado-viaje').value;

    if (!filtro) {
      return viajes;
    }

    return viajes.filter(function (viaje) {
      return estadoDe(viaje).clave === filtro;
    });
  }

  function pintarFila(viaje, plantilla) {
    var fila = plantilla.content.cloneNode(true);
    var estado = estadoDe(viaje);

    var celda = function (clave) {
      return fila.querySelector('[data-cell="' + clave + '"]');
    };

    var imagen = celda('imagen');
    imagen.src = viaje.imagen_url;
    imagen.alt = viaje.titulo;

    var titulo = celda('titulo');
    titulo.textContent = viaje.titulo;
    titulo.href = '/admin/trips/' + viaje.id + '/edit';

    celda('duracion').textContent = global.Formato.dias(viaje.duracion_dias);
    celda('destino').textContent = viaje.destino;
    celda('cupos').textContent = viaje.cupos_disponibles + ' / ' + viaje.cupos_totales;
    celda('precio').textContent = global.Formato.monedaExacta(viaje.precio);

    var insignia = celda('estado');
    insignia.className = estado.clase;
    insignia.textContent = estado.etiqueta;

    celda('editar').href = '/admin/trips/' + viaje.id + '/edit';
    celda('icono-activo').textContent = viaje.activo ? 'visibility_off' : 'visibility';

    fila.querySelectorAll('[data-action]').forEach(function (boton) {
      boton.setAttribute('data-trip-id', viaje.id);
      boton.setAttribute('data-trip-titulo', viaje.titulo);
      boton.setAttribute('data-trip-activo', String(viaje.activo));
    });

    var alternar = fila.querySelector('[data-action="alternar"]');
    alternar.setAttribute(
      'aria-label',
      (viaje.activo ? 'Desactivar' : 'Activar') + ' el viaje ' + viaje.titulo
    );

    fila.querySelector('[data-action="eliminar"]').setAttribute(
      'aria-label',
      'Eliminar el viaje ' + viaje.titulo
    );

    return fila;
  }

  function pintarPaginacion() {
    var navegacion = documento.getElementById('trips-pagination');
    var conteo = documento.getElementById('trips-count');
    var paginas = Math.max(1, Math.ceil(total / LIMITE));

    conteo.textContent = total === 0 ? '' : 'Pagina ' + pagina + ' de ' + paginas + ' - ' + total + ' viajes';

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

  function pintar() {
    var cuerpo = documento.getElementById('trips-body');
    var plantilla = documento.getElementById('trip-row-template');
    var lista = visibles();

    cuerpo.innerHTML = '';

    lista.forEach(function (viaje) {
      cuerpo.appendChild(pintarFila(viaje, plantilla));
    });

    mostrar(documento.getElementById('trips-empty'), lista.length === 0);
    pintarEstadisticas();
    pintarPaginacion();
  }

  function cargar() {
    var destino = documento.getElementById('filtro-destino').value.trim();
    var consulta =
      '/trips?incluir_inactivos=1&limite=' + LIMITE + '&pagina=' + pagina +
      (destino ? '&destino=' + encodeURIComponent(destino) : '');

    mostrar(documento.getElementById('trips-loading'), true);
    avisar('trips-error', '');

    global.Api.get(consulta)
      .then(function (datos) {
        mostrar(documento.getElementById('trips-loading'), false);
        viajes = datos.viajes;
        total = datos.paginacion.total;
        pintar();
      })
      .catch(function (fallo) {
        mostrar(documento.getElementById('trips-loading'), false);
        avisar('trips-error', fallo.message);
      });
  }

  function alternarActivo(boton) {
    var id = boton.getAttribute('data-trip-id');
    var activo = boton.getAttribute('data-trip-activo') === 'true';

    boton.disabled = true;

    global.Api.put('/trips/' + id, { activo: !activo })
      .then(function () {
        avisar(
          'trips-success',
          activo ? 'El viaje se retiro del catalogo.' : 'El viaje volvio al catalogo.'
        );
        cargar();
      })
      .catch(function (fallo) {
        boton.disabled = false;
        avisar('trips-error', fallo.message);
      });
  }

  function abrirBorrado(boton) {
    var dialogo = documento.getElementById('delete-dialog');

    seleccionado = boton.getAttribute('data-trip-id');

    dialogo.querySelector('[data-cell="titulo"]').textContent =
      boton.getAttribute('data-trip-titulo') || 'este viaje';

    avisar('delete-error', '');
    mostrar(documento.getElementById('desactivar-en-su-lugar'), false);
    dialogo.showModal();
  }

  function conectarDialogo() {
    var dialogo = documento.getElementById('delete-dialog');
    var confirmar = documento.getElementById('confirm-delete-btn');
    var desactivar = documento.getElementById('desactivar-en-su-lugar');

    confirmar.addEventListener('click', function () {
      confirmar.disabled = true;

      global.Api.del('/trips/' + seleccionado)
        .then(function () {
          confirmar.disabled = false;
          dialogo.close();
          avisar('trips-success', 'El viaje se elimino del catalogo.');
          cargar();
        })
        .catch(function (fallo) {
          confirmar.disabled = false;
          avisar('delete-error', fallo.message);

          // 409: tiene reservaciones. Desactivarlo es la salida que propone la API.
          mostrar(desactivar, fallo.estado === 409);
        });
    });

    desactivar.addEventListener('click', function () {
      desactivar.disabled = true;

      global.Api.put('/trips/' + seleccionado, { activo: false })
        .then(function () {
          desactivar.disabled = false;
          dialogo.close();
          avisar('trips-success', 'El viaje se retiro del catalogo y conserva sus reservaciones.');
          cargar();
        })
        .catch(function (fallo) {
          desactivar.disabled = false;
          avisar('delete-error', fallo.message);
        });
    });
  }

  documento.addEventListener('DOMContentLoaded', function () {
    if (!documento.getElementById('trips-body')) {
      return;
    }

    documento.getElementById('trips-body').addEventListener('click', function (evento) {
      var boton = evento.target.closest('[data-action]');

      if (!boton) {
        return;
      }

      if (boton.getAttribute('data-action') === 'alternar') {
        alternarActivo(boton);
        return;
      }

      abrirBorrado(boton);
    });

    documento.getElementById('filtro-estado-viaje').addEventListener('change', pintar);
    documento.getElementById('refrescar').addEventListener('click', function () {
      pagina = 1;
      cargar();
    });

    var busqueda = documento.getElementById('filtro-destino');

    busqueda.addEventListener('change', function () {
      pagina = 1;
      cargar();
    });

    conectarDialogo();
    cargar();
  });
})(window);
