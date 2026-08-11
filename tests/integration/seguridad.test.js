'use strict';

/**
 * Pruebas de refuerzo de las rutas.
 *
 * Recorren todos los campos de texto que llegan del exterior con cargas de
 * inyeccion SQL, inyeccion de filtros de PostgREST y XSS, y comprueban que
 * ninguna cambia el comportamiento del sistema: o el validador la rechaza, o
 * llega a la capa de datos como texto inerte.
 *
 * El corte esta en los modelos, igual que en el resto de las suites: lo que se
 * verifica es que el valor que sale de la aplicacion hacia la base ya viene
 * neutralizado.
 */

const request = require('supertest');

jest.mock('../../src/models/trip.model');
jest.mock('../../src/models/user.model');
jest.mock('../../src/models/reservation.model');

const tripModel = require('../../src/models/trip.model');
const userModel = require('../../src/models/user.model');
const reservationModel = require('../../src/models/reservation.model');
const app = require('../../src/app');
const jwtUtil = require('../../src/utils/jwt.util');
const { reiniciar } = require('../../src/middlewares/rateLimit.middleware');

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

// Cargas clasicas de inyeccion SQL. Ninguna deberia llegar entera a la base.
const CARGAS_SQL = [
  "' OR '1'='1",
  "'; drop table usuarios; --",
  "admin'--",
  "1' union select null, password_hash from usuarios --",
  "'; select pg_sleep(10); --",
];

// PostgREST no habla SQL: su superficie son los metacaracteres del filtro.
const CARGAS_POSTGREST = [
  'ana,rol.eq.administrador',
  'x),or(rol.eq.administrador',
  'ana,password_hash.not.is.null',
  '*',
  '%',
];

const CARGAS_XSS = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  "javascript:alert('xss')",
  '<svg/onload=alert(1)>',
  '{{constructor.constructor("alert(1)")()}}',
];

function tokenDe(usuario) {
  userModel.buscarPorId.mockResolvedValue(usuario);

  return jwtUtil.firmar(usuario);
}

beforeEach(() => {
  jest.resetAllMocks();
  reiniciar();
});

describe('Inyeccion SQL en los campos de texto', () => {
  it('no ejecuta nada desde el destino del catalogo: viaja como valor literal', async () => {
    tripModel.listar.mockResolvedValue({ viajes: [], total: 0 });

    for (const carga of CARGAS_SQL) {
      tripModel.listar.mockClear();

      const respuesta = await request(app).get('/api/trips').query({ destino: carga });

      expect(respuesta.status).toBe(200);

      // El valor llega como texto a .ilike(), que supabase-js codifica aparte.
      // Lo unico que se le quita son los comodines de LIKE.
      const { destino } = tripModel.listar.mock.calls[0][0].filtros;

      expect(destino).not.toMatch(/[%_]/);
      expect(typeof destino === 'string' || destino === null).toBe(true);
    }
  });

  it('no ejecuta nada desde el correo del inicio de sesion', async () => {
    userModel.buscarPorEmailConHash.mockResolvedValue(null);

    for (const carga of CARGAS_SQL) {
      const respuesta = await request(app)
        .post('/api/auth/login')
        .send({ email: carga, password: 'Cualquiera123' });

      // O lo rechaza el validador de correo (422) o no encuentra a nadie (401).
      // Nunca 200 y nunca un error de base de datos.
      expect([400, 401, 422]).toContain(respuesta.status);
      expect(respuesta.status).not.toBe(500);
    }
  });

  it('no ejecuta nada desde el nombre del registro', async () => {
    userModel.existeEmail.mockResolvedValue(false);
    userModel.crear.mockImplementation(async (datos) => ({ id: USUARIO.id, ...datos }));

    for (const carga of CARGAS_SQL) {
      userModel.crear.mockClear();

      const respuesta = await request(app)
        .post('/api/auth/register')
        .send({ nombre: carga, email: `probar${Date.now()}@ejemplo.com`, password: 'Segura123' });

      if (respuesta.status === 201) {
        // Si pasa la validacion, se guarda como texto plano: es un nombre feo,
        // no una instruccion. El insert de supabase-js lo manda parametrizado.
        expect(userModel.crear.mock.calls[0][0].nombre).toBe(carga.trim());
      }

      expect(respuesta.status).not.toBe(500);
    }
  });

  it('rechaza un identificador que no es uuid antes de tocar la base', async () => {
    const token = tokenDe(USUARIO);

    const respuesta = await request(app)
      .get("/api/trips/1' or '1'='1")
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(400);
    expect(tripModel.buscarPorId).not.toHaveBeenCalled();
  });

  it('rechaza un identificador que no es uuid tambien en el formulario de edicion', async () => {
    const token = tokenDe(ADMINISTRADOR);

    const respuesta = await request(app)
      .get("/admin/trips/1' or '1'='1/edit")
      .set('Cookie', [`tripticks.token=${token}`]);

    expect(respuesta.status).toBe(400);
    expect(tripModel.buscarPorId).not.toHaveBeenCalled();
  });
});

