# Evidencias de Aaron Salazar Salazar Villalobos

Fragmentos de codigo que sustentan cada criterio de aceptacion de sus 18
tickets. Cada bloque indica el archivo y el rango de lineas para adjuntarlo en
Jira junto con la captura del comportamiento.

Los numeros de linea corresponden al arbol de trabajo actual. Si al preparar el
commit se reordena un archivo, se vuelven a verificar antes de adjuntar.

Referencias: [Plan de evidencias](./plan-evidencias.md), [API REST](./api.md),
[Requerimientos](../Requerimientos.md).

---

# Bloque A — Autenticacion

## SCRUM-75 · Registro de usuarios · RF-01, RF-19, RNF-02

### E1. Endpoint funcional

`src/routes/auth.routes.js:11`

```js
router.post('/register', reglasRegistro, validar, authController.registrar);
```

`src/controllers/auth.controller.js:17-27`

```js
const registrar = asyncHandler(async (req, res) => {
  const { nombre, email, password } = req.body;
  const { usuario, token } = await authService.registrar({ nombre, email, password });

  res.cookie(COOKIE_SESION, token, OPCIONES_COOKIE);

  return exito(res, {
    estado: 201,
    mensaje: 'Cuenta creada correctamente.',
    datos: { usuario, token },
  });
});
```

### E2. Validacion de formato de correo

`src/validators/auth.validator.js:13-22`

```js
  body('email')
    .trim()
    .notEmpty()
    .withMessage('El correo electronico es obligatorio.')
    .isEmail()
    .withMessage('El correo electronico no tiene un formato valido.')
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: 255 })
    .withMessage('El correo electronico es demasiado largo.'),
```

### E3. Validacion de contrasena segura

`src/validators/auth.validator.js:24-33`

```js
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
```

Cuatro capturas, una por regla incumplida.

### E4. Prevencion de correos duplicados

Tres capas. Adjuntar las tres, porque juntas prueban que el candado no depende
solo del codigo de aplicacion.

`src/services/auth.service.js:15-20` — comprobacion en el servicio:

```js
  const emailNormalizado = normalizarEmail(email);

  if (await userModel.existeEmail(emailNormalizado)) {
    throw ApiError.conflicto(MENSAJES.EMAIL_YA_REGISTRADO);
  }
```

`database/schema.sql:12-13` — candado en la base:

```sql
create unique index if not exists usuarios_email_lower_idx
  on public.usuarios (lower(email));
```

`src/models/user.model.js:17-23` — traduccion del choque de indice a 409:

```js
function traducirError(error) {
  if (error.code === '23505') {
    return ApiError.conflicto(MENSAJES.EMAIL_YA_REGISTRADO);
  }

  return ApiError.interno(`Error de base de datos: ${error.message}`);
}
```

### E5. Cifrado de contrasena con hash

`src/utils/password.util.js:6-16`

```js
async function hashear(plana) {
  return bcrypt.hash(plana, config.saltRounds);
}

async function verificar(plana, hash) {
  if (!plana || !hash) {
    return false;
  }

  return bcrypt.compare(plana, hash);
}
```

`src/services/auth.service.js:21` — el hash se calcula antes de tocar la base:

```js
  const passwordHash = await password.hashear(passwordPlano);
```

Acompanar con la captura de la fila en Supabase mostrando el prefijo `$2b$10$`.

### E6. Registro almacenado en la tabla usuarios

`src/models/user.model.js:67-79`

```js
async function crear({ nombre, email, passwordHash, rol }) {
  const { data, error } = await supabase
    .from(TABLAS.USUARIOS)
    .insert({ nombre, email, password_hash: passwordHash, rol })
    .select(CAMPOS_PUBLICOS)
    .single();

  if (error) {
    throw traducirError(error);
  }

  return data;
}
```

### E7. Asignacion correcta del rol por defecto

`src/services/auth.service.js:23-28` — el rol no se lee del cuerpo de la
peticion, se fija en el servicio:

```js
  const usuario = await userModel.crear({
    nombre: String(nombre).trim(),
    email: emailNormalizado,
    passwordHash,
    rol: ROLES.USUARIO,
  });
```

`src/config/constants.js:3-6`

```js
const ROLES = Object.freeze({
  USUARIO: 'usuario',
  ADMINISTRADOR: 'administrador',
});
```

`database/schema.sql:6` — el mismo limite en la base:

```sql
  rol            text        not null default 'usuario' check (rol in ('usuario', 'administrador')),
```

### E8. Prueba automatizada

`tests/integration/auth.routes.test.js:20-101`, seis casos bajo
`describe('POST /api/auth/register (RF-01)')`. Adjuntar la salida de:

```bash
npm test -- auth.routes
```

---

## SCRUM-76 · Inicio de sesion · RF-02, RNF-03

### E1. Endpoint funcional

`src/routes/auth.routes.js:12` y `src/controllers/auth.controller.js:29-38`

```js
const iniciarSesion = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { usuario, token } = await authService.iniciarSesion({ email, password });

  res.cookie(COOKIE_SESION, token, OPCIONES_COOKIE);

  return exito(res, {
    mensaje: 'Inicio de sesion exitoso.',
    datos: { usuario, token },
  });
});
```

### E2 y E3. Validacion de credenciales y mensaje unico

`src/services/auth.service.js:35-49` — los dos caminos de fallo devuelven el
mismo texto. Es deliberado: distinguirlos permitiria averiguar que correos estan
registrados en el sistema.

