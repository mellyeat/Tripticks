# Convenciones de codigo del equipo

Guia oficial de estilo, estructura y buenas practicas de **TripTicks**
(Express.js + Supabase, arquitectura MVC por capas).

Todo el codigo que se integre a `main` debe cumplir lo descrito aqui. Ante una duda no
resuelta por este documento, la referencia es el modulo de autenticacion (`src/**/auth.*`,
`src/models/user.model.js`), que es la implementacion de referencia del proyecto.

**Indice**

1. [Principios generales](#1-principios-generales)
2. [Estructura de carpetas](#2-estructura-de-carpetas)
3. [Convenciones de nomenclatura](#3-convenciones-de-nomenclatura)
4. [Estilo y formato del codigo](#4-estilo-y-formato-del-codigo)
5. [Responsabilidades por capa](#5-responsabilidades-por-capa)
6. [Buenas practicas de desarrollo](#6-buenas-practicas-de-desarrollo)
7. [Convenciones del frontend](#7-convenciones-del-frontend)
8. [Base de datos (SQL)](#8-base-de-datos-sql)
9. [Pruebas](#9-pruebas)
10. [Git y mensajes de commit](#10-git-y-mensajes-de-commit)
11. [Validacion del codigo](#11-validacion-del-codigo)
12. [Checklist de revision](#12-checklist-de-revision)

---

## 1. Principios generales

### 1.1 Idioma del codigo

El dominio se escribe **en espanol**; lo que pertenece a una libreria, al protocolo HTTP o
al estandar del lenguaje se deja **en ingles**.

| Se escribe en espanol | Se escribe en ingles |
|---|---|
| Funciones, variables y parametros propios (`registrar`, `emailNormalizado`) | APIs de librerias (`req`, `res`, `next`, `fetch`, `body`) |
| Constantes de dominio (`ROLES`, `MENSAJES`, `TABLAS`) | Rutas HTTP (`/auth/register`, `/login`, `/me`) |
| Mensajes al usuario (`'Cuenta creada correctamente.'`) | Campos de terceros (`Authorization`, `Content-Type`) |
| Tablas y columnas (`usuarios`, `creado_en`) | Palabras reservadas y metodos nativos |

```js
// Correcto: handler en espanol, API de Express en ingles.
const iniciarSesion = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { usuario, token } = await authService.iniciarSesion({ email, password });
  return exito(res, { mensaje: 'Inicio de sesion exitoso.', datos: { usuario, token } });
});
```

> `email` y `password` se mantienen en ingles de forma deliberada: son los nombres de los
> campos del contrato JSON de la API y de la tabla `usuarios`. No se traducen.

### 1.2 Sin acentos ni caracteres especiales

**Ningun archivo del repositorio lleva acentos, dieresis ni `n` con virgulilla** — ni en
identificadores, ni en cadenas de texto, ni en comentarios, ni en documentacion, ni en los
mensajes de commit. Esto evita problemas de codificacion entre Windows, Linux y la consola.

```js
// Correcto
throw ApiError.noAutenticado('Correo electronico o contrasena incorrectos.');

// Incorrecto
throw ApiError.noAutenticado('Correo electrónico o contraseña incorrectos.');
```

Aplica igual a `docs/*.md`, `database/*.sql` y al HTML (`Iniciar sesion - TripTicks`).

### 1.3 Modo estricto y sistema de modulos

Todo archivo `.js` — backend, frontend y pruebas — abre con `'use strict';`.
El proyecto usa **CommonJS** (`"type": "commonjs"` en `package.json`): se importa con
`require` y se exporta con `module.exports`. No se usa `import`/`export`.

```js
'use strict';

const express = require('express');
const authController = require('../controllers/auth.controller');

module.exports = router;
```

En el frontend, `'use strict';` va dentro de la IIFE (ver [seccion 7](#7-convenciones-del-frontend)).

---

## 2. Estructura de carpetas

```
Tripticks/
├── server.js                  Punto de entrada: escucha el puerto y arranca la app
├── package.json               Dependencias y scripts de npm
├── .env.example               Plantilla de variables de entorno (se versiona)
├── .env                       Valores reales (NUNCA se versiona)
│
├── src/                       Codigo del servidor
│   ├── app.js                 Construccion de la app Express y orden de middlewares
│   ├── config/                Configuracion e infraestructura transversal
│   │   ├── env.js             Carga y valida variables de entorno
│   │   ├── constants.js       Constantes congeladas del dominio
│   │   ├── logger.js          Bitacora en archivo y consola
│   │   └── supabase.js        Cliente unico de Supabase
│   ├── routes/                Definicion de endpoints y su cadena de middlewares
│   │   └── index.js           Enrutador raiz que monta los demas
│   ├── validators/            Reglas de express-validator por recurso
│   ├── middlewares/           Autenticacion, roles, validacion, errores, bitacora
│   ├── controllers/           Adaptan HTTP <-> servicios (capa delgada)
│   ├── services/              Reglas de negocio
│   ├── models/                Acceso a datos (unica capa que habla con Supabase)
│   ├── views/                 Plantillas Pug renderizadas en el servidor
│   │   ├── layouts/base.pug   Documento HTML, head y bloques comunes
│   │   ├── mixins/            Encabezado, pie y barras laterales reutilizables
│   │   └── pages/             Una plantilla por vista
│   │       └── admin/         Vistas exclusivas de administrador
│   └── utils/                 Utilidades sin estado y reutilizables
│
├── public/                    Recursos estaticos servidos por Express
│   ├── css/
│   │   ├── input.css          Fuente de Tailwind (se versiona)
│   │   └── output.css         CSS compilado (NO se versiona)
│   ├── js/                    Scripts de navegador, uno por vista
│   │   └── admin/             Scripts de las vistas de administrador
│   └── assets/img/            Imagenes
│
├── database/                  Scripts SQL de Supabase
│   ├── schema.sql             Tablas, indices y triggers
│   ├── policies.sql           Politicas de seguridad (RLS)
│   ├── seed.sql               Datos de prueba
│   └── backup.md              Procedimiento de respaldo
│
├── tests/
│   ├── setup.js               Variables de entorno para el entorno de prueba
│   ├── unit/                  Pruebas de funciones aisladas
│   └── integration/           Pruebas de endpoints completos
│
├── docs/                      Documentacion del proyecto
└── logs/                      Bitacoras generadas en ejecucion (NO se versionan)
```

### 2.1 Reglas de estructura

- **Un archivo por recurso y por capa.** El recurso `viajes` vive en `trip.routes.js`,
  `trip.validator.js`, `trip.controller.js`, `trip.service.js` y `trip.model.js`.
- **La dependencia siempre baja de nivel**, nunca sube ni salta capas:

  ```
  routes -> validators -> middlewares -> controllers -> services -> models -> supabase
  ```

  Un controlador no consulta la base de datos; un modelo no conoce `req` ni `res`.
- **`src/utils/` no importa a `services/`, `controllers/` ni `models/`.** Solo puede
  depender de `config/` y de librerias externas; asi se mantiene reutilizable.
- **Carpetas en minusculas y en plural** cuando agrupan piezas equivalentes
  (`controllers`, `services`, `middlewares`, `pages`). `config` y `src` son excepciones
  historicas ya establecidas.
- **No se crean carpetas nuevas de primer nivel** sin acordarlo con el equipo y
  documentarlas en esta seccion.

---

## 3. Convenciones de nomenclatura

### 3.1 Archivos

| Tipo | Patron | Ejemplos |
|---|---|---|
| Modulo de capa | `<recurso>.<capa>.js` | `auth.controller.js`, `trip.service.js`, `user.model.js` |
| Middleware | `<funcion>.middleware.js` | `auth.middleware.js`, `error.middleware.js`, `notFound.middleware.js` |
| Validador | `<recurso>.validator.js` | `auth.validator.js`, `reservation.validator.js` |
| Utilidad con sufijo | `<tema>.util.js` | `jwt.util.js`, `password.util.js` |
| Utilidad sin dominio | `camelCase.js` | `apiError.js`, `apiResponse.js`, `asyncHandler.js` |
| Configuracion | `nombre.js` en minusculas | `env.js`, `logger.js`, `constants.js`, `supabase.js` |
| Prueba | `<modulo>.test.js` | `jwt.util.test.js`, `auth.routes.test.js` |
| Vista Pug | `kebab-case.pug` | `trip-detail.pug`, `reservation-success.pug` |
| Script de vista | `kebab-case.js` (igual que su plantilla) | `trip-detail.js`, `trips.js` |

> **El nombre del recurso va en singular y en ingles** (`trip`, `user`, `reservation`),
> aunque el codigo interno este en espanol. Es la convencion ya establecida en el
> repositorio y debe respetarse para que las capas de un mismo recurso se ordenen juntas
> alfabeticamente.

`notFound.middleware.js` usa camelCase porque `notFound` es una sola palabra compuesta;
el sufijo `.middleware` sigue siendo obligatorio.

### 3.2 Identificadores en JavaScript

| Elemento | Estilo | Ejemplo real |
|---|---|---|
| Variables y parametros | `camelCase` | `emailNormalizado`, `passwordHash`, `rolesPermitidos` |
| Funciones | `camelCase`, verbo en infinitivo | `registrar`, `buscarPorId`, `normalizarEmail`, `traducirError` |
| Funciones que devuelven booleano | Prefijo `es`/`esta`/`existe`/`requiere` | `esProduccion`, `estaAutenticado`, `existeEmail`, `requiereRol` |
| Clases | `PascalCase` | `ApiError` |
| Constantes de modulo | `SCREAMING_SNAKE_CASE` | `REQUERIDAS`, `DIRECTORIO_LOGS`, `CAMPOS_PUBLICOS`, `CLAVE_TOKEN` |
| Objetos de constantes | `SCREAMING_SNAKE_CASE` + `Object.freeze` | `ROLES`, `MENSAJES`, `TABLAS`, `ESTADOS_RESERVACION` |
| Objeto de configuracion exportado | `camelCase` | `puerto`, `entorno`, `saltRounds` |
| Espacio global del navegador | `PascalCase` | `Api`, `Sesion` |

`SCREAMING_SNAKE_CASE` se reserva para valores **fijos conocidos al escribir el codigo**.
Un valor calculado en tiempo de ejecucion es `camelCase` aunque se declare con `const`:

```js
const CAMPOS_PUBLICOS = 'id, nombre, email, rol, activo, creado_en';  // fijo
const emailNormalizado = normalizarEmail(email);                      // calculado
```

### 3.3 Nombres de funciones por capa

Cada capa tiene su propio vocabulario. Respetarlo hace evidente en que nivel se esta:

| Capa | Verbos tipicos | Ejemplos |
|---|---|---|
| Controlador | La accion del usuario | `registrar`, `iniciarSesion`, `cerrarSesion`, `perfil` |
| Servicio | La operacion de negocio | `registrar`, `iniciarSesion`, `obtenerPerfil` |
| Modelo | La operacion de datos | `crear`, `buscarPorId`, `buscarPorEmailConHash`, `existeEmail` |
| Middleware | `requiere*` / `manejar*` / verbo | `requiereAutenticacion`, `requiereAdministrador`, `manejarErrores`, `validar` |
| Validador | `reglas<Accion>` | `reglasRegistro`, `reglasLogin` |

En los modelos, el nombre describe **como** se busca: `buscarPorId`, `buscarPorEmailConHash`.

### 3.4 Exportaciones

Siempre al final del archivo, en una sola instruccion.

```js
// Modulo con varias piezas: objeto literal con nombres cortos.
module.exports = { registrar, iniciarSesion, cerrarSesion, perfil };

// Modulo de proposito unico: se exporta el valor directo.
module.exports = ApiError;
module.exports = asyncHandler;
module.exports = router;
```

No se usa `module.exports.x = ...` disperso por el archivo ni `exports.x = ...`.

### 3.5 Rutas HTTP

Las URL van **en ingles, en minusculas y en plural** para colecciones; los verbos HTTP
expresan la accion. No se ponen verbos en la URL salvo en autenticacion, donde ya es un
estandar de facto.

```
POST /api/auth/register      GET  /api/trips
POST /api/auth/login         GET  /api/trips/:id
POST /api/auth/logout        POST /api/reservations
GET  /api/auth/me            GET  /api/reservations/:id
```

### 3.6 Identificadores en HTML y CSS

| Elemento | Estilo | Ejemplo |
|---|---|---|
| `id` | `kebab-case` en ingles | `login-form`, `form-alert`, `logout-btn`, `mobile-menu-btn` |
| `name` de campo | Igual al campo del JSON de la API | `nombre`, `email`, `password`, `passwordConfirmacion` |
| Clase de componente | `kebab-case` en ingles | `btn-primary`, `field-label`, `chip-glass`, `alert-error` |
| Atributo de enlace con JS | `data-<proposito>` | `data-auth`, `data-error`, `data-user`, `data-toggle-password` |
| Token de diseno | `--<categoria>-<nombre>` | `--color-deep-teal`, `--text-body-md`, `--spacing-gutter` |

El JavaScript **nunca selecciona por clase de estilo**: se engancha por `id` o por
`data-*`. Asi se puede cambiar el diseno sin romper el comportamiento.

```js
// Correcto
documento.querySelectorAll('[data-auth]');
documento.getElementById('login-form');

// Incorrecto: acopla el comportamiento al estilo visual.
documento.querySelectorAll('.btn-primary');
```

---

## 4. Estilo y formato del codigo

| Regla | Valor |
|---|---|
| Indentacion | **2 espacios**, nunca tabuladores |
| Comillas en JS | **Simples** (`'texto'`); plantillas solo si hay interpolacion |
| Comillas en HTML/JSON | **Dobles** (`class="field"`) |
| Punto y coma | **Obligatorio** al cerrar cada instruccion |
| Longitud maxima de linea | **100 columnas** |
| Coma final (trailing comma) | **Si**, en objetos y arreglos multilinea |
| Fin de archivo | Una sola linea vacia final |
| Espacio en llaves | `{ nombre, email }`, no `{nombre, email}` |
| Igualdad | `===` y `!==` siempre |

### 4.1 Declaraciones

- **Backend y pruebas:** `const` por defecto, `let` solo si se reasigna. `var` esta prohibido.
- **Frontend:** `var` (ver [seccion 7.1](#71-javascript-de-navegador)).

### 4.2 Funciones

En el backend, las funciones de nivel de modulo se declaran con `function`; las funciones
pasadas como argumento usan sintaxis de flecha.

```js
// Declaracion de modulo: function.
function normalizarEmail(email) {
  return String(email).trim().toLowerCase();
}

// Callback: arrow function.
const faltantes = REQUERIDAS.filter((clave) => !process.env[clave]);
```

El parametro de una arrow function **siempre va entre parentesis**, incluso si es uno solo.

Los handlers de Express se asignan a `const` porque van envueltos en `asyncHandler`:

```js
const perfil = asyncHandler(async (req, res) => { /* ... */ });
```

### 4.3 Llaves y espaciado vertical

Las llaves son obligatorias incluso para una sola instruccion, y el cuerpo va en su
propia linea. **No se escriben `if` de una sola linea.**

```js
// Correcto
if (!token) {
  throw ApiError.noAutenticado(MENSAJES.TOKEN_FALTANTE);
}

// Incorrecto
if (!token) throw ApiError.noAutenticado(MENSAJES.TOKEN_FALTANTE);
```

Se deja una linea en blanco antes de cada `if` de guarda y antes del `return` final, para
separar visualmente las fases de la funcion:

```js
async function obtenerPerfil(id) {
  const usuario = await userModel.buscarPorId(id);

  if (!usuario) {
    throw ApiError.noEncontrado(MENSAJES.USUARIO_NO_ENCONTRADO);
  }

  return usuario;
}
```

### 4.4 Orden de los `require`

Tres bloques separados por una linea en blanco:

1. Modulos nativos de Node (`path`, `fs`)
2. Dependencias externas (`express`, `helmet`, `bcrypt`)
3. Modulos propios del proyecto (rutas relativas)

Dentro del tercer bloque conviene ir de lo general a lo especifico, dejando al final la
desestructuracion de constantes.

```js
'use strict';

const path = require('path');

const express = require('express');
const helmet = require('helmet');

const rutas = require('./routes');
const manejarErrores = require('./middlewares/error.middleware');
const { MENSAJES } = require('./config/constants');
```

### 4.5 Encadenamiento

Cuando una cadena de llamadas no cabe en 100 columnas, se rompe con un metodo por linea,
indentado 2 espacios:

```js
const { data, error } = await supabase
  .from(TABLAS.USUARIOS)
  .select(CAMPOS_PUBLICOS)
  .eq('id', id)
  .maybeSingle();
```

En los validadores, cada `.withMessage()` acompana a la regla que valida, y se deja una
linea en blanco entre campos distintos:

```js
body('nombre')
  .trim()
  .notEmpty()
  .withMessage('El nombre es obligatorio.')
  .isLength({ min: 3, max: 100 })
  .withMessage('El nombre debe tener entre 3 y 100 caracteres.'),
```

---

## 5. Responsabilidades por capa

Cada capa tiene una unica responsabilidad. Este es el contrato que hace que el codigo sea
predecible; romperlo es el error de revision mas comun.

| Capa | Si hace | No hace |
|---|---|---|
| **Ruta** | Declara el endpoint y ordena la cadena de middlewares | Logica de negocio o validacion |
| **Validador** | Define reglas de forma de la entrada | Consultar la base de datos |
| **Middleware** | Corta la peticion por autenticacion, rol o validacion | Reglas de negocio del recurso |
| **Controlador** | Lee `req`, llama al servicio, responde con `exito()` | Consultar Supabase, calcular reglas, dar formato al error |
| **Servicio** | Reglas de negocio, orquesta modelos y utilidades, lanza `ApiError` | Tocar `req`/`res`, armar respuestas HTTP |
| **Modelo** | Consulta Supabase y traduce errores de la base | Reglas de negocio, hashear, firmar tokens |
| **Utilidad** | Funciones puras y reutilizables sin estado | Conocer el dominio o el flujo HTTP |

### 5.1 Anatomia de una ruta

El orden de la cadena es siempre el mismo: **reglas -> validar -> autenticacion -> rol -> controlador**.

```js
router.post('/register', reglasRegistro, validar, authController.registrar);
router.post('/logout', requiereAutenticacion, authController.cerrarSesion);
router.get('/me', requiereAutenticacion, authController.perfil);

// Con restriccion de rol:
router.post('/trips', requiereAutenticacion, requiereAdministrador,
  reglasCrearViaje, validar, tripController.crear);
```

### 5.2 Controlador delgado

Un controlador correcto cabe en pocas lineas: desestructura la entrada, delega y responde.

```js
const registrar = asyncHandler(async (req, res) => {
  const { nombre, email, password } = req.body;
  const { usuario, token } = await authService.registrar({ nombre, email, password });

  return exito(res, {
    estado: 201,
    mensaje: 'Cuenta creada correctamente.',
    datos: { usuario, token },
  });
});
```

Se toman **solo los campos esperados** de `req.body`, nunca el objeto completo. Eso impide
que un cliente inyecte campos no previstos (por ejemplo `rol`).

### 5.3 Servicio

```js
async function registrar({ nombre, email, password: passwordPlano }) {
  const emailNormalizado = normalizarEmail(email);

  if (await userModel.existeEmail(emailNormalizado)) {
    throw ApiError.conflicto(MENSAJES.EMAIL_YA_REGISTRADO);
  }

  const passwordHash = await password.hashear(passwordPlano);
  const usuario = await userModel.crear({ /* ... */ rol: ROLES.USUARIO });

  logger.info('Usuario registrado', { id: usuario.id, email: usuario.email });

  return { usuario, token: jwtUtil.firmar(usuario) };
}
```

Los servicios reciben y devuelven **objetos con nombre**, no listas de parametros
posicionales. Asi la llamada se lee sola y agregar un campo no rompe el orden.

### 5.4 Modelo

Todo modelo define su lista de campos publicos y su traductor de errores, y **nunca**
devuelve columnas sensibles salvo que la funcion lo diga explicitamente en su nombre.

```js
const CAMPOS_PUBLICOS = 'id, nombre, email, rol, activo, creado_en';

function traducirError(error) {
  if (error.code === '23505') {
    return ApiError.conflicto(MENSAJES.EMAIL_YA_REGISTRADO);
  }

  return ApiError.interno(`Error de base de datos: ${error.message}`);
}
```

- Se usa `.maybeSingle()` cuando la ausencia de fila es un caso valido (devuelve `null`).
- Se usa `.single()` cuando la fila debe existir (un `insert`, por ejemplo).
- Cada consulta revisa `error` y lanza `traducirError(error)` antes de devolver `data`.

---

## 6. Buenas practicas de desarrollo

### 6.1 Manejo de errores

**Regla central: los errores se *lanzan*, no se responden.** Ningun controlador, servicio
o modelo llama a `res.status(...)` para reportar un fallo. Se lanza un `ApiError` y el
middleware `manejarErrores` (registrado al final en `app.js`) construye la respuesta.

```js
// Correcto: el servicio lanza y se olvida del HTTP.
throw ApiError.noEncontrado(MENSAJES.USUARIO_NO_ENCONTRADO);

// Incorrecto: mezcla capas y salta el manejador central.
return res.status(404).json({ error: 'no existe' });
```

Se usa la fabrica que corresponde al codigo, nunca `new ApiError(404, ...)` directo:

| Fabrica | Codigo | Cuando |
|---|---|---|
| `ApiError.solicitudInvalida(msg, detalles)` | 400 | Datos mal formados |
| `ApiError.noAutenticado(msg)` | 401 | Falta el token, es invalido o expiro |
| `ApiError.prohibido(msg)` | 403 | Autenticado pero sin permiso, o cuenta desactivada |
| `ApiError.noEncontrado(msg)` | 404 | El recurso no existe |
| `ApiError.conflicto(msg)` | 409 | Choca con el estado actual (correo duplicado) |
| `ApiError.interno(msg)` | 500 | Fallo inesperado |

**Toda funcion `async` de Express va envuelta en `asyncHandler`.** Sin eso, una promesa
rechazada no llega a `next()` y la peticion queda colgada.

```js
const perfil = asyncHandler(async (req, res) => { /* ... */ });
const requiereAutenticacion = asyncHandler(async (req, res, next) => { /* ... */ });
```

`try/catch` se usa solo cuando se va a **transformar** el error, no para volver a lanzarlo igual:

```js
function verificar(token) {
  try {
    return jwt.verify(token, config.secreto);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.noAutenticado(MENSAJES.TOKEN_EXPIRADO);
    }

    throw ApiError.noAutenticado(MENSAJES.TOKEN_INVALIDO);
  }
}
```

### 6.2 Formato de respuesta

Toda respuesta sale por los helpers de `src/utils/apiResponse.js`; nunca por `res.json()` directo.

```js
return exito(res, { mensaje: 'Perfil obtenido.', datos: { usuario } });
return exito(res, { estado: 201, mensaje: 'Cuenta creada correctamente.', datos: { usuario } });
```

Esto garantiza la envoltura unica documentada en [`docs/api.md`](./api.md):

```json
{ "exito": true, "mensaje": "...", "datos": { } }
{ "exito": false, "mensaje": "...", "detalles": [{ "campo": "email", "mensaje": "..." }] }
```

`detalles` es siempre un arreglo de `{ campo, mensaje }`, porque el frontend lo usa para
pintar el error debajo del campo correspondiente (`[data-error="email"]`).

### 6.3 Textos y valores fijos

**Ningun texto visible para el usuario ni valor de dominio se escribe en linea.** Van en
`src/config/constants.js`, dentro de un objeto congelado con `Object.freeze`.

```js
// Correcto
throw ApiError.conflicto(MENSAJES.EMAIL_YA_REGISTRADO);
.from(TABLAS.USUARIOS)
rol: ROLES.USUARIO

// Incorrecto
throw ApiError.conflicto('El correo ya esta registrado.');
.from('usuarios')
rol: 'usuario'
```

Los mensajes se redactan **dirigidos al usuario, en tono neutro y terminados en punto**, y
no filtran detalles internos: `'Correo electronico o contrasena incorrectos.'` no revela
cual de los dos fallo.

Se exceptuan los mensajes de validacion en `src/validators/`, que viven junto a su regla en
`.withMessage()` para poder leer regla y texto de un vistazo.

### 6.4 Reutilizacion

- Si una operacion se repite en dos capas iguales, se extrae a `src/utils/`.
- Si se repite dentro de un mismo archivo, se extrae a una funcion privada arriba del
  archivo y **no se exporta** (`normalizarEmail` en `auth.service.js`, `traducirError` en
  `user.model.js`).
- Si un conjunto de clases de Tailwind se repite en dos vistas, se convierte en componente
  dentro de `@layer components` en `public/css/input.css`.
- **Se exporta solo lo que otro modulo consume.** La superficie publica minima facilita
  cambiar la implementacion despues.

### 6.5 Comentarios

El codigo del proyecto es **deliberadamente sin comentarios**: los nombres explican el
*que*. Un comentario se escribe solo cuando el *por que* no es deducible del codigo — una
decision no obvia, una limitacion externa, un caso borde.

```js
// Correcto: explica una decision que el codigo no puede expresar.
// Supabase devuelve 23505 en violacion de indice unico; se traduce a 409 para no
// exponer detalles del motor de base de datos.
if (error.code === '23505') {

// Incorrecto: repite lo que ya dice la linea siguiente.
// Normaliza el email
const emailNormalizado = normalizarEmail(email);
```

Si hace falta un comentario para entender *que* hace un bloque, primero se intenta
renombrar o extraer una funcion. No se dejan bloques comentados en el repositorio: para
eso esta el historial de Git.

### 6.6 Seguridad

- **Nunca** se registra ni se devuelve una contrasena, un hash o un token completo.
  `password_hash` se borra del objeto antes de devolverlo (`delete usuario.password_hash;`)
  y las consultas usan `CAMPOS_PUBLICOS`.
- Los secretos viven en `.env`, que **no se versiona**. Toda variable nueva se agrega a
  `.env.example` con un valor de ejemplo y se declara en `REQUERIDAS` de `env.js` si es
  obligatoria.
- El rol nunca se toma de la peticion: se asigna en el servidor (`rol: ROLES.USUARIO`).
- Las contrasenas se comparan siempre con `password.verificar()` (bcrypt), nunca con `===`.
- Los limites de entrada se declaran en el validador y se respaldan con `CHECK` en la base.

### 6.7 Bitacora (logging)

Se usa el logger propio (`src/config/logger.js`), no `console.log`. El segundo argumento es
un objeto con contexto estructurado, y **solo con identificadores, nunca datos sensibles**.

| Nivel | Cuando | Archivo |
|---|---|---|
| `logger.info` | Evento de negocio exitoso | `logs/app.log` |
| `logger.advertencia` | Fallo esperado y controlado (401, 404, validacion) | `logs/app.log` |
| `logger.error` | Fallo inesperado; incluye `stack` | `logs/error.log` |

```js
logger.info('Usuario registrado', { id: usuario.id, email: usuario.email });
logger.advertencia('Intento de login con contrasena incorrecta', { id: usuario.id });
```

### 6.8 Asincronia

Se usa `async`/`await` en todo el backend; no se encadenan `.then()` salvo en el frontend
(ver seccion 7.1). Las operaciones independientes se paralelizan con `Promise.all` en lugar
de esperarlas en serie.

---

## 7. Convenciones del frontend

Las vistas se renderizan en el servidor con **Pug**; el comportamiento vive en scripts de
navegador **sin framework ni paso de compilacion para JavaScript**. Solo Tailwind se compila.

La division es la siguiente: el servidor arma la estructura de la pagina y lo que depende de
la sesion (menu, accesos de administrador); el navegador pide a la API los datos que cambian
(catalogo, reservaciones, metricas) y los pinta con `<template>`.

### 7.1 JavaScript de navegador

Se escribe en **ES5** para que funcione sin transpilar y en navegadores antiguos. Es una
excepcion consciente a las reglas del backend, y aplica **solo** a `public/js/`.

| Regla | Backend (`src/`) | Frontend (`public/js/`) |
|---|---|---|
| Declaracion | `const` / `let` | `var` |
| Funciones | `function` + arrow | `function` unicamente |
| Asincronia | `async`/`await` | `.then()` / `.catch()` |
| Modulos | `require` / `module.exports` | IIFE + objeto global |

Cada archivo es una IIFE que recibe `window` como `global` y publica, como maximo, **un
objeto global en `PascalCase`**:

```js
(function (global) {
  'use strict';

  var CLAVE_TOKEN = 'tripticks.token';

  function obtenerToken() {
    return global.localStorage.getItem(CLAVE_TOKEN);
  }

  global.Sesion = {
    obtenerToken: obtenerToken,
  };
})(window);
```

Reglas adicionales:

- Las claves de `localStorage` se prefijan con `tripticks.` (`tripticks.token`,
  `tripticks.usuario`) y se guardan en constantes.
- **Toda llamada a la API pasa por `Api`** (`Api.get`, `Api.post`, `Api.put`, `Api.patch`,
  `Api.del`). No se usa `fetch` directo en las vistas: `Api` ya adjunta el token y cierra la
  sesion ante un 401.
- **Las fechas y los importes se formatean con `Formato`** (`Formato.fecha`,
  `Formato.rangoFechas`, `Formato.fechaHora`, `Formato.moneda`, `Formato.monedaExacta`,
  `Formato.dias`). Nunca se llama a `new Date('AAAA-MM-DD')` en una vista: se interpreta en
  UTC y al oeste de Greenwich la fecha se corre un dia. `src/middlewares/view.middleware.js`
  expone las mismas funciones como `formato` para lo que pinta el servidor.
- La inicializacion de cada vista se engancha a `DOMContentLoaded`.
- Se escribe `documento` como alias local de `global.document`.

### 7.2 Plantillas Pug

Toda vista extiende `layouts/base.pug`, que trae el `doctype`, el `head`, la hoja de estilos
y los scripts comunes. Una plantilla nueva se escribe asi:

```pug
extends ../layouts/base.pug

block variables
  - var titulo = 'Viajes - TripTicks'
  - var descripcion = 'Catalogo de viajes disponibles en TripTicks.'
  - var clasesBody = 'bg-off-white text-on-background ... min-h-screen flex flex-col'
  - var scriptsVista = ['/js/trips.js']

block contenido
  +encabezado("viajes")
  main(class="shell grow pt-28 pb-16 w-full")
  +piePagina()
```

- `block variables` es obligatorio y define `titulo` (patron `Seccion - TripTicks`),
  `descripcion` y `clasesBody`. `scriptsVista` y `noIndexar` son opcionales.
- **Las clases van siempre como atributo** (`div(class="flex gap-4")`), nunca con la forma
  abreviada `div.flex.gap-4`: las utilidades de Tailwind con `/` y `:` (`w-1/2`,
  `bg-surface/95`, `md:flex-row`) no son validas en la forma abreviada.
- El `id` si usa la forma abreviada cuando existe: `form#login-form(novalidate)`.
- Los comentarios usan `//-` para que no lleguen al HTML servido al navegador.
- Indentacion de 2 espacios; atributos en comillas dobles.
- Lo que se repite en dos vistas se convierte en mixin dentro de `src/views/mixins/`,
  igual que un patron de clases se convierte en componente en `input.css`.
- **Accesibilidad obligatoria**: `label` con `for` para cada campo, `aria-hidden="true"` en
  iconos decorativos, `role="alert"` en contenedores de error, `aria-label` y
  `aria-expanded` en botones sin texto, `aria-invalid` en campos con error.
- Se usan etiquetas semanticas (`main`, `section`, `nav`, `footer`), no `div` para todo.
- El layout inyecta los scripts al final del `body` y **siempre en este orden**:
  `api.js` -> `session.js` -> `formato.js` -> los de `scriptsVista`. Los tres primeros solo
  publican sus objetos globales, y el de la vista es el unico que corre logica al cargar el DOM.

### 7.2.1 Rutas de las vistas

Las URL de las vistas no llevan extension y viven en `src/routes/web.routes.js`, separadas
de la API. Una ruta de vista solo renderiza: no consulta la base de datos.

```
GET /                      GET /trips                GET /admin
GET /login                 GET /trips/:id            GET /admin/trips
GET /register              GET /reservations         GET /admin/trips/:id/edit
GET /profile               GET /checkout             GET /admin/users
```

El acceso se corta con los middlewares de `view.middleware.js`, que **redirigen** en lugar
de responder 401: `requiereSesionWeb` lleva a `/login?requerida=1&destino=...` y
`soloInvitados` saca de `/login` a quien ya tiene sesion. La proteccion real de los datos
sigue estando en la API.

### 7.3 Tailwind CSS (v4)

`public/css/input.css` es la unica fuente de estilos; `output.css` se genera y **no se versiona**.

```
npm run css        # modo watch durante el desarrollo
npm run css:build  # build minificado para produccion
```

- Los tokens de diseno se declaran en `@theme` (`--color-*`, `--font-*`, `--text-*`,
  `--spacing-*`). **No se escriben colores ni tamanos en crudo en el HTML**: se usa el
  token (`bg-deep-teal`, `text-body-md`), no `bg-[#0f4c5c]`.
- Los patrones que se repiten se declaran como componente en `@layer components` con
  `@apply` y nombre en `kebab-case` (`btn-primary`, `field`, `card`, `alert-error`).
- Los valores arbitrarios (`shadow-[0_4px_30px_...]`) se permiten solo dentro de un
  componente en `input.css`, nunca sueltos en el HTML.
- Toda animacion debe respetar `@media (prefers-reduced-motion: reduce)`.

---

## 8. Base de datos (SQL)

| Elemento | Convencion | Ejemplo |
|---|---|---|
| Palabras clave | minusculas | `create table if not exists` |
| Tablas | `snake_case`, **plural**, en espanol | `usuarios`, `viajes`, `reservaciones` |
| Columnas | `snake_case`, singular | `password_hash`, `creado_en` |
| Llave primaria | `id`, `uuid` con `gen_random_uuid()` | `id uuid primary key default gen_random_uuid()` |
| Llave foranea | `<tabla_singular>_id` | `usuario_id`, `viaje_id` |
| Marcas de tiempo | `creado_en`, `actualizado_en` (`timestamptz`) | `creado_en timestamptz not null default now()` |
| Indice | `<tabla>_<columna>_idx` | `usuarios_email_lower_idx` |
| Trigger | `<tabla>_<accion>` | `usuarios_set_actualizado_en` |
| Funcion | `snake_case` en `public` | `public.set_actualizado_en()` |

Reglas:

- Todo script es **idempotente**: `if not exists`, `create or replace`,
  `drop trigger if exists` antes de `create trigger`. Debe poder ejecutarse dos veces sin error.
- Las columnas se alinean verticalmente para que el tipo y las restricciones se lean en columna.
- Las reglas de negocio expresables en la base se declaran ahi tambien (`not null`,
  `unique`, `check`), sin que eso sustituya la validacion en `src/validators/`.
- Los nombres de tabla **nunca** se escriben a mano en JavaScript: se usa `TABLAS`.

---

## 9. Pruebas

```
tests/
├── setup.js                        Variables de entorno del entorno de prueba
├── unit/<modulo>.test.js           Funciones aisladas
└── integration/<recurso>.routes.test.js   Endpoints completos con supertest
```

Ejecucion: `npm test`.

- El `describe` externo nombra el modulo bajo prueba (`'password.util'`); los `describe`
  anidados nombran la funcion (`'hashear'`, `'verificar'`).
- **El `it` describe el comportamiento esperado en espanol, sin la palabra "debe"** y en
  tercera persona: `it('acepta la contrasena correcta')`,
  `it('rechaza una contrasena incorrecta')`, `it('distingue mayusculas de minusculas')`.
- Una prueba verifica **una** conducta. Se prueban tambien los caminos de fallo y los casos
  borde, no solo el camino feliz.
- Nunca se prueban contra datos reales ni se escriben credenciales verdaderas en las pruebas.
- Toda regla de negocio nueva en un servicio llega con su prueba unitaria; todo endpoint
  nuevo, con su prueba de integracion.

---

## 10. Git y mensajes de commit

### 10.1 Formato

Se usa **Conventional Commits**, con la descripcion **en espanol, en minusculas, en
infinitivo y sin punto final**:

```
tipo(alcance): descripcion breve
```

Ejemplos reales del repositorio:

```
feat(auth): implementar registro, inicio y cierre de sesion (RF-01 a RF-03)
feat(config): implementar entorno, constantes, bitacora y cliente Supabase
feat(ui): agregar el catalogo de viajes y la vista de detalle
test(integration): cubrir los endpoints de autenticacion
chore: configurar dependencias, variables de entorno y scripts
```

| Tipo | Uso |
|---|---|
| `feat` | Funcionalidad nueva |
| `fix` | Correccion de un defecto |
| `test` | Pruebas |
| `docs` | Documentacion |
| `refactor` | Cambio interno sin alterar el comportamiento |
| `chore` | Configuracion, dependencias, tareas de mantenimiento |
| `style` | Formato que no altera la logica |

Alcances en uso: `auth`, `config`, `db`, `models`, `middlewares`, `utils`, `server`, `ui`,
`unit`, `integration`. Se omite si el cambio es transversal.

Cuando el commit implementa un requisito funcional, se cita entre parentesis al final:
`(RF-01 a RF-03)`.

### 10.2 Reglas

- **Un commit, un cambio coherente.** No se mezcla una funcionalidad con un reformateo.
- No se sube `.env`, `node_modules/`, `logs/*.log` ni `public/css/output.css`
  (ya estan en `.gitignore`).
- Antes de subir: `npm test` en verde.

---

## 11. Validacion del codigo

### 11.1 Comandos disponibles

| Comando | Que hace |
|---|---|
| `npm test` | Ejecuta toda la suite de Jest |
| `npm run dev` | Levanta el servidor con nodemon |
| `npm run css` | Compila Tailwind en modo watch |
| `npm run css:build` | Compila Tailwind minificado |

### 11.2 Verificacion manual antes de cada Pull Request

Mientras no exista linter automatico, cada integrante verifica a mano:

1. `npm test` pasa completo.
2. `npm run dev` arranca sin errores y `GET /api/health` responde `{ "exito": true, ... }`.
3. El archivo no tiene acentos ni tabuladores.
4. Indentacion de 2 espacios, comillas simples, punto y coma, lineas de 100 columnas o menos.
5. No quedan `console.log` ni bloques de codigo comentados.
6. La revision del [checklist](#12-checklist-de-revision) esta completa.

### 11.3 Automatizacion pendiente (SCRUM-51)

Queda pendiente incorporar ESLint + Prettier al flujo. La configuracion acordada, para
cuando se implemente, es:

- **ESLint** con `eslint:recommended`, `env: { node: true, es2022: true }` y reglas
  `eqeqeq`, `no-var`, `prefer-const`, `no-unused-vars`; con un override para
  `public/js/**` que permita `var` y fije `es5`, y otro para `tests/**` con `env: jest`.
- **Prettier** con `printWidth: 100`, `tabWidth: 2`, `singleQuote: true`, `semi: true`,
  `trailingComma: "es5"`, `endOfLine: "lf"`.
- Scripts nuevos en `package.json`: `lint`, `lint:fix`, `format`, `format:check`, y
  `validate` que encadene `lint` + `format:check` + `test`.

Estas reglas ya reflejan el estilo real del codigo, por lo que activarlas no deberia
producir cambios masivos.

---

## 12. Checklist de revision

Lista de verificacion para el autor antes de abrir un PR y para quien revisa.
Sirve como evidencia de cumplimiento de las convenciones (SCRUM-52).

**Estructura y nomenclatura**

- [ ] Los archivos nuevos siguen `<recurso>.<capa>.js` y estan en la carpeta de su capa.
- [ ] Los nombres de funciones usan el vocabulario de su capa (seccion 3.3).
- [ ] Las constantes fijas estan en `SCREAMING_SNAKE_CASE`; las calculadas en `camelCase`.
- [ ] Hay un unico `module.exports` al final del archivo.

**Formato**

- [ ] 2 espacios, sin tabuladores, sin acentos.
- [ ] Comillas simples en JS, punto y coma, comas finales en multilinea.
- [ ] Ninguna linea pasa de 100 columnas.
- [ ] Los `require` estan en los tres bloques del orden establecido.

**Arquitectura**

- [ ] Ningun controlador consulta Supabase.
- [ ] Ningun servicio ni modelo usa `req` o `res`.
- [ ] Toda funcion `async` de Express esta envuelta en `asyncHandler`.
- [ ] La cadena de la ruta respeta el orden reglas -> validar -> autenticacion -> rol -> controlador.

**Errores y respuestas**

- [ ] Los fallos lanzan `ApiError` con la fabrica correcta; no hay `res.status()` de error.
- [ ] Las respuestas exitosas salen por `exito()`.
- [ ] Los textos al usuario estan en `MENSAJES`, no en linea.
- [ ] Los nombres de tabla vienen de `TABLAS`.

**Seguridad**

- [ ] No se exponen `password_hash`, tokens ni secretos en respuestas ni en la bitacora.
- [ ] Solo se leen de `req.body` los campos esperados.
- [ ] Las variables de entorno nuevas estan en `.env.example` (y en `REQUERIDAS` si aplica).

**Pruebas y documentacion**

- [ ] `npm test` pasa.
- [ ] La logica nueva tiene prueba unitaria; el endpoint nuevo, prueba de integracion.
- [ ] `docs/api.md` se actualizo si cambio el contrato de la API.
- [ ] El mensaje de commit sigue Conventional Commits en espanol.

---

## Como adoptar estas convenciones

1. Lee este documento completo antes de tu primer commit.
2. Configura tu editor: 2 espacios, sin tabuladores, codificacion UTF-8, fin de linea LF,
   recorte de espacios al final de linea y linea vacia al final del archivo.
3. Usa el modulo de autenticacion como plantilla al crear un recurso nuevo: copia la
   estructura de `auth.routes.js` -> `auth.validator.js` -> `auth.controller.js` ->
   `auth.service.js` -> `user.model.js` y sustituye el dominio.
4. Aplica el [checklist](#12-checklist-de-revision) antes de cada PR.
5. Si una convencion te estorba o falta un caso, proponlo al equipo y actualiza este
   archivo en el mismo PR. **El documento se mantiene junto al codigo, no despues.**
