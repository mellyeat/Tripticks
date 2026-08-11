'use strict';

const request = require('supertest');

jest.mock('../../src/models/dashboard.model');
jest.mock('../../src/models/reservation.model');
jest.mock('../../src/models/user.model');

const dashboardModel = require('../../src/models/dashboard.model');
const reservationModel = require('../../src/models/reservation.model');
const userModel = require('../../src/models/user.model');
const app = require('../../src/app');
const jwtUtil = require('../../src/utils/jwt.util');

const ADMINISTRADOR = {
  id: 'a1b2c3d4-0000-4000-8000-000000000001',
  nombre: 'Administrador TripTicks',
  email: 'admin@tripticks.com',
  rol: 'administrador',
  activo: true,
};

const USUARIO = {
  id: 'a1b2c3d4-0000-4000-8000-000000000002',
  nombre: 'Ana Martinez',
  email: 'ana@ejemplo.com',
  rol: 'usuario',
  activo: true,
};

// La base entrega los conteos y las sumas de jsonb como cadenas.
const ESTADISTICAS = {
  usuarios: '48',
  usuarios_activos: '45',
  administradores: '2',
  viajes: '6',
  viajes_activos: '6',
  reservaciones: '12',
  reservaciones_activas: '9',
  ingresos: '28420.00',
  demanda: [
    {
      id: '10000000-0000-4000-8000-000000000001',
      titulo: 'Retiro Alpino Exclusivo en los Dolomitas',
      destino: 'Dolomitas, Italia',
      reservaciones: '8',
    },
  ],
};

function tokenDe(usuario) {
  userModel.buscarPorId.mockResolvedValue(usuario);

  return jwtUtil.firmar(usuario);
}

describe('GET /api/dashboard (RF-16)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    dashboardModel.obtenerEstadisticas.mockResolvedValue(ESTADISTICAS);
    reservationModel.listar.mockResolvedValue({ reservaciones: [], total: 0 });
  });

  it('rechaza la peticion sin token', async () => {
    const respuesta = await request(app).get('/api/dashboard');

    expect(respuesta.status).toBe(401);
  });

  it('niega el acceso a un usuario sin rol de administrador', async () => {
    const token = tokenDe(USUARIO);

    const respuesta = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(403);
    expect(dashboardModel.obtenerEstadisticas).not.toHaveBeenCalled();
  });

  it('devuelve los totales como numeros y no como cadenas', async () => {
    const token = tokenDe(ADMINISTRADOR);

    const respuesta = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.totales).toEqual({
      usuarios: 48,
      usuariosActivos: 45,
      administradores: 2,
      viajes: 6,
      viajesActivos: 6,
      reservaciones: 12,
      reservacionesActivas: 9,
      ingresos: 28420,
    });
  });

  it('devuelve los viajes con mayor demanda', async () => {
    const token = tokenDe(ADMINISTRADOR);

    const respuesta = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.body.datos.demanda[0].reservaciones).toBe(8);
  });

  it('devuelve una demanda vacia cuando todavia no hay reservaciones', async () => {
    const token = tokenDe(ADMINISTRADOR);
    dashboardModel.obtenerEstadisticas.mockResolvedValue({ ...ESTADISTICAS, demanda: [] });

    const respuesta = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.demanda).toEqual([]);
  });
});