```js
async function iniciarSesion({ email, password: passwordPlano }) {
  const emailNormalizado = normalizarEmail(email);
  const usuario = await userModel.buscarPorEmailConHash(emailNormalizado);

  if (!usuario) {
    logger.advertencia('Intento de login con correo inexistente', { email: emailNormalizado });
    throw ApiError.noAutenticado(MENSAJES.CREDENCIALES_INVALIDAS);
  }

  const coincide = await password.verificar(passwordPlano, usuario.password_hash);

  if (!coincide) {
    logger.advertencia('Intento de login con contrasena incorrecta', { id: usuario.id });
    throw ApiError.noAutenticado(MENSAJES.CREDENCIALES_INVALIDAS);
  }
```

### E4. Generacion del token JWT

`src/utils/jwt.util.js:8-12`

```js
function firmar(usuario) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol }, config.secreto, {
    expiresIn: config.expiracion,
  });
}
```

Acompanar con la captura del payload decodificado en jwt.io.

### E5. El token abre las rutas protegidas

`src/middlewares/auth.middleware.js:21-41`

```js
const requiereAutenticacion = asyncHandler(async (req, res, next) => {
  const token = extraerToken(req);

  if (!token) {
    throw ApiError.noAutenticado(MENSAJES.TOKEN_FALTANTE);
  }

  const payload = jwtUtil.verificar(token);
  const usuario = await userModel.buscarPorId(payload.sub);

  if (!usuario) {
    throw ApiError.noAutenticado(MENSAJES.TOKEN_INVALIDO);
  }

  if (!usuario.activo) {
    throw ApiError.prohibido(MENSAJES.CUENTA_DESACTIVADA);
  }

  req.usuario = usuario;
  return next();
});
```

El token no basta por si solo: cada peticion relee al usuario, asi que una
cuenta desactivada deja de entrar aunque su token siga vigente.

### E6. Cuenta desactivada

`src/services/auth.service.js:51-53`

```js
  if (!usuario.activo) {
    throw ApiError.prohibido(MENSAJES.CUENTA_DESACTIVADA);
  }
```

### E7. Sin fuga del hash

`src/services/auth.service.js:55` y `src/models/user.model.js:8`

```js
  delete usuario.password_hash;
```

```js
const CAMPOS_PUBLICOS = 'id, nombre, email, rol, activo, creado_en';
```

`buscarPorEmailConHash` es la unica consulta que pide `password_hash`, y el
servicio lo borra antes de responder.

### E8. Prueba automatizada

`tests/integration/auth.routes.test.js:103-170`, cinco casos bajo
`describe('POST /api/auth/login (RF-02)')`.

---

## SCRUM-77 · Cierre de sesion · RF-03

### E1 y E2. Endpoint y limpieza del token

`src/routes/auth.routes.js:14` y `src/controllers/auth.controller.js:41-45`

```js
const cerrarSesion = asyncHandler(async (req, res) => {
  res.clearCookie(COOKIE_SESION, OPCIONES_COOKIE);

  return exito(res, { mensaje: 'Sesion cerrada correctamente.' });
});
```

### E3. Cookie endurecida

`src/controllers/auth.controller.js:10-15`

```js
const OPCIONES_COOKIE = Object.freeze({
  httpOnly: true,
  sameSite: 'lax',
  secure: esProduccion,
  path: '/',
});
```

`httpOnly` impide que un script lea el token; `sameSite: 'lax'` corta el envio
en peticiones de terceros; `secure` obliga a HTTPS en produccion.

### E4. Sin sesion no hay cierre

`src/middlewares/auth.middleware.js:24-26`

```js
  if (!token) {
    throw ApiError.noAutenticado(MENSAJES.TOKEN_FALTANTE);
  }
```

### E5. Aclaracion obligatoria en el ticket

El criterio dice "invalidar sesion". Lo implementado borra la cookie: el JWT
sigue siendo valido hasta que expira, porque no hay lista negra de tokens. El
unico corte real del lado del servidor es el de `auth.middleware.js:35-37`, que
rechaza al usuario desactivado en cada peticion. Escribirlo asi en Jira.

---

# Bloque B — Base de datos

## SCRUM-71 · Tabla Reservaciones · RNF-09, RNF-14

### E1. Definicion de la tabla

`database/schema.sql:63-79`

```sql
-- Arranca en 7842 para que el primer folio coincida con el TT-007842 de las maquetas.
create sequence if not exists public.reservaciones_folio_seq start with 7842;

create table if not exists public.reservaciones (
  id              uuid          primary key default gen_random_uuid(),
  folio           text          not null unique
                                default 'TT-' || lpad(nextval('public.reservaciones_folio_seq')::text, 6, '0'),
  usuario_id      uuid          not null references public.usuarios (id) on delete cascade,
  viaje_id        uuid          not null references public.viajes (id) on delete restrict,
  estado          text          not null default 'activa'
                                check (estado in ('activa', 'cancelada', 'completada')),
  precio_unitario numeric(10,2) not null check (precio_unitario > 0),
  impuestos       numeric(10,2) not null check (impuestos >= 0),
  total           numeric(10,2) not null check (total > 0),
  metodo_pago     text          not null default 'tarjeta' check (metodo_pago in ('tarjeta', 'paypal')),
  creado_en       timestamptz   not null default now(),
  actualizado_en  timestamptz   not null default now(),
  cancelado_en    timestamptz
);
```

### E2. Las dos llaves foraneas con politica distinta

Es el detalle que conviene explicar en el ticket:

- `usuario_id ... on delete cascade`: si se borra la cuenta, sus reservaciones
  se van con ella.
- `viaje_id ... on delete restrict`: un viaje con reservaciones **no se puede
  borrar**. Por eso la baja de viajes es logica.

