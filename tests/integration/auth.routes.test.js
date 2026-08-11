'use strict';

const request = require('supertest');

jest.mock('../../src/models/user.model');

const userModel = require('../../src/models/user.model');
const app = require('../../src/app');
const password = require('../../src/utils/password.util');
const limitePeticiones = require('../../src/middlewares/rateLimit.middleware');

/* Registro e inicio de sesion comparten el cupo de peticiones por IP, y toda la
   suite corre desde la misma. Sin reiniciarlo entre casos, los ultimos
   recibirian 429 por culpa de los anteriores. El cupo se prueba aparte, en
   tests/integration/seguridad.test.js. */
beforeEach(() => {
  limitePeticiones.reiniciar();
});

const USUARIO = {
  id: 'e7c1a9f0-0000-4000-8000-000000000001',
  nombre: 'Ana Martinez',
  email: 'ana@ejemplo.com',
  rol: 'usuario',
  activo: true,
  creado_en: '2026-01-01T00:00:00.000Z',
};

describe('POST /api/auth/register (RF-01)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('crea la cuenta y devuelve un token', async () => {
    userModel.existeEmail.mockResolvedValue(false);
    userModel.crear.mockResolvedValue(USUARIO);

    const respuesta = await request(app).post('/api/auth/register').send({
      nombre: 'Ana Martinez',
      email: 'ana@ejemplo.com',
      password: 'Secreta123',
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.exito).toBe(true);
    expect(respuesta.body.datos.token).toEqual(expect.any(String));
    expect(respuesta.body.datos.usuario.email).toBe('ana@ejemplo.com');
  });

  it('guarda la contrasena hasheada, nunca en texto claro (RNF-02)', async () => {
    userModel.existeEmail.mockResolvedValue(false);
    userModel.crear.mockResolvedValue(USUARIO);

    await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'Ana Martinez', email: 'ana@ejemplo.com', password: 'Secreta123' });

    const { passwordHash } = userModel.crear.mock.calls[0][0];

    expect(passwordHash).not.toBe('Secreta123');
    await expect(password.verificar('Secreta123', passwordHash)).resolves.toBe(true);
  });

  it('normaliza el correo a minusculas', async () => {
    userModel.existeEmail.mockResolvedValue(false);
    userModel.crear.mockResolvedValue(USUARIO);

    await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'Ana Martinez', email: 'ANA@Ejemplo.com', password: 'Secreta123' });

    expect(userModel.crear.mock.calls[0][0].email).toBe('ana@ejemplo.com');
  });

  it('ignora el rol enviado por el cliente (RF-17)', async () => {
    userModel.existeEmail.mockResolvedValue(false);
    userModel.crear.mockResolvedValue(USUARIO);

    await request(app).post('/api/auth/register').send({
      nombre: 'Ana Martinez',
      email: 'ana@ejemplo.com',
      password: 'Secreta123',
      rol: 'administrador',
    });

    expect(userModel.crear.mock.calls[0][0].rol).toBe('usuario');
  });

  it('rechaza un correo ya registrado con 409', async () => {
    userModel.existeEmail.mockResolvedValue(true);

    const respuesta = await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'Ana Martinez', email: 'ana@ejemplo.com', password: 'Secreta123' });

    expect(respuesta.status).toBe(409);
    expect(userModel.crear).not.toHaveBeenCalled();
  });

  it('rechaza datos invalidos con el detalle por campo (RF-19)', async () => {
    const respuesta = await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'A', email: 'no-es-correo', password: '123' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.detalles.map((d) => d.campo)).toEqual(
      expect.arrayContaining(['nombre', 'email', 'password'])
    );
  });
});

describe('POST /api/auth/login (RF-02)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  async function usuarioConPassword(passwordPlano) {
    return { ...USUARIO, password_hash: await password.hashear(passwordPlano) };
  }

  it('devuelve token y usuario con credenciales correctas', async () => {
    userModel.buscarPorEmailConHash.mockResolvedValue(await usuarioConPassword('Secreta123'));

    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@ejemplo.com', password: 'Secreta123' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.token).toEqual(expect.any(String));
  });

  it('nunca incluye el hash en la respuesta', async () => {
    userModel.buscarPorEmailConHash.mockResolvedValue(await usuarioConPassword('Secreta123'));

    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@ejemplo.com', password: 'Secreta123' });

    expect(respuesta.body.datos.usuario).not.toHaveProperty('password_hash');
  });

  it('responde 401 con contrasena incorrecta', async () => {
    userModel.buscarPorEmailConHash.mockResolvedValue(await usuarioConPassword('Secreta123'));

    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@ejemplo.com', password: 'Incorrecta1' });

    expect(respuesta.status).toBe(401);
  });

  it('usa el mismo mensaje para correo inexistente y contrasena incorrecta', async () => {
    userModel.buscarPorEmailConHash.mockResolvedValue(null);
    const inexistente = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@ejemplo.com', password: 'Secreta123' });

    userModel.buscarPorEmailConHash.mockResolvedValue(await usuarioConPassword('Secreta123'));
    const incorrecta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@ejemplo.com', password: 'Incorrecta1' });

    expect(inexistente.status).toBe(incorrecta.status);
    expect(inexistente.body.mensaje).toBe(incorrecta.body.mensaje);
  });

  it('bloquea a un usuario desactivado con 403', async () => {
    userModel.buscarPorEmailConHash.mockResolvedValue({
      ...(await usuarioConPassword('Secreta123')),
      activo: false,
    });

    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@ejemplo.com', password: 'Secreta123' });

    expect(respuesta.status).toBe(403);
  });
});

describe('Rutas protegidas (RNF-03, RF-17)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  async function tokenValido() {
    userModel.buscarPorEmailConHash.mockResolvedValue({
      ...USUARIO,
      password_hash: await password.hashear('Secreta123'),
    });

    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@ejemplo.com', password: 'Secreta123' });

    return respuesta.body.datos.token;
  }

  it('GET /api/auth/me responde 401 sin token', async () => {
    const respuesta = await request(app).get('/api/auth/me');

    expect(respuesta.status).toBe(401);
  });

  it('GET /api/auth/me responde 401 con un token invalido', async () => {
    const respuesta = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token.falso.aqui');

    expect(respuesta.status).toBe(401);
  });

  it('GET /api/auth/me devuelve el perfil con un token valido', async () => {
    const token = await tokenValido();
    userModel.buscarPorId.mockResolvedValue(USUARIO);

    const respuesta = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.usuario.id).toBe(USUARIO.id);
  });

  it('rechaza el token de un usuario desactivado despues de emitirlo', async () => {
    const token = await tokenValido();
    userModel.buscarPorId.mockResolvedValue({ ...USUARIO, activo: false });

    const respuesta = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(403);
  });

  it('POST /api/auth/logout responde 200 con sesion activa (RF-03)', async () => {
    const token = await tokenValido();
    userModel.buscarPorId.mockResolvedValue(USUARIO);

    const respuesta = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
  });
});

describe('Manejo de errores (RF-20)', () => {
  it('responde 404 con formato uniforme ante una ruta inexistente', async () => {
    const respuesta = await request(app).get('/api/no-existe');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.exito).toBe(false);
    expect(respuesta.body.mensaje).toEqual(expect.any(String));
  });
});
