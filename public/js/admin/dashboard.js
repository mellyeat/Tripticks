/**
 * Panel de administracion (RF-16).
 *
 * Una sola llamada a /api/dashboard trae los totales, el ranking por demanda y
 * las ultimas reservaciones.
 */
(function (global) {
  'use strict';

  var documento = global.document;

  var ESTADOS = {
    activa: { clase: 'badge-confirmada', etiqueta: 'Activa' },
    cancelada: { clase: 'badge-cancelada', etiqueta: 'Cancelada' },
    completada: { clase: 'badge-completada', etiqueta: 'Completada' },
  };

  function mostrar(elemento, visible) {
    if (elemento) {
      elemento.classList.toggle('hidden', !visible);
    }
  }

  function dato(clave, valor) {
    var elemento = documento.querySelector('[data-stat="' + clave + '"]');

    if (elemento) {
      elemento.textContent = valor;
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

  function pintarTotales(totales) {
    dato('usuarios', String(totales.usuarios));
    dato('viajes', String(totales.viajes));
    dato('reservaciones', String(totales.reservaciones));
    dato('ingresos', global.Formato.monedaExacta(totales.ingresos));
  }

  /* Las barras se dibujan en porcentaje respecto al viaje mas reservado. Si
     nadie ha reservado todavia, todas medirian lo mismo y el grafico no diria
     nada: en ese caso se muestra el aviso de que no hay nada que medir. */
  function pintarDemanda(demanda) {
    var grafico = documento.getElementById('demand-chart');
    var etiquetas = documento.getElementById('demand-labels');
    var vacio = documento.getElementById('demand-empty');

    grafico.innerHTML = '';
    etiquetas.innerHTML = '';

    var maximo = demanda.reduce(function (mayor, viaje) {
      return Math.max(mayor, viaje.reservaciones);
    }, 0);

    if (maximo === 0) {
      mostrar(grafico, false);
      mostrar(etiquetas, false);
      mostrar(vacio, true);
      dato('demanda-titulo', 'Sin reservaciones');
      dato('demanda-conteo', '');
      return;
    }

    mostrar(grafico, true);
    mostrar(etiquetas, true);
    mostrar(vacio, false);

    var descripcion = [];

    demanda.forEach(function (viaje, indice) {
      var barra = documento.createElement('div');
      barra.className = indice === 0 ? 'chart-bar-top' : 'chart-bar';
      barra.style.height = Math.max(4, Math.round((viaje.reservaciones / maximo) * 100)) + '%';
      grafico.appendChild(barra);

      var etiqueta = documento.createElement('li');
      etiqueta.className = 'flex-1 font-body-sm text-body-sm text-warm-gray truncate';
      etiqueta.textContent = viaje.destino || viaje.titulo;
      etiqueta.title = viaje.titulo;
      etiquetas.appendChild(etiqueta);

      descripcion.push(viaje.titulo + ' ' + viaje.reservaciones);
    });

    grafico.setAttribute('aria-label', 'Reservaciones activas por viaje: ' + descripcion.join(', '));

    dato('demanda-titulo', demanda[0].destino || demanda[0].titulo);
    dato(
      'demanda-conteo',
      demanda[0].reservaciones === 1 ? '1 reservacion' : demanda[0].reservaciones + ' reservaciones'
    );
  }

  function pintarRecientes(recientes) {
    var cuerpo = documento.getElementById('recent-body');
    var plantilla = documento.getElementById('recent-row-template');

    cuerpo.innerHTML = '';
    mostrar(documento.getElementById('recent-empty'), recientes.length === 0);

    recientes.forEach(function (reservacion) {
      var fila = plantilla.content.cloneNode(true);
      var titular = reservacion.usuario || {};
      var viaje = reservacion.viaje || {};
      var estado = ESTADOS[reservacion.estado] || ESTADOS.activa;

      var celda = function (clave) {
        return fila.querySelector('[data-cell="' + clave + '"]');
      };

      celda('iniciales').textContent = iniciales(titular.nombre);
      celda('cliente').textContent = titular.nombre || 'Cuenta eliminada';
      celda('folio').textContent = reservacion.folio;
      celda('viaje').textContent = viaje.destino || '';
      celda('fecha').textContent = global.Formato.fecha(reservacion.creado_en);
      celda('total').textContent = global.Formato.monedaExacta(reservacion.total);

      var insignia = celda('estado');
      insignia.className = estado.clase;
      insignia.textContent = estado.etiqueta;

      celda('detalle-link').href = '/admin/reservations/' + reservacion.id;

      cuerpo.appendChild(fila);
    });
  }

  /* El reporte reusa la misma respuesta que el panel: son las mismas columnas
     agregadas, solo cambia como se presentan. El promedio se saca aqui porque
     es division de dos totales que ya vienen en la respuesta. */
  function pintarReporte(datos) {
    var cuerpo = documento.getElementById('report-body');
    var plantilla = documento.getElementById('report-row-template');
    var totales = datos.totales;

    dato('ingresos', global.Formato.monedaExacta(totales.ingresos));
    dato('reservaciones', String(totales.reservaciones));
    dato('activas', String(totales.reservacionesActivas));
    dato(
      'promedio',
      totales.reservaciones > 0
        ? global.Formato.monedaExacta(totales.ingresos / totales.reservaciones)
        : global.Formato.monedaExacta(0)
    );

    cuerpo.innerHTML = '';
    mostrar(documento.getElementById('report-empty'), datos.demanda.length === 0);

    datos.demanda.forEach(function (viaje) {
      var fila = plantilla.content.cloneNode(true);
      var ocupados = Number(viaje.cupos_totales) - Number(viaje.cupos_disponibles);

      var celda = function (clave) {
        return fila.querySelector('[data-cell="' + clave + '"]');
      };

      celda('titulo').textContent = viaje.titulo;
      celda('destino').textContent = viaje.destino;
      celda('reservaciones').textContent = String(viaje.reservaciones);
      celda('ocupacion').textContent = ocupados + ' / ' + viaje.cupos_totales;

      cuerpo.appendChild(fila);
    });
  }

  documento.addEventListener('DOMContentLoaded', function () {
    var esPanel = Boolean(documento.getElementById('recent-body'));
    var esReporte = Boolean(documento.getElementById('report-body'));

    if (!esPanel && !esReporte) {
      return;
    }

    global.Api.get('/dashboard')
      .then(function (datos) {
        if (esReporte) {
          pintarReporte(datos);
          return;
        }

        pintarTotales(datos.totales);
        pintarDemanda(datos.demanda);
        pintarRecientes(datos.recientes);
      })
      .catch(function (fallo) {
        var mensaje = documento.getElementById('dashboard-error-message');

        if (mensaje) {
          mensaje.textContent = fallo.message;
        }

        mostrar(documento.getElementById('dashboard-error'), true);
      });
  });
})(window);