### E3. Indices

`database/schema.sql:82-87`

```sql
create unique index if not exists reservaciones_activa_unica_idx
  on public.reservaciones (usuario_id, viaje_id)
  where estado = 'activa';

create index if not exists reservaciones_usuario_id_idx on public.reservaciones (usuario_id);
create index if not exists reservaciones_viaje_id_idx on public.reservaciones (viaje_id);
```

### E4. Disparador de fecha de actualizacion

`database/schema.sql:89-92`

```sql
drop trigger if exists reservaciones_set_actualizado_en on public.reservaciones;
create trigger reservaciones_set_actualizado_en
  before update on public.reservaciones
  for each row execute function public.set_actualizado_en();
```

Captura de `actualizado_en` antes y despues de un `update`.

---

## SCRUM-67 · Modelo entidad-relacion · RNF-09

No existe el diagrama en el repositorio. Las imagenes de `vistas/` son maquetas
de interfaz, no un modelo de datos.

El diagrama se deriva de `database/schema.sql`. Estructura a dibujar:

```
usuarios (1) ──────< (N) reservaciones (N) >────── (1) viajes
```

| Entidad | Llave primaria | Atributos | Relacion |
|---|---|---|---|
| `usuarios` | `id` uuid | nombre, email, password_hash, rol, activo, creado_en, actualizado_en | 1 a N con reservaciones, borrado en cascada |
| `viajes` | `id` uuid | titulo, destino, descripcion, itinerario, precio, fecha_salida, fecha_regreso, duracion_dias, cupos_totales, cupos_disponibles, imagen_url, activo | 1 a N con reservaciones, borrado restringido |
| `reservaciones` | `id` uuid | folio, usuario_id, viaje_id, estado, precio_unitario, impuestos, total, metodo_pago, creado_en, cancelado_en | tabla intermedia con atributos propios |

Nota que conviene incluir: `duracion_dias` es una columna generada, no
capturada.

`database/schema.sql:44`

```sql
  duracion_dias     integer       generated always as ((fecha_regreso - fecha_salida) + 1) stored,
```

---

## SCRUM-69 · Tabla Roles · RF-17

**No hay tabla `roles`.** El rol es una columna con restriccion de valores.

`database/schema.sql:6`

```sql
  rol            text        not null default 'usuario' check (rol in ('usuario', 'administrador')),
```

`src/config/constants.js:3-6`

```js
const ROLES = Object.freeze({
  USUARIO: 'usuario',
  ADMINISTRADOR: 'administrador',
});
```

`src/middlewares/role.middleware.js:6-20` — donde se aplica el rol:

```js
function requiereRol(...rolesPermitidos) {
  return function verificarRol(req, res, next) {
    if (!req.usuario) {
      return next(ApiError.noAutenticado(MENSAJES.TOKEN_FALTANTE));
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return next(ApiError.prohibido(MENSAJES.SIN_PERMISOS));
    }

    return next();
  };
}

const requiereAdministrador = requiereRol(ROLES.ADMINISTRADOR);
```

**Justificacion a escribir en el ticket:** un catalogo cerrado de dos valores,
sin atributos propios y sin previsiones de crecer, no gana nada con una tabla y
una llave foranea. La restriccion `check` da la misma integridad referencial con
una consulta menos por cada lectura de usuario. Si el criterio del ticket exige
la tabla, se abre como cambio de modelo aparte.

---

## SCRUM-73 · Politicas RLS en Supabase · RNF-09

`database/policies.sql` completo, 16 lineas:

```sql
alter table public.usuarios enable row level security;
revoke all on public.usuarios from anon, authenticated;

alter table public.viajes enable row level security;
revoke all on public.viajes from anon, authenticated;

alter table public.reservaciones enable row level security;
revoke all on public.reservaciones from anon, authenticated;

revoke all on sequence public.reservaciones_folio_seq from anon, authenticated;

revoke execute on function public.crear_reservacion(uuid, uuid, text, numeric)
  from anon, authenticated;
revoke execute on function public.cancelar_reservacion(uuid, uuid, boolean)
  from anon, authenticated;
```

**Justificacion a escribir en el ticket:** no hay politicas por fila porque
ningun cliente habla con Supabase directamente. Todo el acceso pasa por el
backend con la llave de servicio, y la autorizacion vive en dos middlewares:

- `src/middlewares/auth.middleware.js:21-41` — identidad.
- `src/middlewares/role.middleware.js:6-20` — permisos por rol.

Con RLS activado y `revoke all`, la superficie expuesta a las llaves publicas es
cero. Adjuntar ademas la captura del intento de lectura con la llave `anon`
siendo rechazado.

---

# Bloque C — Reservaciones

## SCRUM-92 · Crear reservacion · RF-08

### E1. Endpoint

`src/routes/reservation.routes.js:16-22`

```js
router.use(requiereAutenticacion);

router.get('/', reglasListar, validar, reservationController.listar);
router.get('/:id', reglasId, validar, reservationController.detalle);

router.post('/', reglasCrear, validar, reservationController.crear);
```

### E2. El titular sale del token, no del cuerpo

`src/controllers/reservation.controller.js:32-45`

```js
const crear = asyncHandler(async (req, res) => {
  const reservacion = await reservationService.crear({
    usuario: req.usuario,
    viajeId: req.body.viaje_id,
    metodoPago: req.body.metodo_pago,
  });

  return exito(res, {
    estado: 201,
    mensaje: 'Reservacion confirmada correctamente.',
    datos: { reservacion },
  });
});
```

