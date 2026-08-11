'use strict';

const request = require('supertest');

jest.mock('../../src/models/reservation.model');
jest.mock('../../src/models/user.model');

const reservationModel = require('../../src/models/reservation.model');
const userModel = require('../../src/models/user.model');
const app = require('../../src/app');
const jwtUtil = require('../../src/utils/jwt.util');
const ApiError = require('../../src/utils/apiError');

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

const OTRO_USUARIO = {
  id: 'a1b2c3d4-0000-4000-8000-000000000003',
  nombre: 'Luis Carrillo',
  email: 'luis@ejemplo.com',
  rol: 'usuario',
  activo: true,
};

const VIAJE_ID = '10000000-0000-4000-8000-000000000001';
const RESERVACION_ID = '20000000-0000-4000-8000-000000000001';

const RESERVACION = {
  id: RESERVACION_ID,
  folio: 'TT-007842',
  usuario_id: USUARIO.id,
  viaje_id: VIAJE_ID,
  estado: 'activa',
  precio_unitario: '2450.00',
  impuestos: '392.00',
  total: '2842.00',
  metodo_pago: 'tarjeta',
  creado_en: '2026-08-01T10:00:00.000Z',
  cancelado_en: null,
};

function tokenDe(usuario) {
  userModel.buscarPorId.mockResolvedValue(usuario);

  return jwtUtil.firmar(usuario);
}

describe('GET /api/reservations (RF-10, RF-15)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    reservationModel.listar.mockResolvedValue({ reservaciones: [RESERVACION], total: 1 });
  });

  it('rechaza la peticion sin token', async () => {
    const respuesta = await request(app).get('/api/reservations');

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.exito).toBe(false);
  });

  it('devuelve las reservaciones del titular con su paginacion', async () => {
    const token = tokenDe(USUARIO);

    const respuesta = await request(app)
      .get('/api/reservations')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.reservaciones).toHaveLength(1);
    expect(respuesta.body.datos.paginacion).toEqual({
      pagina: 1,
      limite: 9,
      total: 1,
      paginas: 1,
    });
  });

  it('acota la consulta de un usuario a sus propias reservaciones', async () => {
    const token = tokenDe(USUARIO);

    await request(app)
      .get(`/api/reservations?usuario_id=${OTRO_USUARIO.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(reservationModel.listar).toHaveBeenCalledWith(
      expect.objectContaining({
        filtros: expect.objectContaining({ usuarioId: USUARIO.id }),
      })
    );
  });

  it('permite al administrador filtrar por titular', async () => {
    const token = tokenDe(ADMINISTRADOR);

    await request(app)
      .get(`/api/reservations?usuario_id=${OTRO_USUARIO.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(reservationModel.listar).toHaveBeenCalledWith(
      expect.objectContaining({
        filtros: expect.objectContaining({ usuarioId: OTRO_USUARIO.id }),
      })
    );
  });

  it('devuelve todas las reservaciones al administrador que no filtra', async () => {
    const token = tokenDe(ADMINISTRADOR);

    await request(app).get('/api/reservations').set('Authorization', `Bearer ${token}`);

    expect(reservationModel.listar).toHaveBeenCalledWith(
      expect.objectContaining({
        filtros: expect.objectContaining({ usuarioId: null }),
      })
    );
  });

  it('rechaza un estado que no existe', async () => {
    const token = tokenDe(USUARIO);

    const respuesta = await request(app)
      .get('/api/reservations?estado=pendiente')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.detalles[0].campo).toBe('estado');
  });
});

