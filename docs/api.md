# Documentacion tecnica de la API REST

Base: `/api` · Formato: JSON · Autenticacion: JWT en `Authorization: Bearer <token>`

Ademas del encabezado, el servidor acepta el mismo token en la cookie `tripticks.token`,
que emite al iniciar sesion. Es lo que permite que las vistas renderizadas con Pug sepan
quien esta conectado; para consumir la API desde otro cliente basta con el encabezado.

## Formato de respuestas

Toda respuesta usa la misma envoltura (RF-18, RF-20).

Exito:

```json
{ "exito": true, "mensaje": "Inicio de sesion exitoso.", "datos": { } }
```

Error:

```json
{
  "exito": false,
  "mensaje": "Los datos enviados no son validos.",
  "detalles": [{ "campo": "email", "mensaje": "El correo electronico no tiene un formato valido." }]
}
```

`detalles` solo aparece en errores de validacion (RF-19).

### Codigos usados

| Codigo | Cuando |
|--------|--------|
| 200 | Operacion exitosa |
| 201 | Recurso creado |
| 400 | Datos invalidos |
| 401 | Falta el token, es invalido o expiro |
| 403 | Autenticado pero sin permisos, o cuenta desactivada |
| 404 | Recurso o ruta inexistente |
| 409 | Conflicto (correo ya registrado) |
| 500 | Error interno |

---

## Autenticacion

### POST /api/auth/register

Crea una cuenta (RF-01). Publico.

Cuerpo:

| Campo | Tipo | Reglas |
|-------|------|--------|
| `nombre` | string | Obligatorio, 3 a 100 caracteres |
| `email` | string | Obligatorio, formato valido, unico |
| `password` | string | Obligatorio, 8 a 72 caracteres, con mayuscula, minuscula y numero |

El campo `rol` se ignora si se envia: toda cuenta nueva se crea como `usuario` (RF-17).

```http
POST /api/auth/register
Content-Type: application/json

{ "nombre": "Ana Martinez", "email": "ana@ejemplo.com", "password": "Secreta123" }
```

`201`:

```json
{
  "exito": true,
  "mensaje": "Cuenta creada correctamente.",
  "datos": {
    "usuario": { "id": "uuid", "nombre": "Ana Martinez", "email": "ana@ejemplo.com", "rol": "usuario", "activo": true, "creado_en": "2026-01-01T00:00:00.000Z" },
    "token": "eyJhbGciOi..."
  }
}
```

Errores: `400` validacion · `409` correo ya registrado.

---

### POST /api/auth/login

Inicia sesion y emite el token (RF-02). Publico.

| Campo | Tipo | Reglas |
|-------|------|--------|
| `email` | string | Obligatorio |
| `password` | string | Obligatorio |

Respuesta `200`: misma forma que el registro.

Errores: `400` validacion · `401` credenciales invalidas · `403` cuenta desactivada.

El `401` usa el mismo mensaje para correo inexistente y contrasena incorrecta,
para no revelar que correos estan registrados.

---

### POST /api/auth/logout

Cierra sesion (RF-03). Requiere token.

El token es sin estado: el endpoint borra la cookie `tripticks.token` y confirma con `200`.
El cliente que use el encabezado `Authorization` cierra sesion al descartar su copia.

---

### GET /api/auth/me

Devuelve el perfil del usuario autenticado. Requiere token.

Los datos se releen de la base en cada llamada, asi que refleja cambios de rol o
desactivaciones ocurridos despues de emitir el token.

`200`:

```json
{ "exito": true, "mensaje": "Perfil obtenido.", "datos": { "usuario": { } } }
```

Errores: `401` token ausente, invalido o expirado · `403` cuenta desactivada · `404` el usuario ya no existe.

---

### GET /api/health

Sonda de disponibilidad para el monitoreo (RNF-04). Publico.

---

## Viajes

Las respuestas devuelven las columnas tal como estan en la base (`fecha_salida`,
`cupos_disponibles`), y las peticiones usan esos mismos nombres. `duracion_dias` lo calcula
la base a partir de las dos fechas: no se envia ni se puede editar.

### GET /api/trips

Lista el catalogo (RF-04). Publico. Acepta token de forma opcional: solo cambia lo que se ve
si quien consulta es administrador.

Parametros de consulta, todos opcionales:

| Parametro | Tipo | Efecto |
|---|---|---|
| `destino` | string | Coincidencia parcial sin distinguir mayusculas (RF-05) |
| `precio_max` | number | Precio maximo (RF-06) |
| `salida` | `AAAA-MM-DD` | Solo viajes que salgan en esa fecha o despues (RF-06) |
| `regreso` | `AAAA-MM-DD` | Solo viajes que regresen en esa fecha o antes (RF-06) |
| `disponibles` | `1` | Solo viajes con cupos libres (RF-06) |
| `orden` | `salida` \| `precio_asc` \| `precio_desc` \| `destino` | Por defecto `salida` |
| `pagina` | entero >= 1 | Por defecto `1` |
| `limite` | entero 1 a 50 | Por defecto `9` |
| `incluir_inactivos` | `1` | Agrega los desactivados y los ya salidos. **Solo administrador**; se ignora en cualquier otro caso |

Los comodines `%` y `_` se descartan del criterio de busqueda para que nadie amplie el
filtro escribiendolos. Sin `incluir_inactivos`, la lista nunca muestra viajes desactivados
ni viajes cuya salida ya paso.

`200`:

```json
{
  "exito": true,
  "mensaje": "Viajes obtenidos.",
  "datos": {
    "viajes": [
      {
        "id": "uuid",
        "titulo": "Retiro Alpino Exclusivo en los Dolomitas",
        "destino": "Dolomitas, Italia",
        "precio": "2450.00",
        "fecha_salida": "2026-10-12",
        "fecha_regreso": "2026-10-18",
        "duracion_dias": 7,
        "cupos_totales": 12,
        "cupos_disponibles": 4,
        "imagen_url": "https://...",
        "activo": true
      }
    ],
    "paginacion": { "pagina": 1, "limite": 9, "total": 6, "paginas": 1 }
  }
}
```

La lista omite `descripcion` e `itinerario`: son campos largos que solo hacen falta en el
detalle (RNF-01).

Errores: `400` parametro de consulta invalido.

---

### GET /api/trips/:id

Devuelve el viaje completo con `descripcion` e `itinerario` (RF-07). Publico.

`itinerario` es un arreglo de `{ "dia": 1, "titulo": "...", "descripcion": "..." }`.

Un viaje desactivado sigue siendo consultable por su identificador; lo que hace `activo:
false` es sacarlo del catalogo, no ocultarlo a quien ya tiene el enlace.

Errores: `400` el id no es un uuid · `404` el viaje no existe.

---

### POST /api/trips

Crea un viaje (RF-13). Requiere token de **administrador**.

| Campo | Tipo | Reglas |
|---|---|---|
| `titulo` | string | Obligatorio, 5 a 150 caracteres |
| `destino` | string | Obligatorio, 3 a 120 caracteres |
| `descripcion` | string | Obligatorio, 20 a 2000 caracteres |
| `itinerario` | array | Opcional, hasta 60 dias; cada uno con `dia`, `titulo` y `descripcion` |
| `precio` | number | Obligatorio, mayor a cero |
| `fecha_salida` | `AAAA-MM-DD` | Obligatorio, no puede estar en el pasado |
| `fecha_regreso` | `AAAA-MM-DD` | Obligatorio, igual o posterior a la salida |
| `cupos_totales` | entero | Obligatorio, mayor a cero |
| `cupos_disponibles` | entero | Opcional, no puede superar a `cupos_totales`; por defecto se iguala a el |
| `imagen_url` | string | Obligatorio, URL `http` o `https` de hasta 500 caracteres |
| `activo` | boolean | Opcional, por defecto `true` |

```http
POST /api/trips
Authorization: Bearer <token de administrador>
Content-Type: application/json

{
  "titulo": "Auroras Boreales en Laponia",
  "destino": "Rovaniemi, Finlandia",
  "descripcion": "Siete noches en cabanas de cristal dentro del circulo polar artico.",
  "precio": 2240,
  "fecha_salida": "2027-01-15",
  "fecha_regreso": "2027-01-21",
  "cupos_totales": 16,
  "imagen_url": "https://picsum.photos/seed/laponia/1200/800"
}
```

`201`: `{ "exito": true, "mensaje": "Viaje creado correctamente.", "datos": { "viaje": { } } }`

Errores: `400` validacion o fechas y cupos incoherentes · `401` sin token · `403` no es administrador.

---