`src/services/reservation.service.js:71-79`

```js
async function crear({ usuario, viajeId, metodoPago }) {
  const nueva = await reservationModel.crear({
    usuarioId: usuario.id,
    viajeId,
    metodoPago: valorDeLista(metodoPago, METODOS_VALIDOS) || METODOS_PAGO.TARJETA,
    tasaImpuesto: TASA_IMPUESTO,
  });
```

Enviar `usuario_id` de otra persona en el cuerpo y mostrar que se ignora.

### E3. Registro y descuento de cupo en una transaccion

`src/models/reservation.model.js:110-124`

```js
async function crear({ usuarioId, viajeId, metodoPago, tasaImpuesto }) {
  const { data, error } = await supabase.rpc('crear_reservacion', {
    p_usuario_id: usuarioId,
    p_viaje_id: viajeId,
    p_metodo_pago: metodoPago,
    p_tasa_impuesto: tasaImpuesto,
  });

  if (error) {
    throw traducirError(error);
  }

  return data;
}
```

`database/schema.sql:134-147` — el insert y el descuento, juntos:

```sql
  insert into public.reservaciones (
    usuario_id, viaje_id, precio_unitario, impuestos, total, metodo_pago
  )
  values (
    p_usuario_id, p_viaje_id, v_viaje.precio, v_impuestos,
    v_viaje.precio + v_impuestos, p_metodo_pago
  )
  returning * into v_reservacion;

  update public.viajes
    set cupos_disponibles = cupos_disponibles - 1
    where id = p_viaje_id;
```

### E4. Calculo del total

`database/schema.sql:132` y `src/config/constants.js:21`

```sql
  v_impuestos := round(v_viaje.precio * p_tasa_impuesto, 2);
```

```js
const TASA_IMPUESTO = 0.16;
```

### E5. Pruebas

`tests/integration/reservation.routes.test.js:204-303`,
`describe('POST /api/reservations (RF-08, RF-11, RF-12)')`, siete casos.

---

## SCRUM-95 · Validar disponibilidad · RF-11

### E1. Las cuatro validaciones, con la fila bloqueada

`database/schema.sql:110-130` — este es el fragmento central del ticket:

```sql
  select * into v_viaje
    from public.viajes
    where id = p_viaje_id
    for update;

  if not found then
    raise exception 'El viaje no existe.' using errcode = 'TT001';
  end if;

  if not v_viaje.activo then
    raise exception 'El viaje no esta disponible.' using errcode = 'TT004';
  end if;

  if v_viaje.fecha_salida <= current_date then
    raise exception 'El viaje ya salio.' using errcode = 'TT005';
  end if;

  if v_viaje.cupos_disponibles < 1 then
    raise exception 'El viaje no tiene cupos disponibles.' using errcode = 'TT002';
  end if;
```

### E2. Por que la validacion vive en la base y no en el servicio

`database/schema.sql:94-96` — el comentario que justifica la decision:

```sql
-- RF-08 y RF-11: supabase-js no abre transacciones, asi que validar el cupo y descontarlo
-- desde el servicio dejaria una ventana en la que dos reservaciones simultaneas pasan del
-- limite. El bloqueo de la fila del viaje y el insert ocurren aqui, en una sola transaccion.
```

El `for update` bloquea la fila del viaje hasta que la transaccion termina, asi
que dos peticiones sobre el ultimo lugar se serializan.

### E3. Traduccion de los codigos de negocio a HTTP

`src/config/constants.js:25-34`

```js
const ERRORES_RESERVACION = Object.freeze({
  VIAJE_NO_EXISTE: 'TT001',
  SIN_CUPOS: 'TT002',
  DUPLICADA: 'TT003',
  VIAJE_INACTIVO: 'TT004',
  VIAJE_YA_SALIO: 'TT005',
  NO_EXISTE: 'TT006',
  AJENA: 'TT007',
  NO_ACTIVA: 'TT008',
});
```

`src/models/reservation.model.js:22-31`

```js
const POR_CODIGO = Object.freeze({
  [ERRORES_RESERVACION.VIAJE_NO_EXISTE]: () => ApiError.noEncontrado(MENSAJES.VIAJE_NO_ENCONTRADO),
  [ERRORES_RESERVACION.SIN_CUPOS]: () => ApiError.conflicto(MENSAJES.VIAJE_SIN_CUPOS),
  [ERRORES_RESERVACION.DUPLICADA]: () => ApiError.conflicto(MENSAJES.RESERVACION_DUPLICADA),
  [ERRORES_RESERVACION.VIAJE_INACTIVO]: () => ApiError.conflicto(MENSAJES.VIAJE_NO_DISPONIBLE),
  [ERRORES_RESERVACION.VIAJE_YA_SALIO]: () => ApiError.conflicto(MENSAJES.VIAJE_YA_SALIO),
  [ERRORES_RESERVACION.NO_EXISTE]: () => ApiError.noEncontrado(MENSAJES.RESERVACION_NO_ENCONTRADA),
  [ERRORES_RESERVACION.AJENA]: () => ApiError.prohibido(MENSAJES.RESERVACION_AJENA),
  [ERRORES_RESERVACION.NO_ACTIVA]: () => ApiError.conflicto(MENSAJES.RESERVACION_NO_ACTIVA),
});
```

Cuatro capturas de Postman, una por cada condicion, con su codigo HTTP y su
mensaje.

---

## SCRUM-96 · Evitar doble reservacion · RF-12

### E1. Constraint unico a nivel base

`database/schema.sql:80-84`

