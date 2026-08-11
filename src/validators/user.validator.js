'use strict';

const { body, param, query } = require('express-validator');

const { ROLES, PAGINACION } = require('../config/constants');
const { sinMarcado } = require('./texto.validator');

const reglasId = [param('id').isUUID().withMessage('El identificador del usuario no es valido.')];

const reglasListar = [
  query('rol')
    .optional({ values: 'falsy' })
    .isIn(Object.values(ROLES))
    .withMessage('El rol no es valido.'),

  query('activo')
    .optional({ values: 'falsy' })
    .isIn(['true', 'false'])
    .withMessage('El estado debe ser true o false.'),

  query('busqueda')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('El criterio de busqueda es demasiado largo.'),

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
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio.')
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres.')
    .custom(sinMarcado),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('El correo electronico es obligatorio.')
    .isEmail()
    .withMessage('El correo electronico no tiene un formato valido.')
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: 255 })
    .withMessage('El correo electronico es demasiado largo.'),

  body('password')
    .notEmpty()
    .withMessage('La contrasena es obligatoria.')
    .isLength({ min: 8, max: 72 })
    .withMessage('La contrasena debe tener entre 8 y 72 caracteres.')
    .matches(/[a-z]/)
    .withMessage('La contrasena debe incluir al menos una letra minuscula.')
    .matches(/[A-Z]/)
    .withMessage('La contrasena debe incluir al menos una letra mayuscula.')
    .matches(/\d/)
    .withMessage('La contrasena debe incluir al menos un numero.'),

  body('rol')
    .optional()
    .isIn(Object.values(ROLES))
    .withMessage('El rol debe ser usuario o administrador.'),

  body('activo')
    .optional()
    .isBoolean({ strict: true })
    .withMessage('El campo activo debe ser verdadero o falso.'),
];

const reglasActualizar = [
  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres.')
    .custom(sinMarcado),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('El correo electronico no tiene un formato valido.')
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: 255 })
    .withMessage('El correo electronico es demasiado largo.'),

  body('rol')
    .optional()
    .isIn(Object.values(ROLES))
    .withMessage('El rol debe ser usuario o administrador.'),

  body('activo')
    .optional()
    .isBoolean({ strict: true })
    .withMessage('El campo activo debe ser verdadero o falso.'),
];

module.exports = { reglasId, reglasListar, reglasCrear, reglasActualizar };
