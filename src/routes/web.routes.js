'use strict';

const express = require('express');

const tripService = require('../services/trip.service');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');
const { autenticacionOpcional } = require('../middlewares/auth.middleware');
const {
  exponerUsuario,
  requiereSesionWeb,
  requiereAdministradorWeb,
  soloInvitados,
} = require('../middlewares/view.middleware');

// La portada muestra tres viajes destacados y dos proximas salidas.
const VIAJES_EN_PORTADA = 5;

const router = express.Router();

router.use(autenticacionOpcional);
router.use(exponerUsuario);

/* La portada se arma en el servidor porque no tiene filtros ni paginacion: una
   sola consulta y el HTML ya llega con los viajes. Si la base falla, la pagina
   sigue en pie con las secciones vacias en lugar de devolver un error. */
router.get('/', async (req, res) => {
  let viajes = [];

  try {
    const catalogo = await tripService.listarCatalogo({
      soloDisponibles: true,
      limite: VIAJES_EN_PORTADA,
    });

    viajes = catalogo.viajes;
  } catch (error) {
    logger.advertencia('No se pudieron cargar los viajes de la portada', {
      error: error.message,
    });
  }

  return res.render('pages/index', {
    destacados: viajes.slice(0, 3),
    proximos: viajes.slice(3),
  });
});
router.get('/login', soloInvitados, (req, res) => res.render('pages/login'));
router.get('/register', soloInvitados, (req, res) => res.render('pages/register'));

router.get('/trips', (req, res) => res.render('pages/trips'));
router.get('/trips/:id', (req, res) => res.render('pages/trip-detail'));

router.get('/checkout', requiereSesionWeb, (req, res) => res.render('pages/checkout'));
router.get('/reservations', requiereSesionWeb, (req, res) => res.render('pages/reservations'));
router.get('/reservations/exito', requiereSesionWeb, (req, res) =>
  res.render('pages/reservation-success')
);

router.get('/profile', requiereSesionWeb, (req, res) => res.render('pages/profile'));
router.get('/security', requiereSesionWeb, (req, res) => res.render('pages/security'));
router.get('/payment-methods', requiereSesionWeb, (req, res) =>
  res.render('pages/payment-methods')
);

router.use('/admin', requiereAdministradorWeb);

router.get('/admin', (req, res) => res.render('pages/admin/dashboard'));
router.get('/admin/reports', (req, res) => res.render('pages/admin/reports'));
router.get('/admin/trips', (req, res) => res.render('pages/admin/trips'));
router.get('/admin/trips/new', (req, res) => res.render('pages/admin/trip-new'));
// El formulario de edicion se rellena en el servidor: la vista ya conoce al
// administrador y una consulta evita repetir el viaje en una llamada aparte.
router.get(
  '/admin/trips/:id/edit',
  asyncHandler(async (req, res) => {
    const viaje = await tripService.obtenerDetalle(req.params.id);

    return res.render('pages/admin/trip-edit', { viaje });
  })
);
router.get('/admin/users', (req, res) => res.render('pages/admin/users'));
router.get('/admin/users/new', (req, res) => res.render('pages/admin/user-new'));
router.get('/admin/reservations', (req, res) => res.render('pages/admin/reservations'));
router.get('/admin/reservations/:id', (req, res) => res.render('pages/admin/reservation-detail'));

module.exports = router;