describe('GET /api/reservations/:id (RF-10)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('devuelve la reservacion propia', async () => {
    const token = tokenDe(USUARIO);
    reservationModel.buscarPorId.mockResolvedValue(RESERVACION);

    const respuesta = await request(app)
      .get(`/api/reservations/${RESERVACION_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.reservacion.folio).toBe('TT-007842');
  });

  it('niega el acceso a la reservacion de otra persona', async () => {
    const token = tokenDe(OTRO_USUARIO);
    reservationModel.buscarPorId.mockResolvedValue(RESERVACION);

    const respuesta = await request(app)
      .get(`/api/reservations/${RESERVACION_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(403);
  });

  it('deja al administrador ver la reservacion de cualquiera', async () => {
    const token = tokenDe(ADMINISTRADOR);
    reservationModel.buscarPorId.mockResolvedValue(RESERVACION);

    const respuesta = await request(app)
      .get(`/api/reservations/${RESERVACION_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
  });

  it('responde 404 cuando la reservacion no existe', async () => {
    const token = tokenDe(USUARIO);
    reservationModel.buscarPorId.mockResolvedValue(null);

    const respuesta = await request(app)
      .get(`/api/reservations/${RESERVACION_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(404);
  });

  it('rechaza un identificador que no es uuid', async () => {
    const token = tokenDe(USUARIO);

    const respuesta = await request(app)
      .get('/api/reservations/123')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(400);
  });
});

describe('POST /api/reservations (RF-08, RF-11, RF-12)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('crea la reservacion y devuelve su folio', async () => {
    const token = tokenDe(USUARIO);
    reservationModel.crear.mockResolvedValue(RESERVACION);
    reservationModel.buscarPorId.mockResolvedValue(RESERVACION);

    const respuesta = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ viaje_id: VIAJE_ID, metodo_pago: 'tarjeta' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.datos.reservacion.folio).toBe('TT-007842');
  });

  it('toma el titular del token y no del cuerpo', async () => {
    const token = tokenDe(USUARIO);
    reservationModel.crear.mockResolvedValue(RESERVACION);
    reservationModel.buscarPorId.mockResolvedValue(RESERVACION);

    await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ viaje_id: VIAJE_ID, usuario_id: ADMINISTRADOR.id });

    expect(reservationModel.crear).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: USUARIO.id })
    );
  });

  it('aplica tarjeta cuando no se indica metodo de pago', async () => {
    const token = tokenDe(USUARIO);
    reservationModel.crear.mockResolvedValue(RESERVACION);
    reservationModel.buscarPorId.mockResolvedValue(RESERVACION);

    await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ viaje_id: VIAJE_ID });

    expect(reservationModel.crear).toHaveBeenCalledWith(
      expect.objectContaining({ metodoPago: 'tarjeta', tasaImpuesto: 0.16 })
    );
  });

  it('rechaza una reservacion duplicada del mismo viaje', async () => {
    const token = tokenDe(USUARIO);
    reservationModel.crear.mockRejectedValue(
      ApiError.conflicto('Ya tienes una reservacion activa para este viaje.')
    );

    const respuesta = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ viaje_id: VIAJE_ID });

    expect(respuesta.status).toBe(409);
  });

  it('rechaza la reservacion cuando el viaje se quedo sin cupos', async () => {
    const token = tokenDe(USUARIO);
    reservationModel.crear.mockRejectedValue(
      ApiError.conflicto('El viaje ya no tiene cupos disponibles.')
    );

    const respuesta = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ viaje_id: VIAJE_ID });

    expect(respuesta.status).toBe(409);
  });

  it('exige el identificador del viaje', async () => {
    const token = tokenDe(USUARIO);

    const respuesta = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.detalles[0].campo).toBe('viaje_id');
  });

  it('rechaza un metodo de pago que no existe', async () => {
    const token = tokenDe(USUARIO);

    const respuesta = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ viaje_id: VIAJE_ID, metodo_pago: 'efectivo' });

    expect(respuesta.status).toBe(400);
  });
});

describe('PATCH /api/reservations/:id (RF-09, RF-15)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('cancela la reservacion propia y libera el lugar', async () => {
    const token = tokenDe(USUARIO);
    const cancelada = { ...RESERVACION, estado: 'cancelada' };
    reservationModel.cancelar.mockResolvedValue(cancelada);
    reservationModel.buscarPorId.mockResolvedValue(cancelada);

    const respuesta = await request(app)
      .patch(`/api/reservations/${RESERVACION_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'cancelada' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.reservacion.estado).toBe('cancelada');
    expect(reservationModel.cancelar).toHaveBeenCalledWith({
      id: RESERVACION_ID,
      usuarioId: USUARIO.id,
      esAdministrador: false,
    });
  });

  it('impide que un usuario marque su reservacion como completada', async () => {
    const token = tokenDe(USUARIO);

    const respuesta = await request(app)
      .patch(`/api/reservations/${RESERVACION_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'completada' });

    expect(respuesta.status).toBe(403);
    expect(reservationModel.actualizarEstado).not.toHaveBeenCalled();
  });

  it('deja al administrador marcarla como completada', async () => {
    const token = tokenDe(ADMINISTRADOR);
    reservationModel.buscarPorId.mockResolvedValue(RESERVACION);
    reservationModel.actualizarEstado.mockResolvedValue({
      ...RESERVACION,
      estado: 'completada',
    });

    const respuesta = await request(app)
      .patch(`/api/reservations/${RESERVACION_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'completada' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.reservacion.estado).toBe('completada');
  });

  it('no reactiva una reservacion cancelada porque el cupo ya se libero', async () => {
    const token = tokenDe(ADMINISTRADOR);
    reservationModel.buscarPorId.mockResolvedValue({ ...RESERVACION, estado: 'cancelada' });

    const respuesta = await request(app)
      .patch(`/api/reservations/${RESERVACION_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'activa' });

    expect(respuesta.status).toBe(409);
    expect(reservationModel.actualizarEstado).not.toHaveBeenCalled();
  });

  it('rechaza un estado fuera de los tres permitidos', async () => {
    const token = tokenDe(ADMINISTRADOR);

    const respuesta = await request(app)
      .patch(`/api/reservations/${RESERVACION_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'pendiente' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.detalles[0].campo).toBe('estado');
  });
});

describe('DELETE /api/reservations/:id', () => {
  it('no existe: una reservacion se cancela, no se borra', async () => {
    jest.resetAllMocks();
    const token = tokenDe(USUARIO);

    const respuesta = await request(app)
      .delete(`/api/reservations/${RESERVACION_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(404);
  });
});
