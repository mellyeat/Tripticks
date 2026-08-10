/**
 * Gestion de reservaciones desde la consola (RF-15).
 *
 * Sirve al listado y a la ficha de un folio: ambas leen del mismo endpoint y
 * comparten el cambio de estado.
 */
(function (global) {
  'use strict';

  var documento = global.document;

  var LIMITE = 20;

  var ESTADOS = {
    activa: { clase: 'badge-confirmada', etiqueta: 'Activa' },
    cancelada: { clase: 'badge-cancelada', etiqueta: 'Cancelada' },
    completada: { clase: 'badge-completada', etiqueta: 'Completada' },
  };

  var pagina = 1;
  var total = 0;
  var seleccionada = null;

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

  function idDeLaRuta() {
    var partes = global.location.pathname.split('/').filter(function (parte) {
      return parte.length > 0;
    });

    return partes[partes.length - 1] || '';
  }

  function pintarFila(reservacion, plantilla) {
    var fila = plantilla.content.cloneNode(true);
    var titular = reservacion.usuario || {};
    var viaje = reservacion.viaje || {};
    var estado = ESTADOS[reservacion.estado] || ESTADOS.activa;

    var celda = function (clave) {
      return fila.querySelector('[data-cell="' + clave + '"]');
    };

    celda('folio').textContent = reservacion.folio;
    celda('iniciales').textContent = iniciales(titular.nombre);
    celda('cliente').textContent = titular.nombre || 'Cuenta eliminada';
    celda('email').textContent = titular.email || '';
    celda('viaje').textContent = viaje.destino || '';
    celda('creada').textContent = global.Formato.fecha(reservacion.creado_en);
    celda('total').textContent = global.Formato.monedaExacta(reservacion.total);

    var insignia = celda('estado');
    insignia.className = estado.clase;
    insignia.textContent = estado.etiqueta;

    celda('detalle-link').href = '/admin/reservations/' + reservacion.id;

    var boton = fila.querySelector('[data-action="estado"]');
    boton.setAttribute('data-reservation-id', reservacion.id);
    boton.setAttribute('data-reservation-folio', reservacion.folio);
    boton.setAttribute('data-reservation-estado', reservacion.estado);
    boton.setAttribute('aria-label', 'Cambiar el estado de ' + reservacion.folio);

    // Una cancelada ya no admite transiciones: el cupo volvio al catalogo.
    if (reservacion.estado === 'cancelada') {
      boton.remove();
    }

    return fila;
  }

  function pintarPaginacion() {
    var navegacion = documento.getElementById('reservations-pagination');
    var conteo = documento.getElementById('reservations-count');
    var paginas = Math.max(1, Math.ceil(total / LIMITE));

    conteo.textContent =
      total === 0 ? '' : 'Pagina ' + pagina + ' de ' + paginas + ' - ' + total + ' reservaciones';

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
        cargarListado();
      });

      return elemento;
    };

    navegacion.appendChild(boton(pagina - 1, 'Pagina anterior', 'chevron_left', pagina > 1));
    navegacion.appendChild(boton(pagina + 1, 'Pagina siguiente', 'chevron_right', pagina < paginas));
  }

  /* Los totales por estado se piden con limite=1: solo interesa el conteo que
     devuelve la paginacion, no las filas. */
  function cargarEstadisticas() {
    var contar = function (consulta, clave) {
      global.Api.get('/reservations?limite=1' + consulta)
        .then(function (datos) {
          dato(clave, datos.paginacion.total);
        })
        .catch(function () {});
    };

    contar('', 'total');
    contar('&estado=activa', 'activas');
    contar('&estado=completada', 'completadas');
    contar('&estado=cancelada', 'canceladas');
  }

  function cargarListado() {
    var partes = ['limite=' + LIMITE, 'pagina=' + pagina];
    var estado = documento.getElementById('filtro-estado-reserva').value;
    var metodo = documento.getElementById('filtro-metodo').value;
    var desde = documento.getElementById('filtro-desde').value;

    if (estado) {
      partes.push('estado=' + estado);
    }

    if (metodo) {
      partes.push('metodo_pago=' + metodo);
    }

    if (desde) {
      partes.push('desde=' + desde);
    }

    mostrar(documento.getElementById('reservations-loading'), true);
    avisar('reservations-error', '');

    global.Api.get('/reservations?' + partes.join('&'))
      .then(function (datos) {
        mostrar(documento.getElementById('reservations-loading'), false);

        var cuerpo = documento.getElementById('reservations-body');
        var plantilla = documento.getElementById('reservation-row-template');

        cuerpo.innerHTML = '';
        total = datos.paginacion.total;

        datos.reservaciones.forEach(function (reservacion) {
          cuerpo.appendChild(pintarFila(reservacion, plantilla));
        });

        mostrar(documento.getElementById('reservations-empty'), datos.reservaciones.length === 0);
        pintarPaginacion();
      })
      .catch(function (fallo) {
        mostrar(documento.getElementById('reservations-loading'), false);
        avisar('reservations-error', fallo.message);
      });
  }

  function abrirCambioDeEstado(id, folio, estado) {
    var dialogo = documento.getElementById('estado-dialog');

    seleccionada = id;

    dialogo.querySelector('[data-cell="folio"]').textContent = folio;
    documento.getElementById('nuevo-estado').value = estado;

    avisar('estado-error', '');
    dialogo.showModal();
  }

  function conectarCambioDeEstado(alGuardar) {
    var dialogo = documento.getElementById('estado-dialog');
    var formulario = documento.getElementById('estado-form');

    if (!dialogo || !formulario) {
      return;
    }

    documento.getElementById('estado-cancel-btn').addEventListener('click', function () {
      dialogo.close();
    });

    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();

      var boton = formulario.querySelector('button[type="submit"]');
      boton.disabled = true;
      avisar('estado-error', '');

      global.Api.patch('/reservations/' + seleccionada, {
        estado: documento.getElementById('nuevo-estado').value,
      })
        .then(function () {
          boton.disabled = false;
          dialogo.close();
          alGuardar();
        })
        .catch(function (fallo) {
          boton.disabled = false;
          avisar('estado-error', fallo.message);
        });
    });
  }

  function iniciarListado() {
    documento.getElementById('reservations-body').addEventListener('click', function (evento) {
      var boton = evento.target.closest('[data-action="estado"]');

      if (!boton) {
        return;
      }

      abrirCambioDeEstado(
        boton.getAttribute('data-reservation-id'),
        boton.getAttribute('data-reservation-folio'),
        boton.getAttribute('data-reservation-estado')
      );
    });

    ['filtro-estado-reserva', 'filtro-metodo', 'filtro-desde'].forEach(function (id) {
      documento.getElementById(id).addEventListener('change', function () {
        pagina = 1;
        cargarListado();
      });
    });

    documento.getElementById('refrescar').addEventListener('click', function () {
      pagina = 1;
      cargarListado();
      cargarEstadisticas();
    });

    conectarCambioDeEstado(function () {
      avisar('reservations-success', 'El estado de la reservacion se actualizo.');
      cargarListado();
      cargarEstadisticas();
    });

    cargarListado();
    cargarEstadisticas();
  }

  function pintarFicha(reservacion) {
    var titular = reservacion.usuario || {};
    var viaje = reservacion.viaje || {};
    var estado = ESTADOS[reservacion.estado] || ESTADOS.activa;

    var poner = function (clave, valor) {
      documento.querySelectorAll('[data-detail="' + clave + '"]').forEach(function (elemento) {
        elemento.textContent = valor;
      });
    };

    documento.title = 'Reservacion ' + reservacion.folio + ' - TripTicks';

    poner('folio', reservacion.folio);
    poner('creada', global.Formato.fechaHora(reservacion.creado_en));
    poner('metodo', reservacion.metodo_pago === 'paypal' ? 'PayPal' : 'Tarjeta');
    poner('cliente', titular.nombre || 'Cuenta eliminada');
    poner('email', titular.email || '');
    poner('viaje', viaje.titulo || '');
    poner('destino', viaje.destino || '');
    poner('fechas', global.Formato.rangoFechas(viaje.fecha_salida, viaje.fecha_regreso));
    poner('duracion', global.Formato.dias(viaje.duracion_dias));
    poner('precio', global.Formato.monedaExacta(reservacion.precio_unitario));
    poner('impuestos', global.Formato.monedaExacta(reservacion.impuestos));
    poner('total', global.Formato.monedaExacta(reservacion.total));

    documento.querySelectorAll('[data-detail="imagen"]').forEach(function (imagen) {
      imagen.src = viaje.imagen_url || '';
      imagen.alt = viaje.titulo || '';
    });

    documento.querySelectorAll('[data-detail="estado"]').forEach(function (elemento) {
      elemento.className = estado.clase;
      elemento.textContent = estado.etiqueta;
    });

    var boton = documento.getElementById('cambiar-estado-btn');

    if (boton) {
      mostrar(boton, reservacion.estado !== 'cancelada');

      boton.onclick = function () {
        abrirCambioDeEstado(reservacion.id, reservacion.folio, reservacion.estado);
      };
    }
  }

  function iniciarFicha() {
    var cargar = function () {
      global.Api.get('/reservations/' + idDeLaRuta())
        .then(function (datos) {
          pintarFicha(datos.reservacion);
        })
        .catch(function (fallo) {
          avisar('detail-error', fallo.message);
        });
    };

    conectarCambioDeEstado(cargar);
    cargar();
  }

  documento.addEventListener('DOMContentLoaded', function () {
    if (documento.getElementById('reservations-body')) {
      iniciarListado();
      return;
    }

    if (documento.querySelector('[data-detail="folio"]')) {
      iniciarFicha();
    }
  });
})(window);
