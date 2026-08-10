/**
 * Catalogo de viajes (RF-04, RF-05, RF-06).
 *
 * Los filtros son un formulario GET normal: al enviarlo, el servidor vuelve a
 * renderizar la pagina y este script lee la misma cadena de consulta para pedir
 * a la API el tramo que corresponde. Asi la busqueda queda en la URL y se puede
 * compartir o recargar.
 */
(function (global) {
  'use strict';

  var documento = global.document;

  var PARAMETROS = ['destino', 'precio_max', 'salida', 'regreso', 'disponibles', 'orden', 'pagina'];

  var grid = null;
  var plantilla = null;

  function mostrar(elemento, visible) {
    if (elemento) {
      elemento.classList.toggle('hidden', !visible);
    }
  }

  function consultaActual() {
    return new global.URLSearchParams(global.location.search);
  }

  function cadenaDeConsulta(parametros) {
    var partes = [];

    PARAMETROS.forEach(function (nombre) {
      var valor = parametros.get(nombre);

      if (valor) {
        partes.push(nombre + '=' + encodeURIComponent(valor));
      }
    });

    return partes.length > 0 ? '?' + partes.join('&') : '';
  }

  function pintarTarjeta(viaje) {
    var tarjeta = plantilla.content.cloneNode(true);
    var disponibles = Number(viaje.cupos_disponibles);

    var imagen = tarjeta.querySelector('[data-trip="imagen"]');
    imagen.src = viaje.imagen_url;
    imagen.alt = viaje.titulo;

    tarjeta.querySelector('[data-trip="titulo"]').textContent = viaje.titulo;
    tarjeta.querySelector('[data-trip="destino"]').textContent = viaje.destino;
    tarjeta.querySelector('[data-trip="precio"]').textContent = global.Formato.moneda(viaje.precio);
    tarjeta.querySelector('[data-trip="fechas"]').textContent = global.Formato.rangoFechas(
      viaje.fecha_salida,
      viaje.fecha_regreso
    );

    tarjeta.querySelector('[data-trip="cupos"]').textContent =
      disponibles === 0 ? 'Sin cupos' : disponibles + ' cupos';

    // Menos de cinco lugares se marca en tono de alerta, igual que en el detalle.
    if (disponibles < 5) {
      var insignia = tarjeta.querySelector('[data-trip="cupos-badge"]');
      insignia.classList.remove('chip');
      insignia.classList.add('chip-alert');
    }

    var enlace = tarjeta.querySelector('[data-trip="detalle-link"]');
    enlace.href = '/trips/' + viaje.id;
    enlace.setAttribute('aria-label', 'Ver el detalle de ' + viaje.titulo);

    return tarjeta;
  }

  function crearEnlaceDePagina(numero, contenido, etiqueta, activa) {
    var parametros = consultaActual();
    parametros.set('pagina', String(numero));

    var elemento = documento.createElement('a');
    elemento.href = '/trips' + cadenaDeConsulta(parametros);
    elemento.innerHTML = contenido;
    elemento.setAttribute('aria-label', etiqueta);
    elemento.className = activa
      ? 'w-10 h-10 rounded-lg bg-primary text-on-primary font-semibold inline-flex items-center justify-center'
      : 'w-10 h-10 rounded-lg text-on-surface-variant hover:bg-surface-container-high inline-flex items-center justify-center';

    if (activa) {
      elemento.setAttribute('aria-current', 'page');
    }

    return elemento;
  }

  function pintarPaginacion(paginacion) {
    var navegacion = documento.getElementById('trips-pagination');

    if (!navegacion) {
      return;
    }

    navegacion.innerHTML = '';
    mostrar(navegacion, paginacion.paginas > 1);

    if (paginacion.paginas <= 1) {
      return;
    }

    if (paginacion.pagina > 1) {
      navegacion.appendChild(
        crearEnlaceDePagina(
          paginacion.pagina - 1,
          '<span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>',
          'Pagina anterior',
          false
        )
      );
    }

    for (var numero = 1; numero <= paginacion.paginas; numero += 1) {
      navegacion.appendChild(
        crearEnlaceDePagina(numero, String(numero), 'Pagina ' + numero, numero === paginacion.pagina)
      );
    }

    if (paginacion.pagina < paginacion.paginas) {
      navegacion.appendChild(
        crearEnlaceDePagina(
          paginacion.pagina + 1,
          '<span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>',
          'Pagina siguiente',
          false
        )
      );
    }
  }

  function pintarConteo(mostrados, total) {
    var conteo = documento.getElementById('trips-count');

    if (!conteo) {
      return;
    }

    if (total === 0) {
      conteo.textContent = 'No hay viajes que coincidan';
      return;
    }

    conteo.textContent =
      mostrados === total
        ? 'Mostrando ' + total + (total === 1 ? ' viaje' : ' viajes')
        : 'Mostrando ' + mostrados + ' de ' + total + ' viajes';
  }

  function cargar() {
    var cargando = documento.getElementById('trips-loading');
    var error = documento.getElementById('trips-error');
    var vacio = documento.getElementById('trips-empty');

    grid.innerHTML = '';
    mostrar(cargando, true);
    mostrar(error, false);
    mostrar(vacio, false);

    global.Api.get('/trips' + cadenaDeConsulta(consultaActual()))
      .then(function (datos) {
        mostrar(cargando, false);

        datos.viajes.forEach(function (viaje) {
          grid.appendChild(pintarTarjeta(viaje));
        });

        mostrar(vacio, datos.viajes.length === 0);
        pintarConteo(datos.viajes.length, datos.paginacion.total);
        pintarPaginacion(datos.paginacion);
      })
      .catch(function (fallo) {
        mostrar(cargando, false);

        var mensaje = documento.getElementById('trips-error-message');

        if (mensaje) {
          mensaje.textContent = fallo.message;
        }

        mostrar(error, true);
      });
  }

  /* El precio se captura con un control de rango: sin la etiqueta que lo
     acompana no habria forma de saber que valor se esta eligiendo. */
  function conectarPrecio() {
    var rango = documento.getElementById('filtro-precio');
    var etiqueta = documento.getElementById('precio-max-label');

    if (!rango || !etiqueta) {
      return;
    }

    var actualizar = function () {
      etiqueta.textContent = global.Formato.moneda(rango.value);
    };

    rango.addEventListener('input', actualizar);
    actualizar();
  }

  // El orden viaja en la misma cadena de consulta que los filtros.
  function conectarOrden(formulario) {
    var orden = documento.getElementById('orden');

    if (!orden || !formulario) {
      return;
    }

    orden.addEventListener('change', function () {
      var campo = documento.createElement('input');
      campo.type = 'hidden';
      campo.name = 'orden';
      campo.value = orden.value;

      formulario.appendChild(campo);
      formulario.submit();
    });
  }

  function reflejarFiltros(parametros) {
    var asignar = function (id, valor) {
      var campo = documento.getElementById(id);

      if (campo && valor !== null) {
        campo.value = valor;
      }
    };

    asignar('filtro-destino', parametros.get('destino'));
    asignar('filtro-salida', parametros.get('salida'));
    asignar('filtro-regreso', parametros.get('regreso'));
    asignar('filtro-precio', parametros.get('precio_max'));

    var disponibles = documento.querySelector('[name="disponibles"]');

    if (disponibles) {
      disponibles.checked = parametros.get('disponibles') === '1';
    }

    var orden = documento.getElementById('orden');

    if (orden && parametros.get('orden')) {
      orden.value = parametros.get('orden');
    }
  }

  documento.addEventListener('DOMContentLoaded', function () {
    grid = documento.getElementById('trips-grid');
    plantilla = documento.getElementById('trip-card-template');

    if (!grid || !plantilla) {
      return;
    }

    reflejarFiltros(consultaActual());
    conectarPrecio();
    conectarOrden(documento.getElementById('filters-form'));
    cargar();
  });
})(window);