describe('Inyeccion de filtros de PostgREST', () => {
  it('neutraliza los metacaracteres en la busqueda de usuarios', async () => {
    userModel.listar.mockResolvedValue({ usuarios: [], total: 0 });

    for (const carga of CARGAS_POSTGREST) {
      userModel.listar.mockClear();

      const token = tokenDe(ADMINISTRADOR);

      const respuesta = await request(app)
        .get('/api/users')
        .query({ busqueda: carga })
        .set('Authorization', `Bearer ${token}`);

      expect(respuesta.status).toBe(200);

      const { busqueda } = userModel.listar.mock.calls[0][0].filtros;

      
      if (busqueda !== null) {
        expect(busqueda).not.toMatch(/[,()%_*"'\\]/);
      }
    }
  });

  it('rechaza un rol fuera del catalogo en lugar de trasladarlo a la consulta', async () => {
    const token = tokenDe(ADMINISTRADOR);

    const respuesta = await request(app)
      .get('/api/users')
      .query({ rol: 'administrador,activo.eq.true' })
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(400);
    expect(userModel.listar).not.toHaveBeenCalled();
  });

  it('rechaza un criterio de orden fuera del catalogo', async () => {
    const respuesta = await request(app).get('/api/trips').query({ orden: 'precio.desc,id.asc' });

    expect(respuesta.status).toBe(400);
    expect(tripModel.listar).not.toHaveBeenCalled();
  });

  it('rechaza un estado de reservacion fuera del catalogo', async () => {
    const token = tokenDe(USUARIO);

    const respuesta = await request(app)
      .get('/api/reservations')
      .query({ estado: 'activa,usuario_id.neq.null' })
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(400);
  });
});

describe('XSS en los campos que despues se muestran', () => {
  const VIAJE_VALIDO = {
    titulo: 'Viaje de prueba',
    destino: 'Oaxaca, Mexico',
    descripcion: 'Una descripcion suficientemente larga para pasar la validacion.',
    precio: 1000,
    fecha_salida: '2030-01-10',
    fecha_regreso: '2030-01-20',
    cupos_totales: 10,
    imagen_url: 'https://picsum.photos/seed/x/1200/800',
  };

 
  it('rechaza el marcado en los campos de texto del viaje sin llegar a la base', async () => {
    const token = tokenDe(ADMINISTRADOR);

    for (const campo of ['titulo', 'destino', 'descripcion']) {
      for (const carga of CARGAS_XSS.filter((valor) => /<|javascript:/i.test(valor))) {
        tripModel.crear.mockClear();

        const respuesta = await request(app)
          .post('/api/trips')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...VIAJE_VALIDO, [campo]: `${VIAJE_VALIDO[campo]} ${carga}` });

        expect(respuesta.status).toBe(400);
        expect(tripModel.crear).not.toHaveBeenCalled();
      }
    }
  });

  it('rechaza el marcado en el nombre del registro sin crear la cuenta', async () => {
    userModel.existeEmail.mockResolvedValue(false);

    const respuesta = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: '<script>alert(1)</script>Ana',
        email: 'ana.marcado@ejemplo.com',
        password: 'Segura123',
      });

    expect(respuesta.status).toBe(400);
    expect(userModel.crear).not.toHaveBeenCalled();
  });

  it('rechaza el marcado dentro de un dia del itinerario', async () => {
    const token = tokenDe(ADMINISTRADOR);

    const respuesta = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...VIAJE_VALIDO,
        itinerario: [{ dia: 1, titulo: 'Llegada', descripcion: '<img src=x onerror=alert(1)>' }],
      });

    expect(respuesta.status).toBe(400);
    expect(tripModel.crear).not.toHaveBeenCalled();
  });

  /* El filtro apunta a las etiquetas, no al caracter suelto: un "<" comparando
     cantidades y un apostrofo en un apellido son texto legitimo y deben pasar.
     Sin este caso, endurecer el patron mas adelante rompe usuarios reales sin
     que ninguna prueba se queje. */
  it('deja pasar el texto legitimo que contiene < o apostrofo', async () => {
    const token = tokenDe(ADMINISTRADOR);
    tripModel.crear.mockImplementation(async (datos) => ({ id: 'x', ...datos }));

    const descripcion = "Grupos de < 10 personas. Incluye la ruta de O'Higgins y 5 < 8 paradas.";

    const respuesta = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VIAJE_VALIDO, descripcion });

    expect(respuesta.status).toBe(201);
    expect(tripModel.crear.mock.calls[0][0].descripcion).toBe(descripcion);
  });

  it('devuelve el titulo en JSON sin convertirlo en HTML', async () => {
    tripModel.buscarPorId.mockResolvedValue({
      id: '10000000-0000-4000-8000-000000000001',
      titulo: '<img src=x onerror=alert(1)>',
      destino: 'Oaxaca',
    });

    const respuesta = await request(app).get(
      '/api/trips/10000000-0000-4000-8000-000000000001'
    );

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['content-type']).toMatch(/application\/json/);
    expect(respuesta.body.datos.viaje.titulo).toBe('<img src=x onerror=alert(1)>');
  });

  it('escapa el mensaje de error al renderizar la pagina de error', async () => {
    const respuesta = await request(app)
      .get('/trips/%3Cscript%3Ealert(1)%3C/script%3E')
      .set('Accept', 'text/html');

    expect(respuesta.text).not.toContain('<script>alert(1)</script>');
  });

  it('rechaza una direccion de imagen que no sea http o https', async () => {
    const token = tokenDe(ADMINISTRADOR);

    for (const carga of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>']) {
      const respuesta = await request(app)
        .post('/api/trips')
        .set('Authorization', `Bearer ${token}`)
        .send({
          titulo: 'Viaje de prueba',
          destino: 'Oaxaca',
          descripcion: 'Una descripcion suficientemente larga para pasar la validacion.',
          precio: 1000,
          fecha_salida: '2030-01-10',
          fecha_regreso: '2030-01-20',
          cupos_totales: 10,
          imagen_url: carga,
        });

      expect(respuesta.status).toBe(400);
    }
  });

  it('descarta las claves no previstas de cada dia del itinerario', async () => {
    const token = tokenDe(ADMINISTRADOR);
    tripModel.crear.mockImplementation(async (datos) => ({ id: 'x', ...datos }));

    const respuesta = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Viaje con itinerario',
        destino: 'Oaxaca',
        descripcion: 'Una descripcion suficientemente larga para pasar la validacion.',
        precio: 1000,
        fecha_salida: '2030-01-10',
        fecha_regreso: '2030-01-20',
        cupos_totales: 10,
        imagen_url: 'https://picsum.photos/seed/x/1200/800',
        itinerario: [
          { dia: 1, titulo: 'Llegada', descripcion: 'Traslado al hotel.', __proto__: { rol: 'x' } },
        ],
      });

    expect(respuesta.status).toBe(201);

    const [dia] = tripModel.crear.mock.calls[0][0].itinerario;

    expect(Object.keys(dia).sort()).toEqual(['descripcion', 'dia', 'titulo']);
  });
});

