/**
 * Detalle de un viaje (RF-07, RF-11, RF-12).
 *
 * El identificador viene en la ruta (/trips/:id). Ademas de pintar el viaje,
 * decide que se ofrece en el panel lateral: reservar, avisar que no quedan
 * cupos o recordar que ya hay una reservacion activa.
 */
(function (global) {
  'use strict';

  var documento = global.document;

  var CUPOS_POCOS = 5;

  function mostrar(elemento, visible) {
    if (elemento) {
      elemento.classList.toggle('hidden', !visible);
    }
  }

  function texto(atributo, valor) {
    documento.querySelectorAll('[data-trip="' + atributo + '"]').forEach(function (elemento) {
      elemento.textContent = valor;
    });
  }

  function idDeLaRuta() {
    var partes = global.location.pathname.split('/').filter(function (parte) {
      return parte.length > 0;
    });

    return partes[partes.length - 1] || '';
  }

  function pintarItinerario(dias) {
    var lista = documento.getElementById('trip-itinerary');

    if (!lista) {
      return;
    }

    lista.innerHTML = '';

    if (!dias || dias.length === 0) {
      var seccion = lista.closest('section');

      if (seccion) {
        seccion.classList.add('hidden');
      }

      return;
    }

    dias.forEach(function (dia, indice) {
      var elemento = documento.createElement('li');
      elemento.className = 'relative pl-12';

      var numero = documento.createElement('div');
      numero.className =
        'absolute left-0 top-1 w-10 h-10 bg-warm-sand rounded-full flex items-center ' +
        'justify-center border-4 border-off-white z-10';

      var etiqueta = documento.createElement('span');
      etiqueta.className = 'font-headline-sm text-body-md text-deep-teal font-semibold';
      etiqueta.textContent = String(dia.dia || indice + 1);
      numero.appendChild(etiqueta);

      var titulo = documento.createElement('h3');
      titulo.className = 'font-headline-sm text-headline-sm text-primary mb-2';
      titulo.textContent = dia.titulo || '';

      var descripcion = documento.createElement('p');
      descripcion.className = 'font-body-md text-body-md text-on-surface-variant';
      descripcion.textContent = dia.descripcion || '';

      elemento.appendChild(numero);
      elemento.appendChild(titulo);
      elemento.appendChild(descripcion);
      lista.appendChild(elemento);
    });
  }

  function pintarDisponibilidad(viaje) {
    var disponibles = Number(viaje.cupos_disponibles);
    var salioYa = viaje.fecha_salida <= new Date().toISOString().slice(0, 10);
    var sePuedeReservar = disponibles > 0 && viaje.activo && !salioYa;

    mostrar(documento.getElementById('availability-none'), !sePuedeReservar);
    mostrar(
      documento.getElementById('availability-warning'),
      sePuedeReservar && disponibles < CUPOS_POCOS
    );

    var boton = documento.getElementById('reserve-btn');

    if (boton) {
      boton.href = '/checkout?viaje=' + viaje.id;
      // data-auth deja visible el boton solo con sesion; sin cupos se retira.
      boton.setAttribute('data-auth', sePuedeReservar ? 'user' : 'ninguno');
    }

    var acceso = documento.getElementById('reserve-login-link');

    if (acceso) {
      acceso.href = '/login?requerida=1&destino=' + encodeURIComponent('/checkout?viaje=' + viaje.id);
      acceso.setAttribute('data-auth', sePuedeReservar ? 'guest' : 'ninguno');
    }

    global.Sesion.aplicarInterfaz();
  }

  /* RF-12: si ya existe una reservacion activa para este viaje, el boton de
     reservar sobra y en su lugar se apunta a la que ya se tiene. */
  function revisarReservacionPrevia(viajeId) {
    if (!global.Sesion.estaAutenticado()) {
      return;
    }

    global.Api.get('/reservations?viaje_id=' + viajeId + '&estado=activa&limite=1')
      .then(function (datos) {
        if (datos.reservaciones.length === 0) {
          return;
        }

        mostrar(documento.getElementById('already-reserved'), true);

        var boton = documento.getElementById('reserve-btn');

        if (boton) {
          boton.setAttribute('data-auth', 'ninguno');
          global.Sesion.aplicarInterfaz();
        }
      })
      .catch(function () {
        // Es informacion complementaria: si falla, la pagina sigue sirviendo.
      });
  }

  function pintar(viaje) {
    documento.title = viaje.titulo + ' - TripTicks';

    texto('titulo', viaje.titulo);
    texto('destino', viaje.destino);
    texto('descripcion', viaje.descripcion);
    texto('precio', global.Formato.moneda(viaje.precio));
    texto('cupos', String(viaje.cupos_disponibles));
    texto('duracion', global.Formato.dias(viaje.duracion_dias));
    texto('fecha-salida', global.Formato.fecha(viaje.fecha_salida));
    texto('fecha-regreso', global.Formato.fecha(viaje.fecha_regreso));
    texto('fechas', global.Formato.rangoFechas(viaje.fecha_salida, viaje.fecha_regreso));

    documento.querySelectorAll('[data-trip="imagen"]').forEach(function (imagen) {
      imagen.src = viaje.imagen_url;
      imagen.alt = viaje.titulo;
    });

    pintarItinerario(viaje.itinerario);
    pintarDisponibilidad(viaje);
    revisarReservacionPrevia(viaje.id);
  }

  documento.addEventListener('DOMContentLoaded', function () {
    var error = documento.getElementById('trip-error');

    if (!error) {
      return;
    }

    global.Api.get('/trips/' + idDeLaRuta())
      .then(function (datos) {
        pintar(datos.viaje);
      })
      .catch(function (fallo) {
        var mensaje = documento.getElementById('trip-error-message');

        if (mensaje) {
          mensaje.textContent = fallo.message;
        }

        mostrar(error, true);
      });
  });
})(window);
