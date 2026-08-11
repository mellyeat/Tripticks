'use strict';

const ApiError = require('../utils/apiError');
const logger = require('../config/logger');

/* Cupo de peticiones por IP, contado en memoria.
   Es suficiente mientras la aplicacion corra en una sola instancia, que es el
   caso del despliegue actual. Con varias replicas cada una llevaria su propia
   cuenta y el limite real seria el cupo multiplicado por el numero de replicas:
   ahi habria que mover el contador a un almacen compartido (Redis) o delegarlo
   al proxy de entrada. */
const contadores = new Map();

// Sin esto el mapa crece con cada IP que haya pasado alguna vez. Se limpia al
// vuelo cuando ya hay muchas llaves, sin temporizadores que mantengan vivo el
// proceso durante las pruebas.
const LLAVES_ANTES_DE_LIMPIAR = 5000;

function limpiarVencidos(ahora) {
  contadores.forEach((valor, llave) => {
    if (ahora > valor.expira) {
      contadores.delete(llave);
    }
  });
}

function limitar({ nombre, maximo, ventanaMs, mensaje }) {
  return function limitador(req, res, next) {
    const ahora = Date.now();

    if (contadores.size > LLAVES_ANTES_DE_LIMPIAR) {
      limpiarVencidos(ahora);
    }

    const llave = `${nombre}:${req.ip}`;
    const actual = contadores.get(llave);

    if (!actual || ahora > actual.expira) {
      contadores.set(llave, { conteo: 1, expira: ahora + ventanaMs });
      return next();
    }

    actual.conteo += 1;

    if (actual.conteo > maximo) {
      const segundos = Math.max(1, Math.ceil((actual.expira - ahora) / 1000));

      res.set('Retry-After', String(segundos));

      logger.advertencia('Cupo de peticiones agotado', {
        cupo: nombre,
        ruta: req.originalUrl,
        metodo: req.method,
      });

      return next(ApiError.demasiadasPeticiones(mensaje));
    }

    return next();
  };
}

// Las pruebas comparten el proceso: sin reiniciar entre archivos, el cupo de un
// caso se le descontaria al siguiente.
function reiniciar() {
  contadores.clear();
}

module.exports = { limitar, reiniciar };
