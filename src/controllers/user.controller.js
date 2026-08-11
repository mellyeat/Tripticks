'use strict';

const userService = require('../services/user.service');
const asyncHandler = require('../utils/asyncHandler');
const { exito } = require('../utils/apiResponse');

const listar = asyncHandler(async (req, res) => {
  const { usuarios, paginacion } = await userService.listar({
    rol: req.query.rol,
    activo: req.query.activo,
    busqueda: req.query.busqueda,
    pagina: req.query.pagina,
    limite: req.query.limite,
  });

  return exito(res, { mensaje: 'Usuarios obtenidos.', datos: { usuarios, paginacion } });
});

const detalle = asyncHandler(async (req, res) => {
  const usuario = await userService.obtenerDetalle(req.params.id);

  return exito(res, { mensaje: 'Usuario obtenido.', datos: { usuario } });
});

const crear = asyncHandler(async (req, res) => {
  const usuario = await userService.crear({
    nombre: req.body.nombre,
    email: req.body.email,
    password: req.body.password,
    rol: req.body.rol,
    activo: req.body.activo,
  });

  return exito(res, {
    estado: 201,
    mensaje: 'Usuario creado correctamente.',
    datos: { usuario },
  });
});

const actualizar = asyncHandler(async (req, res) => {
  const usuario = await userService.actualizar(
    req.params.id,
    {
      nombre: req.body.nombre,
      email: req.body.email,
      rol: req.body.rol,
      activo: req.body.activo,
    },
    req.usuario
  );

  return exito(res, { mensaje: 'Usuario actualizado correctamente.', datos: { usuario } });
});

const desactivar = asyncHandler(async (req, res) => {
  const usuario = await userService.desactivar(req.params.id, req.usuario);

  return exito(res, { mensaje: 'Usuario desactivado correctamente.', datos: { usuario } });
});

module.exports = { listar, detalle, crear, actualizar, desactivar };
