'use strict';

const request = require('supertest');

jest.mock('../../src/models/trip.model');
jest.mock('../../src/models/user.model');

const tripModel = require('../../src/models/trip.model');
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

const VIAJE = {
  id: '10000000-0000-4000-8000-000000000001',
  titulo: 'Retiro Alpino Exclusivo en los Dolomitas',
  destino: 'Dolomitas, Italia',
  precio: '2450.00',
  fecha_salida: '2027-10-12',
  fecha_regreso: '2027-10-18',
  duracion_dias: 7,
  cupos_totales: 12,
  cupos_disponibles: 4,
  imagen_url: 'https://picsum.photos/seed/dolomitas/1200/800',
  activo: true,
};

const NUEVO_VIAJE = {
  titulo: 'Auroras Boreales en Laponia',
  destino: 'Rovaniemi, Finlandia',
  descripcion: 'Siete noches en cabanas de cristal dentro del circulo polar artico con guia.',
  precio: 2240,
  fecha_salida: '2027-01-15',
  fecha_regreso: '2027-01-21',
  cupos_totales: 16,
  imagen_url: 'https://picsum.photos/seed/laponia/1200/800',
};

function tokenDe(usuario) {
  userModel.buscarPorId.mockResolvedValue(usuario);

  return jwtUtil.firmar(usuario);
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

describe('GET /api/trips (RF-04, RF-05, RF-06)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    tripModel.listar.mockResolvedValue({ viajes: [VIAJE], total: 1 });
  });

  it('devuelve el catalogo con su paginacion', async () => {
    const respuesta = await request(app).get('/api/trips');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.exito).toBe(true);
    expect(respuesta.body.datos.viajes).toHaveLength(1);
    expect(respuesta.body.datos.paginacion).toEqual({
      pagina: 1,
      limite: 9,
      total: 1,
      paginas: 1,
    });
  });

  it('busca por destino (RF-05)', async () => {
    await request(app).get('/api/trips?destino=Italia');

    expect(tripModel.listar.mock.calls[0][0].filtros.destino).toBe('Italia');
  });

  it('descarta los comodines del criterio de busqueda', async () => {
    await request(app).get('/api/trips?destino=%25%25Italia');

    expect(tripModel.listar.mock.calls[0][0].filtros.destino).toBe('Italia');
  });

  it('aplica los filtros de precio, fechas y disponibilidad (RF-06)', async () => {
    await request(app).get('/api/trips?precio_max=3000&regreso=2027-12-31&disponibles=1');

    const { filtros } = tripModel.listar.mock.calls[0][0];

    expect(filtros.precioMax).toBe(3000);
    expect(filtros.regresoHasta).toBe('2027-12-31');
    expect(filtros.soloDisponibles).toBe(true);
  });

  it('oculta a un visitante los viajes inactivos y los que ya salieron', async () => {
    await request(app).get('/api/trips?incluir_inactivos=1');

    const { filtros } = tripModel.listar.mock.calls[0][0];

    expect(filtros.soloActivos).toBe(true);
    expect(filtros.salidaDesde >= hoyISO()).toBe(true);
  });

  it('deja al administrador ver los inactivos y los pasados (RF-13)', async () => {
    const token = tokenDe(ADMINISTRADOR);
    tripModel.listar.mockResolvedValue({ viajes: [VIAJE], total: 1 });

    await request(app)
      .get('/api/trips?incluir_inactivos=1')
      .set('Authorization', `Bearer ${token}`);

    const { filtros } = tripModel.listar.mock.calls[0][0];

    expect(filtros.soloActivos).toBe(false);
    expect(filtros.salidaDesde).toBeNull();
  });

  it('ignora un token invalido y responde igual que a un visitante', async () => {
    const respuesta = await request(app)
      .get('/api/trips')
      .set('Authorization', 'Bearer token.falso.aqui');

    expect(respuesta.status).toBe(200);
    expect(tripModel.listar.mock.calls[0][0].filtros.soloActivos).toBe(true);
  });

  it('limita el tamano de pagina al maximo permitido', async () => {
    const respuesta = await request(app).get('/api/trips?limite=500');

    expect(respuesta.status).toBe(400);
    expect(tripModel.listar).not.toHaveBeenCalled();
  });

  it('rechaza un criterio de orden desconocido con 400', async () => {
    const respuesta = await request(app).get('/api/trips?orden=aleatorio');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.detalles[0].campo).toBe('orden');
  });
});