```sql
-- RF-12: el indice parcial deja repetir usuario y viaje solo si la reservacion previa
-- ya no esta activa, asi cancelar y volver a reservar sigue siendo posible.
create unique index if not exists reservaciones_activa_unica_idx
  on public.reservaciones (usuario_id, viaje_id)
  where estado = 'activa';
```

Que el indice sea **parcial** es el punto a destacar: un indice unico simple
sobre `(usuario_id, viaje_id)` impediria volver a reservar despues de cancelar,
que es un caso legitimo.

### E2. Control de concurrencia

`database/schema.sql:150-152`

```sql
exception
  when unique_violation then
    raise exception 'Ya tienes una reservacion activa para este viaje.' using errcode = 'TT003';
```

Si dos peticiones simultaneas pasan la validacion, la que llega segunda choca
contra el indice y el bloque `exception` la convierte en un error de negocio
legible en vez de un error 500 de base de datos.

### E3. Mensaje al usuario

`src/config/constants.js:81`

```js
  RESERVACION_DUPLICADA: 'Ya tienes una reservacion activa para este viaje.',
```

### E4. Secuencia completa a capturar

Reservar → **201** · reservar de nuevo → **409** · cancelar → **200** ·
reservar otra vez → **201**. Los cuatro pasos en una sola captura demuestran el
indice parcial mejor que cualquier explicacion.

### E5. Pruebas

`tests/integration/reservation.routes.test.js:253` y `:267`.

---

## SCRUM-93 · Cancelar reservacion · RF-09

### E1. No hay DELETE, hay cambio de estado

`src/routes/reservation.routes.js:24-27`

```js
// Una reservacion nunca se borra: cancelarla es cambiarle el estado, y por eso
// no hay DELETE. El mismo PATCH sirve al titular (RF-09) y al administrador
// (RF-15); el servicio decide que transiciones puede hacer cada uno.
router.patch('/:id', reglasId, reglasCambiarEstado, validar, reservationController.cambiarEstado);
```

### E2. Enrutado de la cancelacion

`src/services/reservation.service.js:91-113`

```js
async function cancelar(id, usuario) {
  await reservationModel.cancelar({
    id,
    usuarioId: usuario.id,
    esAdministrador: esAdministrador(usuario),
  });

  logger.info('Reservacion cancelada', { id, usuarioId: usuario.id });

  return reservationModel.buscarPorId(id);
}

async function cambiarEstado(id, estado, usuario) {
  if (!ESTADOS_VALIDOS.includes(estado)) {
    throw ApiError.solicitudInvalida(MENSAJES.DATOS_INVALIDOS);
  }

  if (estado === ESTADOS_RESERVACION.CANCELADA) {
    return cancelar(id, usuario);
  }

  if (!esAdministrador(usuario)) {
    throw ApiError.prohibido(MENSAJES.ESTADO_NO_PERMITIDO);
  }
```

Cancelar es la unica transicion que puede hacer un usuario normal.

### E3. Cambio de estado y liberacion del lugar

`database/schema.sql:170-185`

```sql
  if not p_es_administrador and v_reservacion.usuario_id <> p_usuario_id then
    raise exception 'La reservacion no te pertenece.' using errcode = 'TT007';
  end if;

  if v_reservacion.estado <> 'activa' then
    raise exception 'La reservacion ya no esta activa.' using errcode = 'TT008';
  end if;

  update public.reservaciones
    set estado = 'cancelada',
        cancelado_en = now()
    where id = p_reservacion_id
    returning * into v_reservacion;

  update public.viajes
    set cupos_disponibles = least(cupos_disponibles + 1, cupos_totales)
    where id = v_reservacion.viaje_id;
```

El `least(..., cupos_totales)` impide que una doble cancelacion infle los cupos
por encima del original. Vale la pena senalarlo en el ticket.

### E4. No se reactiva una cancelada

`src/services/reservation.service.js:118-121`

```js
  // Reactivar una cancelada exigiria volver a tomar un cupo que ya se libero.
  if (actual.estado === ESTADOS_RESERVACION.CANCELADA) {
    throw ApiError.conflicto(MENSAJES.RESERVACION_NO_ACTIVA);
  }
```

### E5. Correccion del criterio

El ticket pide "notificacion al usuario". El RF-09 solo exige actualizar el
estado y liberar el lugar, y no hay servicio de correo en el alcance. Quitar ese
punto del criterio de aceptacion.

---

## SCRUM-94 · Consultar reservaciones · RF-10

### E1. Cada quien ve solo lo suyo

`src/services/reservation.service.js:40-67` — la linea decisiva es el ternario
de `usuarioId`:

```js
// Un usuario solo ve las suyas; el administrador ve todas y puede acotarlas por
// titular con el parametro usuario_id (RF-10 y RF-15).
async function listar({ usuario, usuarioId, viajeId, estado, metodoPago, desde, hasta, pagina, limite } = {}) {
  const paginado = paginacion.normalizar({ pagina, limite });

  const { reservaciones, total } = await reservationModel.listar({
    filtros: {
      usuarioId: esAdministrador(usuario) ? usuarioId || null : usuario.id,
      viajeId: viajeId || null,
      estado: valorDeLista(estado, ESTADOS_VALIDOS),
      metodoPago: valorDeLista(metodoPago, METODOS_VALIDOS),
      desde: desde || null,
      hasta: hasta || null,
    },
    pagina: paginado.pagina,
    limite: paginado.limite,
  });
```

Un usuario normal no puede ampliar el alcance: aunque mande `usuario_id` en la
consulta, el filtro se sobrescribe con el suyo.

### E2. Acceso al detalle