describe('Escalada de privilegios por el cuerpo de la peticion', () => {
  it('ignora el rol enviado al registrarse', async () => {
    userModel.existeEmail.mockResolvedValue(false);
    userModel.crear.mockImplementation(async (datos) => ({ id: USUARIO.id, ...datos }));

    await request(app).post('/api/auth/register').send({
      nombre: 'Persona Nueva',
      email: 'nueva@ejemplo.com',
      password: 'Segura123',
      rol: 'administrador',
    });

    expect(userModel.crear.mock.calls[0][0].rol).toBe('usuario');
  });

  it('ignora los campos no previstos al crear un viaje', async () => {
    const token = tokenDe(ADMINISTRADOR);
    tripModel.crear.mockImplementation(async (datos) => ({ id: 'x', ...datos }));

    await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Viaje de prueba',
        destino: 'Oaxaca',
        descripcion: 'Una descripcion suficientemente larga para pasar la validacion.',
        precio: 1000,
        fecha_salida: '2030-01-10',
        fecha_regreso: '2030-01-20',
        cupos_totales: 10,
        imagen_url: 'https://picsum.photos/seed/x/1200/800',
        id: '00000000-0000-4000-8000-000000000099',
        creado_en: '1999-01-01',
      });

    const enviado = tripModel.crear.mock.calls[0][0];

    expect(enviado.id).toBeUndefined();
    expect(enviado.creado_en).toBeUndefined();
  });
});

