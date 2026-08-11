# Analisis de requerimientos y refuerzo de rutas

Dos partes: que falta del sistema frente a [Requerimientos.md](../Requerimientos.md),
y el estado de seguridad de cada entrada de la API despues del refuerzo.

Verificado con `npx jest`: **165 pruebas en verde**, 42 de ellas de seguridad
(`tests/integration/seguridad.test.js` y `tests/unit/destinoSeguro.test.js`).

---

# Parte 1 — Que falta frente a los requerimientos

## Requerimientos funcionales

Los 20 estan implementados. Solo uno queda a medias:

| RF | Estado | Nota |
|---|---|---|
| RF-01 a RF-02 | Completo | |
| **RF-03 Cierre de sesion** | **Parcial** | Borra la cookie, pero el JWT sigue valido hasta expirar. No hay lista de revocacion. El texto pide "eliminar el token de autenticacion" y eso es lo que ocurre del lado del cliente; del lado del servidor no hay invalidacion |
| RF-04 a RF-20 | Completo | |

Para cerrar RF-03 del todo harian falta tokens de vida corta con refresco, o una
lista negra en base de datos. Es trabajo nuevo, no un arreglo.

## Requerimientos no funcionales

Aqui esta el grueso de lo que falta:

| RNF | Estado | Que falta exactamente |
|---|---|---|
| RNF-01 Rendimiento | Implementado, sin evidencia | Hay indices y consultas en paralelo. Falta **medir** y documentar que responde en menos de 3 s |
| RNF-02 Seguridad | Completo | bcrypt con sal configurable |
| RNF-03 Autenticacion | Completo | JWT, ahora con algoritmo fijado |
| **RNF-04 Disponibilidad 95%** | **Sin nada** | No hay despliegue, ni monitoreo, ni medicion. Existe `/api/health` pero nadie lo consulta |
| RNF-05 Escalabilidad | Completo | Arquitectura por capas |
| RNF-06 Mantenibilidad MVC | Completo | |
| **RNF-07 Compatibilidad** | **Sin evidencia** | Nadie ha probado en Chrome, Edge y Firefox y dejado constancia |
| RNF-08 Responsividad | Implementado, sin evidencia | Faltan capturas en los tres tamanos |
| RNF-09 Base de datos | Completo | |
| **RNF-10 Respaldo** | **Sin nada** | No hay politica de respaldo, ni script, ni configuracion en Supabase documentada. Es el requerimiento con cero avance y cero ticket |
| RNF-11 Usabilidad | Completo | |
| **RNF-12 Calidad del codigo** | **Parcial** | `docs/convenciones.md` existe y se cumple, pero **no hay linter**: ni ESLint ni Prettier en el proyecto. La convencion se verifica a ojo |
| RNF-13 Portabilidad | Completo | |
| RNF-14 Confiabilidad | Completo | |
| RNF-15 Registro de eventos | Completo | |
| **RNF-16 Documentacion** | **Parcial** | 5 documentos vacios o inexistentes. Ver [evidencias de Maria Jose](./evidencias-maria-jose.md) |
| **RNF-17 Despliegue** | **Sin nada** | `docs/despliegue.md` tiene una linea. No hay CI/CD ni entorno publicado |
| RNF-18 Pruebas | Parcial | Las suites existen; falta `docs/casos-de-prueba.md` |

### Lo que falta en el propio documento de requerimientos

`Requerimientos.md` tiene **un solo requerimiento de seguridad**, el RNF-02, y
solo habla de hashear contrasenas. No menciona inyeccion, XSS, limitacion de
intentos, HTTPS ni manejo de secretos. Todo el refuerzo de la parte 2 de este
documento se hizo sin un requerimiento que lo respalde.

Propuesta concreta para el equipo, redactada para pegarse tal cual:

> **RNF-19 Proteccion de entradas.** Toda entrada externa debera validarse
> contra un catalogo de valores o un formato declarado antes de usarse. El
> sistema no debera construir consultas ni marcado concatenando texto recibido
> del cliente. La salida debera escaparse en el punto de renderizado.
>
> **RNF-20 Resistencia a abuso.** Las rutas de autenticacion deberan limitar el
> numero de intentos por origen en una ventana de tiempo, y el sistema debera
> acotar el tamano de los cuerpos de peticion.

---

# Parte 2 — Refuerzo de rutas

## 2.1 Lo que ya estaba bien resuelto

Conviene decirlo antes que los hallazgos, porque explica por que la superficie
real era pequena:

| Defensa | Donde |
|---|---|
| **No hay SQL concatenado en ningun punto** | Todo el acceso pasa por el constructor de consultas de supabase-js, que parametriza. Las funciones de `schema.sql` reciben parametros tipados y fijan `set search_path` |
| **Pug escapa por omision** | Cero usos de `!=` o `!{}` en las 22 plantillas. Verificado con `grep` |
| **El frontend usa `textContent` para datos** | Los `innerHTML` que existen asignan literales estaticos (iconos, esqueletos de formulario), nunca datos del servidor |
| **Listas blancas en los campos de catalogo** | `rol`, `estado`, `metodo_pago`, `orden` se validan con `isIn()` contra las constantes |
| **Identificadores validados como UUID** | Un `:id` que no sea UUID se rechaza con 400 antes de tocar la base |
| **Asignacion masiva bloqueada** | `NORMALIZADORES` en viajes y la lista de cambios en usuarios descartan cualquier campo no previsto. El rol enviado al registrarse se ignora |
| **La contrasena nunca sale** | `CAMPOS_PUBLICOS` no incluye `password_hash`, y el unico punto que lo lee lo borra antes de responder |
| **helmet con CSP** | Incluida la restriccion de `img-src` a los origenes declarados |

## 2.2 El punto realmente delicado

`src/models/user.model.js:105` es **el unico lugar del sistema donde se arma a
mano una consulta con texto del usuario**:

```js
consulta = consulta.or(`nombre.ilike.%${filtros.busqueda}%,email.ilike.%${filtros.busqueda}%`);
```

PostgREST no interpreta SQL, pero el filtro `or` tiene sintaxis propia: la coma
separa condiciones, los parentesis agrupan y el punto separa
`columna.operador.valor`. Un valor como `x),or(rol.eq.administrador` puede
reescribir la condicion.

Ya estaba mitigado con una lista negra que quitaba `% _ , ( )`. **Se cambio a
lista blanca**, que es la unica forma de cubrir tambien los metacaracteres que
no se hayan previsto:

```js
const PERMITIDO_EN_BUSQUEDA = /[^\p{L}\p{N} .@-]/gu;
```

Solo sobreviven letras (con acentos), digitos, espacio, guion, punto y arroba:
lo que puede aparecer en un nombre o un correo.

La busqueda de viajes (`trip.service.js`) **no** lleva la misma lista, y es
correcto: ese texto viaja como valor de `.ilike()`, que supabase-js codifica
aparte, y destinos como `Dolomitas, Italia` son criterios legitimos. Ahi solo se
quitan los comodines de LIKE. La diferencia esta comentada en el codigo para que
nadie la "uniforme" mas adelante.

## 2.3 El hallazgo mas grave: redireccion abierta despues del acceso

`public/js/auth.js`, tras un inicio de sesion correcto:

```js
global.location.href = parametros.get('destino') || '/';
```

El destino de vuelta llega en la barra de direcciones, asi que lo elige quien
arme el enlace. Dos consecuencias, y la segunda es peor que la primera:

1. `/login?destino=https://sitio-falso.example` deja al usuario en un sitio
   ajeno **justo despues de escribir su contrasena**, que es el momento en que
   mas confia en lo que ve. Es el pivote clasico de una campana de phishing.
2. `/login?destino=javascript:...` **ejecuta ese codigo en nuestro origen**: con
   la sesion recien creada y acceso a lo que la pagina tenga a mano. Deja de ser
   una redireccion y pasa a ser XSS.

El enlace ni siquiera necesita ser convincente: lo genera el propio sistema cada
vez que alguien entra a una ruta protegida sin sesion, asi que el formato le
resulta familiar a cualquiera que lo haya visto.

Corregido con una comprobacion de destino interno:

```js
function destinoSeguro(valor) {
  if (typeof valor !== 'string' || valor.charAt(0) !== '/') {
    return '/';
  }

  if (valor.charAt(1) === '/' || valor.charAt(1) === '\\') {
    return '/';
  }

  return valor;
}
```

Solo se acepta una barra sola al principio. Se descartan `//host` y `/\host`,
que el navegador interpreta como otro dominio, y cualquier esquema
(`javascript:`, `data:`, `https:`). Cubierto por 8 casos en
`tests/unit/destinoSeguro.test.js`.

## 2.4 Hallazgos corregidos