`src/services/reservation.service.js:26-37`

```js
async function obtenerDetalle(id, usuario) {
  const reservacion = await reservationModel.buscarPorId(id);

  if (!reservacion) {
    throw ApiError.noEncontrado(MENSAJES.RESERVACION_NO_ENCONTRADA);
  }

  if (!esAdministrador(usuario) && reservacion.usuario_id !== usuario.id) {
    throw ApiError.prohibido(MENSAJES.RESERVACION_AJENA);
  }

  return reservacion;
}
```

### E3. Datos anidados en una sola consulta

`src/models/reservation.model.js:9-18`

```js
const CAMPOS_PROPIOS =
  'id, folio, usuario_id, viaje_id, estado, precio_unitario, impuestos, total, ' +
  'metodo_pago, creado_en, cancelado_en';

const CAMPOS_CON_VIAJE =
  `${CAMPOS_PROPIOS}, ` +
  'viaje:viajes(id, titulo, destino, imagen_url, fecha_salida, fecha_regreso, duracion_dias)';

const CAMPOS_COMPLETOS = `${CAMPOS_CON_VIAJE}, usuario:usuarios(id, nombre, email)`;
```

Evita una consulta por fila. Sirve tambien como evidencia de RNF-01.

### E4. Filtros y paginacion

`src/validators/reservation.validator.js:17-57` (reglas de la consulta) y
`src/models/reservation.model.js:41-82` (aplicacion de los filtros).

Capturas de `?estado=activa`, `?viaje_id=`, `?desde=&hasta=`,
`?metodo_pago=` y `?pagina=2&limite=5`.

### E5. Pruebas

`tests/integration/reservation.routes.test.js:61-202`, once casos entre
`GET /api/reservations` y `GET /api/reservations/:id`.

---

# Bloque D — Viajes, backend

## SCRUM-85 · Endpoint editar viaje · RF-13

### E1. Control de permisos, que es lo que pide el ticket

`src/routes/trip.routes.js:23-24`

```js
router.put('/:id', requiereAutenticacion, requiereAdministrador,
  reglasId, reglasActualizar, validar, tripController.actualizar);
```

Cuatro capas en orden: identidad, rol, formato del id, formato del cuerpo.
Capturar el **401** sin token y el **403** con token de usuario normal.

### E2. Actualizacion parcial

`src/services/trip.service.js:59-67` y `:152-158`

```js
function normalizarCampos(datos) {
  return Object.keys(NORMALIZADORES).reduce((limpios, clave) => {
    if (datos[clave] !== undefined) {
      limpios[clave] = NORMALIZADORES[clave](datos[clave]);
    }

    return limpios;
  }, {});
}
```

```js
async function actualizar(id, datos) {
  const actual = await obtenerDetalle(id);
  const cambios = normalizarCampos(datos);

  if (Object.keys(cambios).length === 0) {
    throw ApiError.solicitudInvalida(MENSAJES.DATOS_INVALIDOS);
  }
```

Solo viaja a la base lo que el cliente mando. Enviar unicamente `precio` y
mostrar que el resto no cambia.

### E3. Coherencia de fechas y cupos

`src/services/trip.service.js:160-169`

```js
  if (cambios.fechaSalida !== undefined && cambios.fechaSalida < hoyISO()) {
    throw ApiError.solicitudInvalida(MENSAJES.FECHA_SALIDA_PASADA);
  }

  validarCoherencia({
    fechaSalida: cambios.fechaSalida ?? actual.fecha_salida,
    fechaRegreso: cambios.fechaRegreso ?? actual.fecha_regreso,
    cuposTotales: cambios.cuposTotales ?? actual.cupos_totales,
    cuposDisponibles: cambios.cuposDisponibles ?? actual.cupos_disponibles,
  });
```

`src/services/trip.service.js:69-77`

```js
function validarCoherencia({ fechaSalida, fechaRegreso, cuposTotales, cuposDisponibles }) {
  if (fechaRegreso < fechaSalida) {
    throw ApiError.solicitudInvalida(MENSAJES.FECHAS_INCOHERENTES);
  }

  if (cuposDisponibles > cuposTotales) {
    throw ApiError.solicitudInvalida(MENSAJES.CUPOS_INCOHERENTES);
  }
}
```

El `??` es el detalle a explicar: se valida el estado resultante mezclando lo
enviado con lo que ya estaba, no solo los campos nuevos. Sin eso, cambiar solo
la fecha de regreso podria dejar el viaje con fechas invertidas.

### E4. Registro del evento

`src/services/trip.service.js:177`

```js
  logger.info('Viaje actualizado', { id: viaje.id, campos: Object.keys(cambios) });
```

Evidencia de RNF-15. Adjuntar la linea del archivo de bitacora.

---

# Bloque E — Consola de administracion, frontend

Todas las capturas van en escritorio y telefono (RNF-08) y en dos navegadores
(RNF-07).

## SCRUM-103 · Formulario crear viaje

### E1. Armado del cuerpo de la peticion

`public/js/admin/forms.js:240-271`

```js
  function datosDelViaje(formulario) {
    var datos = new global.FormData(formulario);
    var activo = documento.getElementById('activo');

    var viaje = {
      titulo: datos.get('titulo'),
      destino: datos.get('destino'),
      descripcion: datos.get('descripcion'),
      itinerario: leerItinerario(),
      precio: Number(datos.get('precio')),
      fecha_salida: datos.get('fecha_salida'),
      fecha_regreso: datos.get('fecha_regreso'),
      cupos_totales: Number(datos.get('cupos_totales')),
      imagen_url: datos.get('imagen_url'),
    };

    if (activo) {
      viaje.activo = activo.type === 'checkbox' ? activo.checked : activo.value === 'true';
    }

    return viaje;
  }

  function iniciarAltaDeViaje(formulario) {
    conectar(
      formulario,
      function () {
        return global.Api.post('/trips', datosDelViaje(formulario));
      },
      '/admin/trips'
    );
  }
```