describe('Cupo de peticiones', () => {
  it('corta los intentos repetidos de inicio de sesion con 429', async () => {
    userModel.buscarPorEmailConHash.mockResolvedValue(null);

    let ultimo = null;

    for (let intento = 0; intento < 12; intento += 1) {
      ultimo = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ana@ejemplo.com', password: 'Incorrecta123' });
    }

    expect(ultimo.status).toBe(429);
    expect(ultimo.headers['retry-after']).toBeDefined();
  });

  it('no cuenta el cupo de acceso contra las rutas de lectura', async () => {
    tripModel.listar.mockResolvedValue({ viajes: [], total: 0 });

    for (let intento = 0; intento < 12; intento += 1) {
      await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'x' });
    }

    const respuesta = await request(app).get('/api/trips');

    expect(respuesta.status).toBe(200);
  });
});

describe('Contaminacion de parametros (mismo campo repetido)', () => {
  /* ?estado=activa&estado=x llega como arreglo, y los validadores esperan un
     valor suelto. Sin normalizar, isInt e isIn revientan y la peticion termina
     en 500: un error interno que cualquiera puede provocar repitiendo un
     parametro. Se conserva el ultimo valor y se sigue validando igual. */
  it('no revienta con un estado repetido y valida el ultimo valor', async () => {
    const token = tokenDe(USUARIO);
    reservationModel.listar.mockResolvedValue({ reservaciones: [], total: 0 });

    const respuesta = await request(app)
      .get('/api/reservations?estado=activa&estado=cancelada')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
    expect(reservationModel.listar.mock.calls[0][0].filtros.estado).toBe('cancelada');
  });

  it('sigue rechazando un estado repetido si el ultimo valor es invalido', async () => {
    const token = tokenDe(USUARIO);

    const respuesta = await request(app)
      .get('/api/reservations?estado=activa&estado=inventado')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(400);
  });

  it('no revienta con un rol repetido', async () => {
    const token = tokenDe(ADMINISTRADOR);
    userModel.listar.mockResolvedValue({ usuarios: [], total: 0 });

    const respuesta = await request(app)
      .get('/api/users?rol=usuario&rol=administrador')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
    expect(userModel.listar.mock.calls[0][0].filtros.rol).toBe('administrador');
  });

  it('no revienta con una pagina repetida', async () => {
    tripModel.listar.mockResolvedValue({ viajes: [], total: 0 });

    const respuesta = await request(app).get('/api/trips?pagina=1&pagina=2');

    expect(respuesta.status).toBe(200);
    expect(tripModel.listar.mock.calls[0][0].pagina).toBe(2);
  });

  it('descarta un parametro anidado en lugar de fallar', async () => {
    tripModel.listar.mockResolvedValue({ viajes: [], total: 0 });

    const respuesta = await request(app).get('/api/trips?destino[malicioso]=x');

    expect(respuesta.status).toBe(200);
    expect(tripModel.listar.mock.calls[0][0].filtros.destino).toBeNull();
  });

  it('limpia los metacaracteres cuando se repite la busqueda de usuarios', async () => {
    const token = tokenDe(ADMINISTRADOR);
    userModel.listar.mockResolvedValue({ usuarios: [], total: 0 });

    const respuesta = await request(app)
      .get('/api/users?busqueda=ana&busqueda=rol.eq.administrador')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(200);

    // El arreglo se vuelve "ana,rol.eq.administrador" al convertirse a texto;
    // la lista blanca tiene que dejarlo sin la coma que separa condiciones.
    const { busqueda } = userModel.listar.mock.calls[0][0].filtros;

    expect(busqueda).not.toContain(',');
  });
});

