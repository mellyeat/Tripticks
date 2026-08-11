'use strict';

/* Normaliza la cadena de consulta antes de que la miren los validadores.

   Express entrega ?pagina=1&pagina=2 como un arreglo y ?a[b]=c como un objeto.
   Los validadores de express-validator esperan un valor suelto: con un arreglo
   o un objeto, isInt e isIn revientan y la peticion termina en 500. Es decir,
   cualquiera puede provocar un error interno repitiendo un parametro, y el
   registro se llena de fallos que no son del servidor (RF-20).

   Se conserva el ultimo valor, que es lo que hace el resto de la web cuando un
   formulario manda el mismo campo dos veces. Los objetos anidados se descartan:
   ninguna ruta de esta API los usa. */

function aValorSuelto(valor) {
  if (Array.isArray(valor)) {
    const ultimo = valor[valor.length - 1];

    return typeof ultimo === 'string' ? ultimo : '';
  }

  if (valor !== null && typeof valor === 'object') {
    return '';
  }

  return valor;
}

function normalizarConsulta(req, res, next) {
  const original = req.query;

  if (!original) {
    return next();
  }

  const claves = Object.keys(original);

  if (claves.length === 0) {
    return next();
  }

  const normalizado = claves.reduce((salida, clave) => {
    salida[clave] = aValorSuelto(original[clave]);

    return salida;
  }, Object.create(null));

  // En Express 5 req.query es una propiedad de solo lectura sobre el prototipo:
  // hay que redefinirla en la peticion, no asignarla.
  Object.defineProperty(req, 'query', {
    value: normalizado,
    writable: true,
    configurable: true,
    enumerable: true,
  });

  return next();
}

module.exports = normalizarConsulta;