### E2. Envio, bloqueo de botones y pintado de errores

`public/js/admin/forms.js:214-238`

```js
  function conectar(formulario, enviar, destino) {
    var botones = botonesDe(formulario);

    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();
      limpiarErrores(formulario);
      mostrar(documento.getElementById('form-error'), false);

      botones.forEach(function (boton) {
        boton.disabled = true;
      });

      enviar()
        .then(function () {
          global.location.href = destino;
        })
        .catch(function (fallo) {
          botones.forEach(function (boton) {
            boton.disabled = false;
          });

          pintarErrores(formulario, fallo);
        });
    });
  }
```

El `disabled` durante el envio evita el alta duplicada por doble clic. Es un
detalle que suele preguntarse en la revision.

### E3. Errores de la API pintados en el formulario

`public/js/admin/forms.js:196-206`

```js
      if (campo) {
        campo.classList.add('border-error');
        campo.setAttribute('aria-invalid', 'true');
      }
```

Evidencia de RF-20 y de accesibilidad: el error se marca en el campo, no solo en
un mensaje suelto.

### E4. Vista

`src/views/pages/admin/trip-new.pug` (143 lineas). Adjuntar la captura y el
fragmento del bloque de itinerario.

---

## SCRUM-107 · CRUD de viajes, interfaz

### E1. Baja con salida alternativa

`public/js/admin/trips.js:253-286` — el fragmento mas valioso del ticket:

```js
    confirmar.addEventListener('click', function () {
      confirmar.disabled = true;

      global.Api.del('/trips/' + seleccionado)
        .then(function () {
          confirmar.disabled = false;
          dialogo.close();
          avisar('trips-success', 'El viaje se elimino del catalogo.');
          cargar();
        })
        .catch(function (fallo) {
          confirmar.disabled = false;
          avisar('delete-error', fallo.message);

          // 409: tiene reservaciones. Desactivarlo es la salida que propone la API.
          mostrar(desactivar, fallo.estado === 409);
        });
    });

    desactivar.addEventListener('click', function () {
      desactivar.disabled = true;

      global.Api.put('/trips/' + seleccionado, { activo: false })
        .then(function () {
          desactivar.disabled = false;
          dialogo.close();
          avisar('trips-success', 'El viaje se retiro del catalogo y conserva sus reservaciones.');
          cargar();
        })
```

Cuando el borrado choca con el `on delete restrict` de la llave foranea, la
interfaz ofrece retirar el viaje en lugar de dejar al administrador atorado.
Capturar la secuencia completa: intentar borrar un viaje con reservaciones →
mensaje 409 → boton de desactivar → viaje retirado.

### E2. Alternar disponibilidad desde el listado

`public/js/admin/trips.js:221`

```js
    global.Api.put('/trips/' + id, { activo: !activo })
```

### E3. La consola ve lo que el catalogo publico oculta

`public/js/admin/trips.js:1-7`

```js
/**
 * Gestion del catalogo desde la consola (RF-13).
 *
 * Lista con incluir_inactivos=1 para que el administrador vea tambien los
 * viajes retirados y los que ya salieron, que es justo lo que el catalogo
 * publico oculta.
 */
```

Captura comparando `/trips` y `/admin/trips` con los mismos datos.

### E4. Edicion pre-rellenada desde el servidor

`src/routes/web.routes.js:74-82`

```js
router.get(
  '/admin/trips/:id/edit',
  asyncHandler(async (req, res) => {
    const viaje = await tripService.obtenerDetalle(req.params.id);

    return res.render('pages/admin/trip-edit', { viaje });
  })
);
```

El formulario llega lleno en el HTML, sin una segunda llamada desde el
navegador.

---

## SCRUM-108 · CRUD de usuarios, interfaz

### E1. Edicion y asignacion de rol

`public/js/admin/users.js:258-263`

```js
      global.Api.put('/users/' + seleccionado, {
        nombre: valorDe('editar-nombre'),
        email: valorDe('editar-email'),
        rol: valorDe('editar-rol'),
        activo: valorDe('editar-activo') === 'true',
      })
```

### E2. Baja logica y reactivacion

`public/js/admin/users.js:292-302`

```js
    confirmar.addEventListener('click', function () {
      confirmar.disabled = true;

      global.Api.del('/users/' + seleccionado)
        .then(function () {
          confirmar.disabled = false;
          dialogo.close();
          avisar('users-success', 'La cuenta quedo desactivada.');
          cargar();
          cargarEstadisticas();
        })
```

`src/routes/user.routes.js:26-28` — el DELETE no borra:

```js
// La baja es logica: DELETE pone activo en false y conserva las reservaciones,
// que se irian en cascada si se borrara la fila (RF-14).
router.delete('/:id', reglasId, validar, userController.desactivar);
```

### E3. Los dos candados de negocio

Este es el material que distingue la evidencia de un CRUD generico.

`src/services/user.service.js:138-146`

```js
  const pierdePermisos = cambios.rol === ROLES.USUARIO || cambios.activo === false;

  if (pierdePermisos) {
    if (actual.id === solicitante.id) {
      throw ApiError.conflicto(MENSAJES.CUENTA_PROPIA);
    }

    await protegerUltimoAdministrador(actual);
  }
```

