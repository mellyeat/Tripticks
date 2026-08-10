/**
 * Reservaciones del viajero: listado y cancelacion (RF-08 a RF-10), pantalla de
 * confirmacion y comprobante.
 *
 * Las tres vistas comparten datos y formato, asi que van en un mismo archivo;
 * cada bloque se activa solo si los elementos de su vista estan presentes.
 */
(function (global) {
  'use strict';

  var documento = global.document;

  var TASA_IMPUESTO = 0.16;

  var ESTADOS = {
    activa: { clase: 'badge-confirmada', etiqueta: 'Confirmada' },
    cancelada: { clase: 'badge-cancelada', etiqueta: 'Cancelada' },
    completada: { clase: 'badge-completada', etiqueta: 'Completada' },
  };

  var reservaciones = [];
  var filtroActual = 'proximas';

  function mostrar(elemento, visible) {
    if (elemento) {
      elemento.classList.toggle('hidden', !visible);
    }
  }

  function parametro(nombre) {
    return new global.URLSearchParams(global.location.search).get(nombre);
  }

  function hoyISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function fechaSalidaDe(reservacion) {
    return reservacion.viaje ? reservacion.viaje.fecha_salida : '';
  }

  /* Las pestanas de la vista no coinciden con los estados de la base: "pasadas"
     mezcla las completadas con las que siguen activas pero cuyo viaje ya salio.
     La fecha se compara aqui porque la API filtra por estado, no por calendario. */
  function corresponde(reservacion, filtro) {
    if (filtro === 'canceladas') {
      return reservacion.estado === 'cancelada';
    }

    var yaSalio = fechaSalidaDe(reservacion) < hoyISO();

    if (filtro === 'pasadas') {
      return reservacion.estado === 'completada' ||
        (reservacion.estado === 'activa' && yaSalio);
    }

    return reservacion.estado === 'activa' && !yaSalio;
  }

  function pintarTarjeta(reservacion, plantilla) {
    var tarjeta = plantilla.content.cloneNode(true);
    var viaje = reservacion.viaje || {};
    var estado = ESTADOS[reservacion.estado] || ESTADOS.activa;

    var imagen = tarjeta.querySelector('[data-reservation="imagen"]');
    imagen.src = viaje.imagen_url || '';
    imagen.alt = viaje.titulo || '';

    var insignia = tarjeta.querySelector('[data-reservation="estado"]');
    insignia.classList.add(estado.clase);
    insignia.textContent = estado.etiqueta;

    tarjeta.querySelector('[data-reservation="titulo"]').textContent = viaje.titulo || '';
    tarjeta.querySelector('[data-reservation="folio"]').textContent = reservacion.folio;
    tarjeta.querySelector('[data-reservation="total"]').textContent = global.Formato.moneda(
      reservacion.total
    );
    tarjeta.querySelector('[data-reservation="fechas"]').textContent = global.Formato.rangoFechas(
      viaje.fecha_salida,
      viaje.fecha_regreso
    );

    tarjeta.querySelector('[data-reservation="detalle-link"]').href = '/trips/' + reservacion.viaje_id;

    var cancelar = tarjeta.querySelector('[data-action="cancelar"]');

    // Solo se cancela lo que sigue activo y no ha salido (RF-09).
    if (reservacion.estado !== 'activa' || fechaSalidaDe(reservacion) < hoyISO()) {
      cancelar.remove();
    } else {
      cancelar.setAttribute('data-reservation-id', reservacion.id);
      cancelar.setAttribute('data-reservation-titulo', viaje.titulo || '');
    }

    return tarjeta;
  }

  function pintarListado() {
    var grid = documento.getElementById('reservations-grid');
    var plantilla = documento.getElementById('reservation-card-template');
    var vacio = documento.getElementById('reservations-empty');

    var visibles = reservaciones.filter(function (reservacion) {
      return corresponde(reservacion, filtroActual);
    });

    grid.innerHTML = '';

    visibles.forEach(function (reservacion) {
      grid.appendChild(pintarTarjeta(reservacion, plantilla));
    });

    mostrar(vacio, visibles.length === 0);
  }

  function conectarPestanas() {
    documento.querySelectorAll('[data-filter]').forEach(function (pestana) {
      pestana.addEventListener('click', function () {
        filtroActual = pestana.getAttribute('data-filter');

        documento.querySelectorAll('[data-filter]').forEach(function (otra) {
          var activa = otra === pestana;

          otra.classList.toggle('tab-active', activa);
          otra.classList.toggle('tab', !activa);
          otra.setAttribute('aria-selected', String(activa));
        });

        pintarListado();
      });
    });
  }

  function conectarCancelacion() {
    var dialogo = documento.getElementById('cancel-dialog');
    var confirmar = documento.getElementById('confirm-cancel-btn');
    var grid = documento.getElementById('reservations-grid');

    if (!dialogo || !confirmar || !grid) {
      return;
    }

    var seleccionada = null;

    grid.addEventListener('click', function (evento) {
      var boton = evento.target.closest('[data-action="cancelar"]');

      if (!boton) {
        return;
      }

      seleccionada = boton.getAttribute('data-reservation-id');

      var nombre = dialogo.querySelector('[data-reservation="titulo"]');

      if (nombre) {
        nombre.textContent = boton.getAttribute('data-reservation-titulo') || 'este viaje';
      }

      mostrar(documento.getElementById('cancel-error'), false);
      dialogo.showModal();
    });

    confirmar.addEventListener('click', function () {
      if (!seleccionada) {
        return;
      }

      confirmar.disabled = true;

      global.Api.patch('/reservations/' + seleccionada, { estado: 'cancelada' })
        .then(function () {
          confirmar.disabled = false;
          dialogo.close();
          cargarListado();
        })
        .catch(function (fallo) {
          confirmar.disabled = false;

          var mensaje = documento.getElementById('cancel-error-message');

          if (mensaje) {
            mensaje.textContent = fallo.message;
          }

          mostrar(documento.getElementById('cancel-error'), true);
        });
    });
  }

  function cargarListado() {
    var cargando = documento.getElementById('reservations-loading');
    var error = documento.getElementById('reservations-error');
    var grid = documento.getElementById('reservations-grid');

    grid.innerHTML = '';
    mostrar(cargando, true);
    mostrar(error, false);
    mostrar(documento.getElementById('reservations-empty'), false);

    global.Api.get('/reservations?limite=50')
      .then(function (datos) {
        mostrar(cargando, false);
        reservaciones = datos.reservaciones;
        pintarListado();
      })
      .catch(function (fallo) {
        mostrar(cargando, false);

        var mensaje = documento.getElementById('reservations-error-message');

        if (mensaje) {
          mensaje.textContent = fallo.message;
        }

        mostrar(error, true);
      });
  }

  function pintarViaje(viaje) {
    documento.querySelectorAll('[data-trip="titulo"]').forEach(function (elemento) {
      elemento.textContent = viaje.titulo;
    });

    documento.querySelectorAll('[data-trip="destino"]').forEach(function (elemento) {
      elemento.textContent = viaje.destino;
    });

    documento.querySelectorAll('[data-trip="cupos"]').forEach(function (elemento) {
      elemento.textContent = String(viaje.cupos_disponibles);
    });

    documento.querySelectorAll('[data-trip="duracion"]').forEach(function (elemento) {
      elemento.textContent = global.Formato.dias(viaje.duracion_dias);
    });

    documento.querySelectorAll('[data-trip="fechas"]').forEach(function (elemento) {
      elemento.textContent = global.Formato.rangoFechas(viaje.fecha_salida, viaje.fecha_regreso);
    });

    documento.querySelectorAll('[data-trip="imagen"]').forEach(function (imagen) {
      imagen.src = viaje.imagen_url;
      imagen.alt = viaje.titulo;
    });
  }

  /* El desglose se calcula tambien aqui para que el usuario vea el total antes
     de confirmar. El importe que se cobra es el que calcula la base al crear la
     reservacion; este es solo el anticipo visual, con la misma tasa. */
  function pintarDesglose(precio) {
    var impuestos = Number(precio) * TASA_IMPUESTO;

    var asignar = function (clave, valor) {
      var elemento = documento.querySelector('[data-checkout="' + clave + '"]');

      if (elemento) {
        elemento.textContent = global.Formato.monedaExacta(valor);
      }
    };

    asignar('subtotal', precio);
    asignar('impuestos', impuestos);
    asignar('total', Number(precio) + impuestos);
  }

  function metodoElegido() {
    var elegido = documento.querySelector('[name="metodo_pago"]:checked');

    return elegido ? elegido.value : 'tarjeta';
  }

  function iniciarCheckout() {
    var boton = documento.getElementById('confirm-reservation-btn');
    var viajeId = parametro('viaje');
    var error = documento.getElementById('checkout-error');

    var fallar = function (mensaje) {
      var salida = documento.getElementById('checkout-error-message');

      if (salida) {
        salida.textContent = mensaje;
      }

      mostrar(error, true);
    };

    if (!viajeId) {
      boton.disabled = true;
      fallar('No indicaste que viaje quieres reservar.');
      return;
    }

    var volver = documento.getElementById('back-link');

    if (volver) {
      volver.href = '/trips/' + viajeId;
    }

    var usuario = global.Sesion.obtenerUsuario();

    if (usuario) {
      documento.querySelectorAll('[data-user="correo"]').forEach(function (elemento) {
        elemento.textContent = usuario.email;
      });
    }

    global.Api.get('/trips/' + viajeId)
      .then(function (datos) {
        pintarViaje(datos.viaje);
        pintarDesglose(datos.viaje.precio);

        if (Number(datos.viaje.cupos_disponibles) < 1) {
          boton.disabled = true;
          fallar('Este viaje ya no tiene cupos disponibles.');
        }
      })
      .catch(function (fallo) {
        boton.disabled = true;
        fallar(fallo.message);
      });

    boton.addEventListener('click', function () {
      boton.disabled = true;
      mostrar(error, false);

      global.Api.post('/reservations', { viaje_id: viajeId, metodo_pago: metodoElegido() })
        .then(function (datos) {
          global.location.href = '/reservations/exito?id=' + datos.reservacion.id;
        })
        .catch(function (fallo) {
          boton.disabled = false;
          fallar(fallo.message);
        });
    });
  }

  function iniciarComprobante() {
    var id = parametro('id');

    if (!id) {
      return;
    }

    global.Api.get('/reservations/' + id)
      .then(function (datos) {
        var reservacion = datos.reservacion;

        documento.querySelectorAll('[data-reservation="folio"]').forEach(function (elemento) {
          elemento.textContent = reservacion.folio;
        });

        if (reservacion.viaje) {
          pintarViaje(reservacion.viaje);
        }
      })
      .catch(function () {
        // El comprobante ya confirmo la reservacion; si no se puede releer, el
        // listado de "Mis reservaciones" sigue siendo la fuente de verdad.
      });
  }

  documento.addEventListener('DOMContentLoaded', function () {
    if (documento.getElementById('reservations-grid')) {
      conectarPestanas();
      conectarCancelacion();
      cargarListado();
      return;
    }

    if (documento.getElementById('confirm-reservation-btn')) {
      iniciarCheckout();
      return;
    }

    iniciarComprobante();
  });
})(window);