### PUT /api/trips/:id

Edita un viaje (RF-13). Requiere token de **administrador**.

Acepta los mismos campos que el alta, todos opcionales, y aplica solo los que se envien.
La coherencia de fechas y cupos se comprueba contra el estado resultante, no solo contra lo
enviado: bajar `cupos_totales` por debajo de los `cupos_disponibles` actuales devuelve `400`.

Enviar `{ "activo": false }` es la forma de retirar un viaje del catalogo conservando sus
reservaciones.

Errores: `400` validacion, cuerpo vacio o resultado incoherente · `401` · `403` · `404`.

---

### DELETE /api/trips/:id

Borra un viaje (RF-13). Requiere token de **administrador**.

El borrado es definitivo y solo procede si el viaje no tiene reservaciones. Si las tiene,
responde `409` y hay que desactivarlo con `PUT` en su lugar: asi ninguna reservacion queda
apuntando a un viaje inexistente (RNF-14).

Errores: `401` · `403` · `404` el viaje no existe · `409` tiene reservaciones asociadas.

---

## Reservaciones

Toda ruta de esta seccion requiere token. Un usuario solo alcanza sus propias reservaciones;
el administrador las ve todas.

Las respuestas traen el viaje y el titular anidados (`viaje`, `usuario`) para que la vista
pinte la tarjeta sin una segunda peticion.

### GET /api/reservations

Lista las reservaciones (RF-10 para el titular, RF-15 para el administrador).

| Parametro | Tipo | Efecto |
|---|---|---|
| `usuario_id` | uuid | Acota a un titular. **Solo administrador**; se ignora en cualquier otro caso |
| `viaje_id` | uuid | Acota a un viaje |
| `estado` | `activa` \| `cancelada` \| `completada` | Filtra por estado |
| `metodo_pago` | `tarjeta` \| `paypal` | Filtra por metodo |
| `desde` / `hasta` | `AAAA-MM-DD` | Acotan por fecha de creacion |
| `pagina` / `limite` | entero | Igual que en viajes; por defecto `1` y `9` |

`200`: `{ "datos": { "reservaciones": [ ], "paginacion": { } } }`

---

### GET /api/reservations/:id

Devuelve una reservacion (RF-10).

Errores: `400` el id no es un uuid · `403` la reservacion es de otra persona · `404` no existe.

---

### POST /api/reservations

Crea una reservacion (RF-08). El titular sale del token: `usuario_id` en el cuerpo se ignora.

| Campo | Tipo | Reglas |
|---|---|---|
| `viaje_id` | uuid | Obligatorio |
| `metodo_pago` | `tarjeta` \| `paypal` | Opcional, por defecto `tarjeta` |

El alta descuenta el cupo dentro de la misma transaccion que valida la disponibilidad
(RF-11), asi que dos peticiones simultaneas no pueden pasarse del limite. El total se calcula
en el servidor: `precio + precio * 0.16`.

`201`: `{ "datos": { "reservacion": { "folio": "TT-007842", } } }`

Errores: `400` validacion · `404` el viaje no existe · `409` ya tienes una reservacion activa
para ese viaje (RF-12), el viaje no tiene cupos (RF-11), esta desactivado o ya salio.

---

### PATCH /api/reservations/:id

Cambia el estado de una reservacion (RF-09 y RF-15).

| Campo | Tipo | Reglas |
|---|---|---|
| `estado` | `activa` \| `cancelada` \| `completada` | Obligatorio |

**No existe `DELETE`**: una reservacion nunca se borra, y cancelarla es un cambio de estado.
El mismo endpoint sirve a los dos actores y el servidor decide que puede hacer cada uno:

| Quien | Transicion permitida |
|---|---|
| Titular | Solo a `cancelada`, y solo sobre sus reservaciones (RF-09) |
| Administrador | A `cancelada` o `completada` sobre cualquiera (RF-15) |

Pasar a `cancelada` libera el lugar en el viaje, tambien de forma transaccional. Una
reservacion ya cancelada no vuelve a `activa`: el cupo que libero pudo haberlo tomado alguien
mas, asi que responde `409`.

Errores: `400` validacion · `403` un usuario intentando un estado distinto de `cancelada`, o
una reservacion ajena · `404` no existe · `409` ya no esta activa.

---

## Usuarios

Todas las rutas requieren token de **administrador** (RF-14, RF-17).

