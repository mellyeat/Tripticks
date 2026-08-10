'use strict';

const { body, param, query } = require('express-validator');

const { ORDENES_VIAJE, PAGINACION } = require('../config/constants');
const { esProduccion } = require('../config/env');

const FORMATO_FECHA = { format: 'YYYY-MM-DD', strictMode: true };

/* En produccion la pagina se sirve por https y una imagen por http la degrada a
   contenido mixto: el navegador la bloquea o marca el sitio como inseguro. En
   local se admite http para poder trabajar sin certificado. */
const FORMATO_IMAGEN = {
  protocols: esProduccion ? ['https'] : ['http', 'https'],
  require_protocol: true,
};

const MENSAJE_IMAGEN = esProduccion
  ? 'La imagen debe ser una direccion web segura (https).'
  : 'La imagen debe ser una direccion web valida.';

const reglasId = [
  param('id').isUUID().withMessage('El identificador del viaje no es valido.'),
];

const reglasListar = [
  query('destino')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('El destino de busqueda es demasiado largo.'),

  query('precio_max')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('El precio maximo debe ser un numero mayor o igual a cero.'),

  query('salida')
    .optional({ values: 'falsy' })
    .isDate(FORMATO_FECHA)
    .withMessage('La fecha de salida debe tener el formato AAAA-MM-DD.'),

  query('regreso')
    .optional({ values: 'falsy' })
    .isDate(FORMATO_FECHA)
    .withMessage('La fecha de regreso debe tener el formato AAAA-MM-DD.'),

  query('orden')
    .optional({ values: 'falsy' })
    .isIn(Object.values(ORDENES_VIAJE))
    .withMessage('El criterio de orden no es valido.'),

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
  body('titulo')
    .trim()
    .notEmpty()
    .withMessage('El titulo es obligatorio.')
    .isLength({ min: 5, max: 150 })
    .withMessage('El titulo debe tener entre 5 y 150 caracteres.'),

  body('destino')
    .trim()
    .notEmpty()
    .withMessage('El destino es obligatorio.')
    .isLength({ min: 3, max: 120 })
    .withMessage('El destino debe tener entre 3 y 120 caracteres.'),

  body('descripcion')
    .trim()
    .notEmpty()
    .withMessage('La descripcion es obligatoria.')
    .isLength({ min: 20, max: 2000 })
    .withMessage('La descripcion debe tener entre 20 y 2000 caracteres.'),

  body('itinerario')
    .optional()
    .isArray({ max: 60 })
    .withMessage('El itinerario debe ser una lista de hasta 60 dias.'),

  body('itinerario.*.dia')
    .isInt({ min: 1, max: 365 })
    .withMessage('Cada dia del itinerario debe ser un numero entero mayor a cero.'),

  body('itinerario.*.titulo')
    .trim()
    .notEmpty()
    .withMessage('Cada dia del itinerario necesita un titulo.')
    .isLength({ max: 150 })
    .withMessage('El titulo de un dia del itinerario no puede pasar de 150 caracteres.'),

  body('itinerario.*.descripcion')
    .trim()
    .notEmpty()
    .withMessage('Cada dia del itinerario necesita una descripcion.')
    .isLength({ max: 1000 })
    .withMessage('La descripcion de un dia del itinerario no puede pasar de 1000 caracteres.'),

  body('precio')
    .notEmpty()
    .withMessage('El precio es obligatorio.')
    .isFloat({ min: 0.01, max: 99999999.99 })
    .withMessage('El precio debe ser un numero mayor a cero.'),

  body('fecha_salida')
    .notEmpty()
    .withMessage('La fecha de salida es obligatoria.')
    .isDate(FORMATO_FECHA)
    .withMessage('La fecha de salida debe tener el formato AAAA-MM-DD.'),

  body('fecha_regreso')
    .notEmpty()
    .withMessage('La fecha de regreso es obligatoria.')
    .isDate(FORMATO_FECHA)
    .withMessage('La fecha de regreso debe tener el formato AAAA-MM-DD.'),

  body('cupos_totales')
    .notEmpty()
    .withMessage('Los cupos totales son obligatorios.')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Los cupos totales deben ser un numero entero mayor a cero.'),

  body('cupos_disponibles')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('Los cupos disponibles deben ser un numero entero mayor o igual a cero.'),

  body('imagen_url')
    .trim()
    .notEmpty()
    .withMessage('La imagen del viaje es obligatoria.')
    .isURL(FORMATO_IMAGEN)
    .withMessage(MENSAJE_IMAGEN)
    .isLength({ max: 500 })
    .withMessage('La direccion de la imagen es demasiado larga.'),

  body('activo')
    .optional()
    .isBoolean({ strict: true })
    .withMessage('El campo activo debe ser verdadero o falso.'),
];

const reglasActualizar = [
  body('titulo')
    .optional()
    .trim()
    .isLength({ min: 5, max: 150 })
    .withMessage('El titulo debe tener entre 5 y 150 caracteres.'),

  body('destino')
    .optional()
    .trim()
    .isLength({ min: 3, max: 120 })
    .withMessage('El destino debe tener entre 3 y 120 caracteres.'),

  body('descripcion')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('La descripcion debe tener entre 20 y 2000 caracteres.'),

  body('itinerario')
    .optional()
    .isArray({ max: 60 })
    .withMessage('El itinerario debe ser una lista de hasta 60 dias.'),

  body('itinerario.*.dia')
    .isInt({ min: 1, max: 365 })
    .withMessage('Cada dia del itinerario debe ser un numero entero mayor a cero.'),

  body('itinerario.*.titulo')
    .trim()
    .notEmpty()
    .withMessage('Cada dia del itinerario necesita un titulo.')
    .isLength({ max: 150 })
    .withMessage('El titulo de un dia del itinerario no puede pasar de 150 caracteres.'),

  body('itinerario.*.descripcion')
    .trim()
    .notEmpty()
    .withMessage('Cada dia del itinerario necesita una descripcion.')
    .isLength({ max: 1000 })
    .withMessage('La descripcion de un dia del itinerario no puede pasar de 1000 caracteres.'),

  body('precio')
    .optional()
    .isFloat({ min: 0.01, max: 99999999.99 })
    .withMessage('El precio debe ser un numero mayor a cero.'),

  body('fecha_salida')
    .optional()
    .isDate(FORMATO_FECHA)
    .withMessage('La fecha de salida debe tener el formato AAAA-MM-DD.'),

  body('fecha_regreso')
    .optional()
    .isDate(FORMATO_FECHA)
    .withMessage('La fecha de regreso debe tener el formato AAAA-MM-DD.'),

  body('cupos_totales')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Los cupos totales deben ser un numero entero mayor a cero.'),

  body('cupos_disponibles')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('Los cupos disponibles deben ser un numero entero mayor o igual a cero.'),

  body('imagen_url')
    .optional()
    .trim()
    .isURL(FORMATO_IMAGEN)
    .withMessage(MENSAJE_IMAGEN)
    .isLength({ max: 500 })
    .withMessage('La direccion de la imagen es demasiado larga.'),

  body('activo')
    .optional()
    .isBoolean({ strict: true })
    .withMessage('El campo activo debe ser verdadero o falso.'),
];

module.exports = { reglasId, reglasListar, reglasCrear, reglasActualizar };