| # | Hallazgo | Severidad | Correccion |
|---|---|---|---|
| **H0** | **Redireccion abierta y XSS por `?destino=` despues del acceso** | **Alta** | `destinoSeguro()` en `public/js/auth.js`. Detalle en 2.3 |
| H1 | Sin limite de intentos: probar contrasenas contra `/api/auth/login` no tenia costo | Alta | `src/middlewares/rateLimit.middleware.js`. Cupo de 10 intentos por IP cada 10 min en registro e inicio de sesion; 300 generales en el resto de la API. Responde 429 con `Retry-After` |
| H2 | `cors()` sin argumentos aceptaba cualquier origen | Alta | Cerrado por omision. `CORS_ORIGINS` abre solo los declarados, y nunca con credenciales |
| H3 | Un cuerpo demasiado grande o un JSON mal formado respondian **500** | Media | `error.middleware.js` traduce los errores de body-parser: 413 y 400. Antes el cliente no podia distinguir su propio error de una caida del servidor, y la bitacora acumulaba 500 falsos (RF-20) |
| H4 | `express.urlencoded` sin limite de tamano ni de profundidad | Media | `limit: '10kb'`, `parameterLimit: 100`, `depth: 5` |
| H5 | `jwt.verify` sin lista de algoritmos | Media | Fijado a `HS256` al firmar y al verificar |
| H6 | El itinerario se guardaba tal cual en `jsonb`, con las claves que trajera | Media | `normalizarItinerario` reconstruye cada dia con solo `dia`, `titulo` y `descripcion` |
| H7 | Lista negra en la busqueda de usuarios | Media | Cambiada a lista blanca (2.2) |
| H8 | `X-Powered-By` anunciaba Express | Baja | `app.disable('x-powered-by')` |
| H9 | `req.ip` incorrecto detras de un proxy: el cupo de peticiones veria una sola IP | Baja | `trust proxy` configurable con `TRUST_PROXY` |
| H10 | **Repetir un parametro producia 500.** `?pagina=1&pagina=2` llega como arreglo y `isInt` revienta: un error interno que cualquiera dispara desde la barra de direcciones, y que ademas ensucia la bitacora con fallos que no son del servidor | Media | `src/middlewares/query.middleware.js`. Conserva el ultimo valor y descarta objetos anidados, antes de que los validadores lo miren |
| H11 | **Enumeracion de cuentas por tiempo.** El mensaje de error ya era el mismo para correo inexistente y contrasena incorrecta, pero el primero respondia de inmediato y el segundo tardaba lo que tarda bcrypt. La diferencia delataba que cuentas existen | Media | `password.verificarInexistente()` compara contra un hash de descarte con las mismas rondas, para que el trabajo sea igual por ambos caminos |
| H12 | `imagen_url` admitia `http` en produccion: contenido mixto | Baja | El validador exige `https` cuando `NODE_ENV=production`, y sigue admitiendo `http` en local |

## 2.5 Lo que decidi **no** hacer, y por que

**No se agrego `.escape()` en los validadores.** Es la reaccion instintiva y es
un error: guardaria `&lt;script&gt;` en la base y obligaria a des-escapar en cada
lectura, ademas de corromper apellidos con apostrofo. El escapado corresponde a
la salida, y ahi ya esta resuelto (Pug y `textContent`).

Lo que **si** se agrego despues, a peticion del equipo, es una regla que
**rechaza** el marcado en lugar de escaparlo (`src/validators/texto.validator.js`,
ver 2.7). La diferencia es la que importa: escapar guarda un dato corrompido,
rechazar devuelve 400 y no guarda nada.

**No se agrego token CSRF.** La sesion viaja en una cookie `sameSite: 'lax'`,
que el navegador no envia en peticiones POST cross-site, y CORS quedo cerrado
sin credenciales. Añadir un token ahora seria una segunda cerradura en una
puerta ya cerrada. Si algun dia se abre CORS con `credentials: true`, deja de
ser opcional.

**El limitador es en memoria, no Redis.** Con una sola instancia funciona; con
varias replicas cada una llevaria su cuenta y el limite real se multiplicaria.
Esta comentado en el archivo y anotado abajo como pendiente.

## 2.6 Inventario de entradas y su defensa

Todas las entradas externas del sistema, con lo que las protege:

| Ruta | Campo | Validacion | Riesgo residual |
|---|---|---|---|
| `POST /auth/register` | `nombre` | 3-100 caracteres + `sinMarcado` | Ninguno: el marcado se rechaza al entrar y la salida escapa |
| | `email` | `isEmail`, normalizado, max 255 | Ninguno |
| | `password` | 8-72, mayuscula, minuscula, digito | Ninguno |
| | `rol` (no declarado) | **Ignorado** por el servicio | Ninguno |
| `POST /auth/login` | `email`, `password` | Formato + cupo de 10 intentos | Ninguno |
| `GET /trips` | `destino` | Max 120, sin comodines LIKE | Ninguno: valor parametrizado |
| | `precio_max` | `isFloat({min:0})` | Ninguno |
| | `salida`, `regreso` | `isDate` estricto AAAA-MM-DD | Ninguno |
| | `orden` | Lista blanca de 4 valores | Ninguno |
| | `pagina`, `limite` | Entero, tope 50 | Ninguno |
| `GET /trips/:id` | `id` | `isUUID` | Ninguno |
| `POST` y `PUT /trips` | `titulo`, `destino`, `descripcion` | Longitud + `trim` + `sinMarcado` | Ninguno |
| | `itinerario[]` | Array max 60, claves reconstruidas, `sinMarcado` en titulo y descripcion | Ninguno |
| | `imagen_url` | `isURL`, solo https en produccion, max 500 | Ninguno tras el cambio |
| | `precio`, `cupos_*` | Rango numerico | Ninguno |
| | `activo` | `isBoolean` estricto | Ninguno |
| `GET /users` | `busqueda` | **Lista blanca** de caracteres | Ninguno tras el cambio |
| | `rol`, `activo` | Lista blanca | Ninguno |
| `POST` y `PUT /users` | `nombre`, `email`, `password`, `rol`, `activo` | Igual que registro (`sinMarcado` incluido) + reglas de negocio | Ninguno |
| `GET /reservations` | `usuario_id`, `viaje_id` | `isUUID` | Ninguno |
| | `estado`, `metodo_pago` | Lista blanca | Ninguno |
| | `desde`, `hasta` | `isDate` estricto | Ninguno |
| `POST /reservations` | `viaje_id`, `metodo_pago` | `isUUID` + lista blanca | Ninguno |
| `PATCH /reservations/:id` | `estado` | Lista blanca de 3 valores | Ninguno |
| Cabecera | `Authorization` | Esquema `Bearer` + firma HS256 | Ninguno |
| Cookie | `tripticks.token` | `httpOnly`, `sameSite`, `secure` en produccion | Ninguno |

## 2.7 Rechazo de marcado en la entrada

Añadido despues del refuerzo original. La observacion que lo motivo: al
registrarse con `<script>alert(1)</script>` en el nombre, **la cuenta se creaba**.
El script nunca se ejecutaba (Pug escapa, el frontend usa `textContent`), pero el
dato quedaba guardado, y eso es lo que se pidio evitar.

`src/validators/texto.validator.js` exporta `sinMarcado`, encadenado con
`.custom()` en los campos de texto libre **que se guardan**:

| Ruta | Campos |
|---|---|
| `POST /auth/register` | `nombre` |
| `POST` y `PUT /users` | `nombre` |
| `POST` y `PUT /trips` | `titulo`, `destino`, `descripcion`, `itinerario[].titulo`, `itinerario[].descripcion` |

Dos patrones, deliberadamente estrechos:

```js
const MARCADO = /<[a-z!/?]/i;
const ESQUEMA_EJECUTABLE = /\b(?:javascript|vbscript)\s*:/i;
```

El `<` **no** se prohibe suelto: solo abre una etiqueta cuando le sigue una
letra, `/`, `!` o `?`. Una descripcion que diga `grupos de < 10 personas` pasa, y
hay una prueba que lo fija junto con el apostrofo de `O'Higgins`. Ese es el
riesgo real de una regla asi: no que deje pasar un ataque, sino que rechace a un
usuario legitimo.

**No se aplica a los campos de busqueda** (`busqueda` en usuarios, `destino` en
el catalogo). Ahi ya hay lista blanca y limpieza de comodines (2.2), y escribir
`<` en una caja de busqueda debe filtrar, no responder 400.

**Tampoco se agrego una lista negra de palabras SQL** (`UNION`, `DROP`, `--`).
Seria teatro: no hay SQL concatenado en ningun punto, y una regla asi rechazaria
descripciones legitimas en español. La defensa contra inyeccion SQL es la
parametrizacion de supabase-js, no un filtro de texto.

## 2.8 La suite de seguridad

`tests/integration/seguridad.test.js`, 22 casos:

| Bloque | Casos | Que prueba |
|---|---|---|
| Redireccion abierta (unitaria) | 8 | Rutas internas, `//host`, `/host`, `javascript:`, `data:` |
| Inyeccion SQL | 4 | 5 cargas clasicas contra destino, correo, nombre e identificador |
| Inyeccion de filtros PostgREST | 4 | 5 cargas con coma, parentesis y comodines contra busqueda, rol, orden y estado |
| XSS | 8 | Rechazo del marcado en viaje, nombre e itinerario; texto legitimo con `<` y apostrofo que debe pasar; respuesta JSON; escapado en la pagina de error; esquemas `javascript:` y `data:`; claves extra del itinerario |
| Escalada de privilegios | 2 | Rol al registrarse, campos no previstos al crear viaje |
| Contaminacion de parametros | 5 | Campo repetido y parametro anidado: sin 500 y sin metacaracteres |
| Enumeracion por tiempo | 2 | Hash de descarte cuando el correo no existe, mismo mensaje por ambos caminos |
| Cupo de peticiones | 2 | 429 tras 10 intentos, y que no afecte a las rutas de lectura |
| Cabeceras y fuga | 4 | `X-Powered-By`, helmet, CORS cerrado, hash nunca en la respuesta |
| Limites de cuerpo | 1 | 413 en cuerpo excedido |

Ejecutar solo esta suite:

```bash
npx jest tests/integration/seguridad
```

---

# Parte 3 — Pendiente

Ordenado por lo que mas aporta:

| # | Pendiente | Requerimiento |
|---|---|---|
| 1 | **Politica de respaldo de Supabase**, documentada y probada con una restauracion | RNF-10 |
| 2 | **Despliegue en produccion** con HTTPS. Sin TLS, `secure` en la cookie y HSTS de helmet no sirven de nada | RNF-17, RNF-04 |
| 3 | **ESLint y Prettier** con las reglas de `convenciones.md`, corriendo en CI | RNF-12 |
| 4 | **Medir RNF-01**: tiempos reales de las consultas principales | RNF-01 |
| 5 | **Pruebas en los tres navegadores**, con captura | RNF-07 |
| 6 | Mover el limitador a un almacen compartido si se despliega con mas de una instancia | RNF-04 |
| 8 | Cerrar RF-03: tokens cortos con refresco, o lista de revocacion | RF-03 |
| 9 | Agregar RNF-19 y RNF-20 a `Requerimientos.md` (redactados en la parte 1) | — |

Los puntos 1, 2 y 3 no tienen ticket en Jira. Hay que levantarlos.

---

# Archivos tocados en este refuerzo

| Archivo | Cambio |
|---|---|
| `src/validators/texto.validator.js` | Nuevo. `sinMarcado`: rechaza etiquetas y esquemas ejecutables en los campos de texto que se guardan (2.7) |
| `src/validators/auth.validator.js` | `sinMarcado` en `nombre` |
| `src/validators/user.validator.js` | `sinMarcado` en `nombre`, al crear y al actualizar |
| `src/routes/web.routes.js` | `/admin/trips/:id/edit` valida el UUID: antes un id invalido llegaba a la consulta y respondia 500 |
| `src/middlewares/rateLimit.middleware.js` | Nuevo. Cupo por IP con `reiniciar()` para las pruebas |
| `src/middlewares/query.middleware.js` | Nuevo. Normaliza la cadena de consulta antes de validarla |
| `tests/integration/seguridad.test.js` | Nuevo. 30 casos |
| `tests/unit/destinoSeguro.test.js` | Nuevo. 8 casos sobre el destino de vuelta |
| `public/js/auth.js` | `destinoSeguro()` en la redireccion posterior al acceso |
| `src/utils/password.util.js` | `verificarInexistente()` contra el hash de descarte |
| `src/services/auth.service.js` | Usa el hash de descarte cuando el correo no existe |
| `src/validators/trip.validator.js` | `imagen_url` exige https en produccion; `sinMarcado` en titulo, destino, descripcion e itinerario |
| `src/app.js` | CORS cerrado, limites de urlencoded, `trust proxy`, `x-powered-by` |
| `src/config/env.js` | `corsOrigenes`, `proxiesDeConfianza` |
| `src/config/constants.js` | `LIMITES_PETICIONES` y dos mensajes |
| `src/middlewares/error.middleware.js` | Traduccion de errores de body-parser |
| `src/routes/index.js` | Cupo general de la API |
| `src/routes/auth.routes.js` | Cupo estrecho en registro e inicio de sesion |
| `src/utils/apiError.js` | `demasiadasPeticiones` (429) |
| `src/utils/jwt.util.js` | Algoritmo fijado a HS256 |
| `src/services/user.service.js` | Lista blanca en la busqueda |
| `src/services/trip.service.js` | Normalizacion del itinerario |
| `tests/integration/auth.routes.test.js` | `reiniciar()` del cupo entre casos |
| `.env.example` | `CORS_ORIGINS`, `TRUST_PROXY` |