### GET /api/users

Lista las cuentas.

| Parametro | Tipo | Efecto |
|---|---|---|
| `rol` | `usuario` \| `administrador` | Filtra por rol |
| `activo` | `true` \| `false` | Filtra por estado de la cuenta |
| `busqueda` | string | Coincidencia parcial en nombre o correo |
| `pagina` / `limite` | entero | Por defecto `1` y `9` |

---

### GET /api/users/:id

Devuelve una cuenta. Nunca incluye `password_hash`.

---

### POST /api/users

Da de alta una cuenta desde la consola. A diferencia del registro publico, aqui **si** se
puede fijar el `rol`.

| Campo | Tipo | Reglas |
|---|---|---|
| `nombre` | string | Obligatorio, 3 a 100 caracteres |
| `email` | string | Obligatorio, formato valido, unico |
| `password` | string | Obligatorio, mismas reglas que el registro |
| `rol` | `usuario` \| `administrador` | Opcional, por defecto `usuario` |
| `activo` | boolean | Opcional, por defecto `true` |

Errores: `400` validacion · `409` correo ya registrado.

---

### PUT /api/users/:id

Edita la cuenta y asigna roles (RF-14). Acepta `nombre`, `email`, `rol` y `activo`, todos
opcionales, y aplica solo los que se envien.

Dos reglas protegen el acceso al sistema:

- Nadie puede quitarse a si mismo el rol ni desactivar su propia cuenta (`409`).
- No se puede degradar ni desactivar al **ultimo administrador activo** (`409`): dejaria el
  sistema sin nadie capaz de administrarlo y sin forma de recuperarlo desde la aplicacion.

Errores: `400` validacion o cuerpo vacio · `404` no existe · `409` correo duplicado o alguna
de las dos reglas anteriores.

---

### DELETE /api/users/:id

**Da de baja logica**: pone `activo` en `false` y devuelve la cuenta actualizada. La fila
nunca se borra, porque `reservaciones.usuario_id` tiene `on delete cascade` y un borrado real
se llevaria por delante todo el historial de reservaciones del usuario (RNF-14).

Es idempotente: sobre una cuenta ya desactivada responde `200` sin volver a escribir.

Rigen las mismas dos protecciones que en `PUT`.

Errores: `404` no existe · `409` es tu propia cuenta o el ultimo administrador activo.

---

## Dashboard

### GET /api/dashboard

Devuelve las metricas del panel (RF-16). Requiere token de **administrador**.

Los conteos, la suma de ingresos y el ranking por demanda se resuelven en una sola funcion de
la base (`estadisticas_dashboard`) para no traerse las tablas completas al servidor (RNF-01).

`200`:

```json
{
  "exito": true,
  "mensaje": "Estadisticas obtenidas.",
  "datos": {
    "totales": {
      "usuarios": 48, "usuariosActivos": 45, "administradores": 2,
      "viajes": 6, "viajesActivos": 6,
      "reservaciones": 12, "reservacionesActivas": 9, "ingresos": 28420
    },
    "demanda": [{ "id": "uuid", "titulo": "...", "reservaciones": 8 }],
    "recientes": []
  }
}
```

`demanda` trae los 5 viajes con mas reservaciones activas; `recientes`, las 5 ultimas
reservaciones con su viaje y su titular.

---

## Notas de seguridad

- Las contrasenas se almacenan con bcrypt y nunca se devuelven en ninguna respuesta (RNF-02).
- El payload del JWT solo contiene `sub` (id) y `rol`: el token es legible por quien lo tenga.
- La expiracion se controla con `JWT_EXPIRES_IN` (por defecto 2 horas).
- Las rutas protegidas revalidan al usuario contra la base en cada peticion, no solo la firma del token.
- La cookie `tripticks.token` es `httpOnly` y `sameSite=lax`, y viaja con `secure` en
  produccion. No lleva `maxAge`: dura lo que la ventana del navegador y, en todo caso, lo
  que dure el JWT que contiene.

---

## Pendiente

La API cubre RF-01 a RF-20. Queda fuera, por no corresponder a ningun requerimiento:

- Edicion del perfil propio y cambio de contrasena (`profile` y `security` las ofrecen en la
  interfaz, pero no hay endpoint ni columnas que las respalden).
- Metodos de pago guardados: no existe la tabla; el checkout no procesa cobros reales.