describe('Enumeracion de cuentas por tiempo de respuesta', () => {
  it('compara contra un hash de descarte cuando el correo no existe', async () => {
    const password = require('../../src/utils/password.util');
    const espia = jest.spyOn(password, 'verificarInexistente');

    userModel.buscarPorEmailConHash.mockResolvedValue(null);

    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@ejemplo.com', password: 'Cualquiera123' });

    expect(respuesta.status).toBe(401);
    expect(espia).toHaveBeenCalled();

    espia.mockRestore();
  });

  it('responde el mismo mensaje exista o no la cuenta', async () => {
    userModel.buscarPorEmailConHash.mockResolvedValue(null);

    const inexistente = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@ejemplo.com', password: 'Cualquiera123' });

    userModel.buscarPorEmailConHash.mockResolvedValue({
      ...USUARIO,
      password_hash: '$2b$04$CwTycUXWue0Thq9StjUM0uJ8.4Fu9tGBiSDoZ0Zc6BQnQ3Yl0kK2W',
    });

    const contrasenaMala = await request(app)
      .post('/api/auth/login')
      .send({ email: USUARIO.email, password: 'Incorrecta123' });

    expect(inexistente.status).toBe(contrasenaMala.status);
    expect(inexistente.body.mensaje).toBe(contrasenaMala.body.mensaje);
  });
});

describe('Cabeceras y fuga de informacion', () => {
  it('no anuncia el motor del servidor', async () => {
    const respuesta = await request(app).get('/api/health');

    expect(respuesta.headers['x-powered-by']).toBeUndefined();
  });

  it('aplica las cabeceras de helmet', async () => {
    const respuesta = await request(app).get('/api/health');

    expect(respuesta.headers['x-content-type-options']).toBe('nosniff');
    expect(respuesta.headers['content-security-policy']).toBeDefined();
  });

  it('no permite ningun origen externo por omision', async () => {
    const respuesta = await request(app)
      .get('/api/health')
      .set('Origin', 'https://sitio-de-otro.example');

    expect(respuesta.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('nunca devuelve el hash de la contrasena', async () => {
    userModel.buscarPorEmailConHash.mockResolvedValue({
      ...USUARIO,
      password_hash: '$2b$10$abcdefghijklmnopqrstuv',
    });

    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ email: USUARIO.email, password: 'Viajero123' });

    expect(JSON.stringify(respuesta.body)).not.toContain('password_hash');
    expect(JSON.stringify(respuesta.body)).not.toContain('$2b$');
  });
});

describe('Limites de tamano del cuerpo', () => {
  it('rechaza un cuerpo JSON por encima del limite', async () => {
    const respuesta = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ nombre: 'a'.repeat(20000), email: 'a@b.com', password: 'Segura123' }));

    expect(respuesta.status).toBe(413);
  });
});
