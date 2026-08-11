'use strict';

const { body, param, query } = require('express-validator');

const {
  ESTADOS_RESERVACION,
  METODOS_PAGO,
  PAGINACION,
} = require('../config/constants');

const FORMATO_FECHA = { format: 'YYYY-MM-DD', strictMode: true };

const reglasId = [
  param('id').isUUID().withMessage('El identificador de la reservacion no es valido.'),
];

const reglasListar = [
  query('usuario_id')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('El identificador del usuario no es valido.'),

  query('viaje_id')
    .optional({ values: 'falsy' })
    .isUUID()
    .withMessage('El identificador del viaje no es valido.'),

  query('estado')
    .optional({ values: 'falsy' })
    .isIn(Object.values(ESTADOS_RESERVACION))
    .withMessage('El estado de la reservacion no es valido.'),

  query('metodo_pago')
    .optional({ values: 'falsy' })
    .isIn(Object.values(METODOS_PAGO))
    .withMessage('El metodo de pago no es valido.'),

  query('desde')
    .optional({ values: 'falsy' })
    .isDate(FORMATO_FECHA)
    .withMessage('La fecha inicial debe tener el formato AAAA-MM-DD.'),

  query('hasta')
    .optional({ values: 'falsy' })
    .isDate(FORMATO_FECHA)
    .withMessage('La fecha final debe tener el formato AAAA-MM-DD.'),

  query('pagina')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('La pagina debe ser un numero entero mayor a cero.'),

  query('limite')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: PAGINACION.LIMITE_MAXIMO })
    .withMessage(`El limite debe ser un numero entre 1 y ${PAGINACION.LIMITE_MAXIMO}.`),
];

const reglasCrear = [
  body('viaje_id')
    .notEmpty()
    .withMessage('El viaje es obligatorio.')
    .isUUID()
    .withMessage('El identificador del viaje no es valido.'),

  body('metodo_pago')
    .optional()
    .isIn(Object.values(METODOS_PAGO))
    .withMessage('El metodo de pago debe ser tarjeta o paypal.'),
];

const reglasCambiarEstado = [
  body('estado')
    .notEmpty()
    .withMessage('El estado es obligatorio.')
    .isIn(Object.values(ESTADOS_RESERVACION))
    .withMessage('El estado debe ser activa, cancelada o completada.'),
];

module.exports = { reglasId, reglasListar, reglasCrear, reglasCambiarEstado };
