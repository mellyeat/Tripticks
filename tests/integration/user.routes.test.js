'use strict';

const request = require('supertest');

jest.mock('../../src/models/user.model');

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

const OTRO_ADMINISTRADOR = {
  id: 'a1b2c3d4-0000-4000-8000-000000000004',
  nombre: 'Paola Vega',
  email: 'paola@tripticks.com',
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

const NUEVO_USUARIO = {
  nombre: 'Luis Carrillo',
  email: 'luis@ejemplo.com',
  password: 'Secreta123',
};

// buscarPorId sirve a dos cosas: identificar a quien manda la peticion y leer
// al usuario que se esta editando, asi que se resuelve por identificador.
function autenticarComo(usuario, conocidos = []) {
  const todos = [usuario].concat(conocidos);

  userModel.buscarPorId.mockImplementation(async (id) => {
    return todos.filter((candidato) => candidato.id === id)[0] || null;
  });

  return jwtUtil.firmar(usuario);
}

describe('GET /api/users (RF-14, RF-17)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    userModel.listar.mockResolvedValue({ usuarios: [USUARIO], total: 1 });
  });

  it('rechaza la peticion sin token', async () => {
    const respuesta = await request(app).get('/api/users');

    expect(respuesta.status).toBe(401);
  });

  it('niega el acceso a un usuario sin rol de administrador', async () => {
    const token = autenticarComo(USUARIO);

    const respuesta = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(403);
    expect(userModel.listar).not.toHaveBeenCalled();
  });

  it('devuelve el listado con su paginacion al administrador', async () => {
    const token = autenticarComo(ADMINISTRADOR);

    const respuesta = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.usuarios).toHaveLength(1);
    expect(respuesta.body.datos.paginacion.paginas).toBe(1);
  });

  it('traslada los filtros de rol y estado a la consulta', async () => {
    const token = autenticarComo(ADMINISTRADOR);

    await request(app)
      .get('/api/users?rol=administrador&activo=false')
      .set('Authorization', `Bearer ${token}`);

    expect(userModel.listar).toHaveBeenCalledWith(
      expect.objectContaining({
        filtros: expect.objectContaining({ rol: 'administrador', activo: false }),
      })
    );
  });

  it('descarta los caracteres que romperian el filtro de busqueda', async () => {
    const token = autenticarComo(ADMINISTRADOR);

    await request(app)
      .get('/api/users?busqueda=%25ana%2Cx')
      .set('Authorization', `Bearer ${token}`);

    expect(userModel.listar).toHaveBeenCalledWith(
      expect.objectContaining({
        filtros: expect.objectContaining({ busqueda: 'anax' }),
      })
    );
  });

  it('rechaza un rol que no existe', async () => {
    const token = autenticarComo(ADMINISTRADOR);

    const respuesta = await request(app)
      .get('/api/users?rol=superusuario')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(400);
  });
});

describe('POST /api/users (RF-14)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('crea la cuenta y nunca devuelve el hash de la contrasena', async () => {
    const token = autenticarComo(ADMINISTRADOR);
    userModel.existeEmail.mockResolvedValue(false);
    userModel.crear.mockResolvedValue({ ...USUARIO, ...NUEVO_USUARIO, password: undefined });

    const respuesta = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send(NUEVO_USUARIO);

    expect(respuesta.status).toBe(201);
    expect(JSON.stringify(respuesta.body)).not.toContain('password');
  });

  it('guarda la contrasena hasheada y no en claro', async () => {
    const token = autenticarComo(ADMINISTRADOR);
    userModel.existeEmail.mockResolvedValue(false);
    userModel.crear.mockResolvedValue(USUARIO);

    await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send(NUEVO_USUARIO);

    const argumentos = userModel.crear.mock.calls[0][0];

    expect(argumentos.passwordHash).toEqual(expect.any(String));
    expect(argumentos.passwordHash).not.toBe(NUEVO_USUARIO.password);
  });

  it('permite al administrador dar de alta a otro administrador', async () => {
    const token = autenticarComo(ADMINISTRADOR);
    userModel.existeEmail.mockResolvedValue(false);
    userModel.crear.mockResolvedValue(OTRO_ADMINISTRADOR);

    await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...NUEVO_USUARIO, rol: 'administrador' });

    expect(userModel.crear).toHaveBeenCalledWith(
      expect.objectContaining({ rol: 'administrador' })
    );
  });

  it('rechaza un correo ya registrado', async () => {
    const token = autenticarComo(ADMINISTRADOR);
    userModel.existeEmail.mockResolvedValue(true);

    const respuesta = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send(NUEVO_USUARIO);

    expect(respuesta.status).toBe(409);
    expect(userModel.crear).not.toHaveBeenCalled();
  });

  it('rechaza una contrasena que no cumple las reglas', async () => {
    const token = autenticarComo(ADMINISTRADOR);

    const respuesta = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...NUEVO_USUARIO, password: 'corta' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.detalles[0].campo).toBe('password');
  });
});