describe('GET /api/trips/:id (RF-07)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('devuelve el detalle del viaje', async () => {
    tripModel.buscarPorId.mockResolvedValue(VIAJE);

    const respuesta = await request(app).get(`/api/trips/${VIAJE.id}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.viaje.id).toBe(VIAJE.id);
  });

  it('responde 404 cuando el viaje no existe', async () => {
    tripModel.buscarPorId.mockResolvedValue(null);

    const respuesta = await request(app).get(`/api/trips/${VIAJE.id}`);

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.exito).toBe(false);
  });

  it('responde 400 cuando el identificador no es un uuid', async () => {
    const respuesta = await request(app).get('/api/trips/123');

    expect(respuesta.status).toBe(400);
    expect(tripModel.buscarPorId).not.toHaveBeenCalled();
  });
});

describe('POST /api/trips (RF-13, RF-17)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('responde 401 sin token', async () => {
    const respuesta = await request(app).post('/api/trips').send(NUEVO_VIAJE);

    expect(respuesta.status).toBe(401);
  });

  it('responde 403 a un usuario sin rol de administrador', async () => {
    const token = tokenDe(USUARIO);

    const respuesta = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send(NUEVO_VIAJE);

    expect(respuesta.status).toBe(403);
    expect(tripModel.crear).not.toHaveBeenCalled();
  });

  it('crea el viaje con token de administrador', async () => {
    const token = tokenDe(ADMINISTRADOR);
    tripModel.crear.mockResolvedValue(VIAJE);

    const respuesta = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send(NUEVO_VIAJE);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.datos.viaje.id).toBe(VIAJE.id);
  });

  it('iguala los cupos disponibles a los totales cuando no se envian', async () => {
    const token = tokenDe(ADMINISTRADOR);
    tripModel.crear.mockResolvedValue(VIAJE);

    await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send(NUEVO_VIAJE);

    expect(tripModel.crear.mock.calls[0][0].cuposDisponibles).toBe(16);
  });

  it('rechaza una fecha de regreso anterior a la de salida (RF-19)', async () => {
    const token = tokenDe(ADMINISTRADOR);

    const respuesta = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...NUEVO_VIAJE, fecha_regreso: '2027-01-10' });

    expect(respuesta.status).toBe(400);
    expect(tripModel.crear).not.toHaveBeenCalled();
  });

  it('rechaza una fecha de salida en el pasado (RF-19)', async () => {
    const token = tokenDe(ADMINISTRADOR);

    const respuesta = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...NUEVO_VIAJE, fecha_salida: '2020-01-15', fecha_regreso: '2020-01-21' });

    expect(respuesta.status).toBe(400);
    expect(tripModel.crear).not.toHaveBeenCalled();
  });

  it('rechaza mas cupos disponibles que totales (RF-19)', async () => {
    const token = tokenDe(ADMINISTRADOR);

    const respuesta = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...NUEVO_VIAJE, cupos_disponibles: 40 });

    expect(respuesta.status).toBe(400);
    expect(tripModel.crear).not.toHaveBeenCalled();
  });

  it('detalla por campo los datos invalidos (RF-19)', async () => {
    const token = tokenDe(ADMINISTRADOR);

    const respuesta = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'AB', precio: -5, cupos_totales: 0, imagen_url: 'no-es-url' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.detalles.map((detalle) => detalle.campo)).toEqual(
      expect.arrayContaining(['titulo', 'precio', 'cupos_totales', 'imagen_url'])
    );
  });

  it('ignora los campos no previstos del cuerpo', async () => {
    const token = tokenDe(ADMINISTRADOR);
    tripModel.crear.mockResolvedValue(VIAJE);

    await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...NUEVO_VIAJE, id: 'inventado', creado_en: '1999-01-01' });

    expect(tripModel.crear.mock.calls[0][0]).not.toHaveProperty('id');
    expect(tripModel.crear.mock.calls[0][0]).not.toHaveProperty('creado_en');
  });
});

describe('PUT /api/trips/:id (RF-13)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('actualiza solo los campos enviados', async () => {
    const token = tokenDe(ADMINISTRADOR);
    tripModel.buscarPorId.mockResolvedValue(VIAJE);
    tripModel.actualizar.mockResolvedValue({ ...VIAJE, precio: '1990.00' });

    const respuesta = await request(app)
      .put(`/api/trips/${VIAJE.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ precio: 1990 });

    expect(respuesta.status).toBe(200);
    expect(tripModel.actualizar.mock.calls[0][1]).toEqual({ precio: 1990 });
  });

  it('responde 404 cuando el viaje no existe', async () => {
    const token = tokenDe(ADMINISTRADOR);
    tripModel.buscarPorId.mockResolvedValue(null);

    const respuesta = await request(app)
      .put(`/api/trips/${VIAJE.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ precio: 1990 });

    expect(respuesta.status).toBe(404);
    expect(tripModel.actualizar).not.toHaveBeenCalled();
  });

  it('rechaza un cambio que deja mas cupos disponibles que totales', async () => {
    const token = tokenDe(ADMINISTRADOR);
    tripModel.buscarPorId.mockResolvedValue(VIAJE);

    const respuesta = await request(app)
      .put(`/api/trips/${VIAJE.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cupos_disponibles: 30 });

    expect(respuesta.status).toBe(400);
    expect(tripModel.actualizar).not.toHaveBeenCalled();
  });

  it('responde 403 a un usuario sin rol de administrador', async () => {
    const token = tokenDe(USUARIO);

    const respuesta = await request(app)
      .put(`/api/trips/${VIAJE.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ precio: 1990 });

    expect(respuesta.status).toBe(403);
  });
});

describe('DELETE /api/trips/:id (RF-13)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('elimina el viaje', async () => {
    const token = tokenDe(ADMINISTRADOR);
    tripModel.eliminar.mockResolvedValue(true);

    const respuesta = await request(app)
      .delete(`/api/trips/${VIAJE.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.exito).toBe(true);
  });

  it('responde 404 cuando el viaje no existe', async () => {
    const token = tokenDe(ADMINISTRADOR);
    tripModel.eliminar.mockResolvedValue(false);

    const respuesta = await request(app)
      .delete(`/api/trips/${VIAJE.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(404);
  });

  it('responde 409 cuando el viaje tiene reservaciones asociadas (RNF-14)', async () => {
    const token = tokenDe(ADMINISTRADOR);
    tripModel.eliminar.mockRejectedValue(ApiError.conflicto('Tiene reservaciones.'));

    const respuesta = await request(app)
      .delete(`/api/trips/${VIAJE.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(409);
  });

  it('responde 401 sin token', async () => {
    const respuesta = await request(app).delete(`/api/trips/${VIAJE.id}`);

    expect(respuesta.status).toBe(401);
  });
});
