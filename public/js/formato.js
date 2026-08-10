/**
 * Formato de fechas y montos para las vistas.
 *
 * Lo usan el catalogo, el detalle, las reservaciones y la consola, asi que vive
 * aparte en lugar de repetirse en cada script.
 */
(function (global) {
  'use strict';

  var MESES = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ];

  /* Las columnas de tipo date llegan como "AAAA-MM-DD". Pasarlas por
     new Date(texto) las interpreta en UTC y, al oeste de Greenwich, la fecha
     mostrada se corre un dia hacia atras: se arman a mano en hora local. */
  function aFechaLocal(iso) {
    if (!iso) {
      return null;
    }

    var partes = String(iso).slice(0, 10).split('-');

    if (partes.length !== 3) {
      return null;
    }

    return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  }

  function fecha(iso) {
    var valor = aFechaLocal(iso);

    if (!valor) {
      return '';
    }

    return valor.getDate() + ' ' + MESES[valor.getMonth()] + ' ' + valor.getFullYear();
  }

  /* Cuando salida y regreso caen en el mismo mes y ano, el mes se escribe una
     sola vez: "12 - 18 oct 2026". */
  function rangoFechas(salida, regreso) {
    var desde = aFechaLocal(salida);
    var hasta = aFechaLocal(regreso);

    if (!desde || !hasta) {
      return fecha(salida) || fecha(regreso);
    }

    if (desde.getFullYear() === hasta.getFullYear() && desde.getMonth() === hasta.getMonth()) {
      return (
        desde.getDate() + ' - ' + hasta.getDate() + ' ' +
        MESES[hasta.getMonth()] + ' ' + hasta.getFullYear()
      );
    }

    return fecha(salida) + ' - ' + fecha(regreso);
  }

  function fechaHora(iso) {
    if (!iso) {
      return '';
    }

    var valor = new Date(iso);

    if (isNaN(valor.getTime())) {
      return '';
    }

    var minutos = valor.getMinutes() < 10 ? '0' + valor.getMinutes() : String(valor.getMinutes());

    return fecha(
      valor.getFullYear() + '-' +
      (valor.getMonth() + 1) + '-' +
      valor.getDate()
    ) + ', ' + valor.getHours() + ':' + minutos;
  }

  function separarMiles(entero) {
    return String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function moneda(valor) {
    var numero = Number(valor);

    if (!isFinite(numero)) {
      return '';
    }

    return '$' + separarMiles(Math.round(numero));
  }

  function monedaExacta(valor) {
    var numero = Number(valor);

    if (!isFinite(numero)) {
      return '';
    }

    var partes = Math.abs(numero).toFixed(2).split('.');

    return (numero < 0 ? '-$' : '$') + separarMiles(partes[0]) + '.' + partes[1];
  }

  function dias(cantidad) {
    var numero = Number(cantidad);

    if (!isFinite(numero) || numero < 1) {
      return '';
    }

    return numero === 1 ? '1 dia' : numero + ' dias';
  }

  global.Formato = {
    fecha: fecha,
    rangoFechas: rangoFechas,
    fechaHora: fechaHora,
    moneda: moneda,
    monedaExacta: monedaExacta,
    dias: dias,
  };
})(window);
