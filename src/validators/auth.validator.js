'use strict';

const { body } = require('express-validator');

const reglasRegistro = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio.')
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres.'),

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
];

const reglasLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('El correo electronico es obligatorio.')
    .isEmail()
    .withMessage('El correo electronico no tiene un formato valido.')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password').notEmpty().withMessage('La contrasena es obligatoria.'),
];

module.exports = { reglasRegistro, reglasLogin };