`src/services/user.service.js:61-63`

```js
  if (activos <= 1) {
    throw ApiError.conflicto(MENSAJES.ULTIMO_ADMINISTRADOR);
  }
```

`src/config/constants.js:86-87`

```js
  ULTIMO_ADMINISTRADOR: 'No puedes quitar el ultimo administrador del sistema.',
  CUENTA_PROPIA: 'No puedes cambiar tu propio rol ni desactivar tu cuenta.',
```

Dos capturas: intentar degradar al unico administrador, e intentar
desactivarse a si mismo.

### E4. Errores por campo en el dialogo

`public/js/admin/users.js:274-283`

```js
          (fallo.detalles || []).forEach(function (detalle) {
            var salida = formulario.querySelector('[data-error="' + detalle.campo + '"]');

            if (salida) {
              salida.textContent = detalle.mensaje;
              salida.classList.remove('hidden');
            }
          });
```

---

## SCRUM-109 · Administracion de reservaciones, interfaz

### E1. Cambio de estado desde la consola

`public/js/admin/reservations.js:225-244`

```js
    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();

      var boton = formulario.querySelector('button[type="submit"]');
      boton.disabled = true;
      avisar('estado-error', '');

      global.Api.patch('/reservations/' + seleccionada, {
        estado: documento.getElementById('nuevo-estado').value,
      })
        .then(function () {
          boton.disabled = false;
          dialogo.close();
          alGuardar();
        })
        .catch(function (fallo) {
          boton.disabled = false;
          avisar('estado-error', fallo.message);
        });
    });
```

### E2. El respaldo de que solo el administrador puede hacerlo

`src/services/reservation.service.js:112-115`

```js
  if (!esAdministrador(usuario)) {
    throw ApiError.prohibido(MENSAJES.ESTADO_NO_PERMITIDO);
  }
```

Contraste a capturar: el mismo `PATCH` con `estado: completada` funciona como
administrador y devuelve **403** `"Solo puedes cancelar tus reservaciones."`
como usuario normal. Es la prueba de RF-17 en esta pantalla.

### E3. Distintivos por estado

`public/js/admin/reservations.js:14-18`

```js
  var ESTADOS = {
    activa: { clase: 'badge-confirmada', etiqueta: 'Activa' },
    cancelada: { clase: 'badge-cancelada', etiqueta: 'Cancelada' },
    completada: { clase: 'badge-completada', etiqueta: 'Completada' },
  };
```

### E4. Listado y ficha comparten endpoint

`public/js/admin/reservations.js:178` y `:334`

```js
    global.Api.get('/reservations?' + partes.join('&'))
```

```js
      global.Api.get('/reservations/' + idDeLaRuta())
```

---

# Bloque F — Sin entregable posible

## SCRUM-154 · Filtro por numero de personas

No hay fragmento que adjuntar, y no es trabajo pendiente: el modelo de datos no
lo admite.

`database/schema.sql:69-75` — la tabla no guarda cantidad de acompanantes:

```sql
  estado          text          not null default 'activa'
                                check (estado in ('activa', 'cancelada', 'completada')),
  precio_unitario numeric(10,2) not null check (precio_unitario > 0),
  impuestos       numeric(10,2) not null check (impuestos >= 0),
  total           numeric(10,2) not null check (total > 0),
```

`database/schema.sql:145-147` — cada reservacion descuenta exactamente un lugar:

```sql
  update public.viajes
    set cupos_disponibles = cupos_disponibles - 1
    where id = p_viaje_id;
```

El RF-06 tampoco lo pide: enumera destino, precio, fecha y disponibilidad. Se
cierra como fuera de alcance, o se reabre antes como cambio de modelo de datos
con su propio ticket.

---

# Resumen de archivos por ticket

| Ticket | Archivos a adjuntar |
|---|---|
| SCRUM-75 | `auth.routes.js`, `auth.controller.js`, `auth.validator.js`, `auth.service.js`, `user.model.js`, `password.util.js`, `schema.sql`, `constants.js` |
| SCRUM-76 | `auth.service.js`, `auth.controller.js`, `jwt.util.js`, `auth.middleware.js`, `user.model.js` |
| SCRUM-77 | `auth.controller.js`, `auth.middleware.js` |
| SCRUM-67 | Diagrama nuevo derivado de `schema.sql` |
| SCRUM-69 | `schema.sql`, `constants.js`, `role.middleware.js` |
| SCRUM-71 | `schema.sql` |
| SCRUM-73 | `policies.sql`, `auth.middleware.js`, `role.middleware.js` |
| SCRUM-92 | `reservation.routes.js`, `reservation.controller.js`, `reservation.service.js`, `reservation.model.js`, `schema.sql`, `constants.js` |
| SCRUM-93 | `reservation.routes.js`, `reservation.service.js`, `schema.sql` |
| SCRUM-94 | `reservation.service.js`, `reservation.model.js`, `reservation.validator.js` |
| SCRUM-95 | `schema.sql`, `reservation.model.js`, `constants.js` |
| SCRUM-96 | `schema.sql`, `constants.js` |
| SCRUM-85 | `trip.routes.js`, `trip.service.js` |
| SCRUM-103 | `admin/forms.js`, `admin/trip-new.pug` |
| SCRUM-107 | `admin/trips.js`, `web.routes.js` |
| SCRUM-108 | `admin/users.js`, `user.service.js`, `user.routes.js`, `constants.js` |
| SCRUM-109 | `admin/reservations.js`, `reservation.service.js` |
| SCRUM-154 | Ninguno: se cierra como fuera de alcance |