describe('PUT /api/users/:id (RF-14)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('actualiza el nombre de la cuenta', async () => {
    const token = autenticarComo(ADMINISTRADOR, [USUARIO]);
    userModel.actualizar.mockResolvedValue({ ...USUARIO, nombre: 'Ana M. Martinez' });

    const respuesta = await request(app)
      .put(`/api/users/${USUARIO.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Ana M. Martinez' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.usuario.nombre).toBe('Ana M. Martinez');
  });

  it('asigna el rol de administrador', async () => {
    const token = autenticarComo(ADMINISTRADOR, [USUARIO]);
    userModel.actualizar.mockResolvedValue({ ...USUARIO, rol: 'administrador' });

    const respuesta = await request(app)
      .put(`/api/users/${USUARIO.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'administrador' });

    expect(respuesta.status).toBe(200);
    expect(userModel.actualizar).toHaveBeenCalledWith(USUARIO.id, { rol: 'administrador' });
  });

  it('impide que un administrador se quite a si mismo el rol', async () => {
    const token = autenticarComo(ADMINISTRADOR);

    const respuesta = await request(app)
      .put(`/api/users/${ADMINISTRADOR.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'usuario' });

    expect(respuesta.status).toBe(409);
    expect(userModel.actualizar).not.toHaveBeenCalled();
  });

  it('impide degradar al ultimo administrador activo', async () => {
    const token = autenticarComo(ADMINISTRADOR, [OTRO_ADMINISTRADOR]);
    userModel.contarAdministradoresActivos.mockResolvedValue(1);

    const respuesta = await request(app)
      .put(`/api/users/${OTRO_ADMINISTRADOR.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'usuario' });

    expect(respuesta.status).toBe(409);
    expect(userModel.actualizar).not.toHaveBeenCalled();
  });

  it('permite degradar a un administrador cuando queda mas de uno', async () => {
    const token = autenticarComo(ADMINISTRADOR, [OTRO_ADMINISTRADOR]);
    userModel.contarAdministradoresActivos.mockResolvedValue(2);
    userModel.actualizar.mockResolvedValue({ ...OTRO_ADMINISTRADOR, rol: 'usuario' });

    const respuesta = await request(app)
      .put(`/api/users/${OTRO_ADMINISTRADOR.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'usuario' });

    expect(respuesta.status).toBe(200);
  });

  it('rechaza un correo que ya pertenece a otra cuenta', async () => {
    const token = autenticarComo(ADMINISTRADOR, [USUARIO]);
    userModel.existeEmail.mockResolvedValue(true);

    const respuesta = await request(app)
      .put(`/api/users/${USUARIO.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'paola@tripticks.com' });

    expect(respuesta.status).toBe(409);
  });

  it('responde 400 cuando no llega ningun cambio', async () => {
    const token = autenticarComo(ADMINISTRADOR, [USUARIO]);

    const respuesta = await request(app)
      .put(`/api/users/${USUARIO.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(respuesta.status).toBe(400);
  });

  it('responde 404 cuando la cuenta no existe', async () => {
    const token = autenticarComo(ADMINISTRADOR);

    const respuesta = await request(app)
      .put(`/api/users/${USUARIO.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Otro nombre' });

    expect(respuesta.status).toBe(404);
  });
});

describe('DELETE /api/users/:id (RF-14, baja logica)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('desactiva la cuenta en lugar de borrarla', async () => {
    const token = autenticarComo(ADMINISTRADOR, [USUARIO]);
    userModel.actualizar.mockResolvedValue({ ...USUARIO, activo: false });

    const respuesta = await request(app)
      .delete(`/api/users/${USUARIO.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.usuario.activo).toBe(false);
    expect(userModel.actualizar).toHaveBeenCalledWith(USUARIO.id, { activo: false });
  });

  it('impide que un administrador desactive su propia cuenta', async () => {
    const token = autenticarComo(ADMINISTRADOR);

    const respuesta = await request(app)
      .delete(`/api/users/${ADMINISTRADOR.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(409);
    expect(userModel.actualizar).not.toHaveBeenCalled();
  });

  it('impide desactivar al ultimo administrador activo', async () => {
    const token = autenticarComo(ADMINISTRADOR, [OTRO_ADMINISTRADOR]);
    userModel.contarAdministradoresActivos.mockResolvedValue(1);

    const respuesta = await request(app)
      .delete(`/api/users/${OTRO_ADMINISTRADOR.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(409);
  });

  it('no vuelve a tocar una cuenta que ya estaba desactivada', async () => {
    const token = autenticarComo(ADMINISTRADOR, [{ ...USUARIO, activo: false }]);

    const respuesta = await request(app)
      .delete(`/api/users/${USUARIO.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
    expect(userModel.actualizar).not.toHaveBeenCalled();
  });
});
