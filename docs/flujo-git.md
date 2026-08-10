# Flujo de trabajo con Git

Documento de referencia del equipo. Define las ramas, la convencion de commits y
el proceso de integracion por Pull Request. Aplica a todo el repositorio.

Repositorio: <https://github.com/mellyeat/Tripticks>

---

## 1. Ramas principales

El proyecto usa un flujo tipo **GitHub Flow con rama de integracion** (GitFlow
reducido): dos ramas permanentes y ramas temporales de trabajo.

| Rama | Proposito | Se escribe con | Vida |
|------|-----------|----------------|------|
| `main` | Codigo estable y entregable. Cada commit deberia poder desplegarse. | PR desde `dev` o desde `hotfix/*` | Permanente |
| `dev` | Integracion del trabajo del equipo. Es la base de todas las ramas nuevas. | PR desde `feature/*`, `fix/*` | Permanente |

Ninguna de las dos se escribe con `git push` directo: ambas estan protegidas en
GitHub (ver seccion 5).

```
main   ●────────────────────●──────────────────●
        \                  /                  /
dev      ●───●───●────────●───●───●──────────●
              \         /       \          /
feature/       ●───●───●         ●───●────●
```

---

## 2. Ramas de trabajo

Se crean **siempre a partir de `dev`** actualizado y se borran al integrarse.

| Prefijo | Para que | Sale de | Entra a |
|---------|----------|---------|---------|
| `feature/` | Funcionalidad nueva | `dev` | `dev` |
| `fix/` | Correccion de un defecto detectado en desarrollo | `dev` | `dev` |
| `release/` | Preparacion de una version: ajustes finales, numero de version, documentacion | `dev` | `main` y de vuelta a `dev` |
| `hotfix/` | Correccion urgente de algo roto en produccion | `main` | `main` y de vuelta a `dev` |

### Convencion de nombres

Minusculas, palabras separadas por guiones, en espanol y sin acentos. Cuando
exista un issue, se antepone su numero.

```
feature/12-catalogo-de-viajes
feature/reservacion-de-viaje
fix/23-validacion-de-correo
release/1.0.0
hotfix/token-expirado
```

Nombres a evitar: `arreglos`, `cambios-juan`, `prueba2`.

### Como abrir una rama

```bash
git checkout dev
git pull origin dev
git checkout -b feature/12-catalogo-de-viajes
```

---

## 3. Convencion de mensajes de commit

Se usa **Conventional Commits**.

```
<tipo>(<alcance opcional>): <descripcion en minuscula, sin punto final>

<cuerpo opcional: que cambio y por que, no como>
```

### Tipos permitidos

| Tipo | Se usa para |
|------|-------------|
| `feat` | Funcionalidad nueva para el usuario |
| `fix` | Correccion de un defecto |
| `docs` | Solo documentacion |
| `style` | Formato que no altera el comportamiento (espacios, comas, sangria) |
| `refactor` | Reescritura que no agrega funcionalidad ni corrige un defecto |
| `test` | Alta o ajuste de pruebas |
| `chore` | Configuracion, dependencias, tareas de mantenimiento |
| `perf` | Mejora de rendimiento |

### Alcances usados en este proyecto

`config`, `db`, `models`, `services`, `middlewares`, `auth`, `server`, `ui`,
`routes`, `utils`.

### Reglas

1. El titulo va en imperativo y en presente: "agregar", no "agregado" ni "agrega".
2. Maximo 72 caracteres en el titulo.
3. Sin punto final en el titulo.
4. El cuerpo explica el *por que*; el *como* ya esta en el diff.
5. Un commit, un cambio con sentido propio. No mezclar una funcionalidad con el
   reformateo de otro archivo.
6. Si el commit cierra un issue, se anota al final: `Closes #12`.

### Ejemplos tomados del historial del proyecto

```
feat(auth): implementar registro, inicio y cierre de sesion (RF-01 a RF-03)
feat(middlewares): agregar autenticacion, roles, validacion y errores
test(integration): cubrir los endpoints de autenticacion
chore: configurar dependencias, variables de entorno y scripts
```

Ejemplo con cuerpo:

```
fix(auth): responder el mismo mensaje ante correo inexistente

Distinguir "el correo no existe" de "la contrasena es incorrecta" permitia
averiguar que correos estan registrados en el sistema.

Closes #23
```

---

## 4. Proceso de integracion por Pull Request

### Antes de abrir el PR

```bash
npm test                       # las pruebas deben pasar
git checkout dev
git pull origin dev
git checkout feature/mi-rama
git merge dev                  # traer los cambios del equipo y resolver conflictos aqui
git push -u origin feature/mi-rama
```

Los conflictos se resuelven **en la rama de trabajo**, nunca en `dev` ni en `main`.

### Al abrir el PR

1. Destino: `dev` (o `main` si es `release/*` o `hotfix/*`).
2. Titulo con el mismo formato que un commit: `feat(ui): agregar el catalogo de viajes`.
3. Descripcion siguiendo la plantilla del repositorio, que se carga sola.
4. Enlazar el issue que resuelve.
5. Asignar al menos un revisor del equipo.

### Revision

- Todo PR necesita **al menos una aprobacion** de alguien que no sea el autor.
- El revisor comenta sobre el codigo, no sobre la persona.
- Toda conversacion abierta debe resolverse antes de mezclar.
- Si el PR es muy grande para revisarse, se pide dividirlo.

### Mezcla

- Metodo: **Squash and merge** hacia `dev`, para que cada funcionalidad quede
  como un commit legible en el historial.
- Excepcion: los PR de `release/*` y `hotfix/*` hacia `main` se mezclan con
  **merge commit**, para conservar la trazabilidad de la version.
- La rama se borra despues de mezclar (GitHub lo ofrece con un boton).
- El autor del PR es quien mezcla, una vez aprobado.

### Despues de mezclar a main

Un `hotfix` o un `release` que entro a `main` se devuelve a `dev` para que no se
pierda la correccion:

```bash
git checkout dev
git pull origin dev
git merge origin/main
git push origin dev
```

---

## 5. Reglas de proteccion configuradas

Aplicadas en GitHub sobre el repositorio (Settings > Branches).

### `main`

- Prohibido el push directo: todo cambio entra por Pull Request.
- Requiere 1 aprobacion antes de mezclar.
- Las aprobaciones se descartan si se suben commits nuevos al PR.
- Requiere que las conversaciones del PR esten resueltas.
- Prohibido el `force push` y el borrado de la rama.

### `dev`

- Prohibido el push directo: todo cambio entra por Pull Request.
- No exige aprobacion, para no frenar la integracion diaria del equipo.
- Prohibido el `force push` y el borrado de la rama.

Si al intentar un `git push` aparece `protected branch hook declined`, la regla
esta cumpliendo su funcion: el cambio debe ir por un PR.

---

## 6. Acceso del equipo

Cada integrante necesita:

1. Cuenta de GitHub con acceso de escritura al repositorio
   (Settings > Collaborators > Add people, permiso *Write*).
2. Git configurado con su identidad real, para que sus commits se le atribuyan:

```bash
git config --global user.name "Nombre Apellido"
git config --global user.email "correo-de-github@ejemplo.com"
```

   El correo debe ser el mismo de su cuenta de GitHub. Si no coincide, los
   commits aparecen sin autor vinculado y no cuentan como contribucion.

3. Clonar y ubicarse en `dev`:

```bash
git clone https://github.com/mellyeat/Tripticks.git
cd Tripticks
git checkout dev
npm install
cp .env.example .env      # y completar los valores
```

---

## 7. Resumen para el dia a dia

```bash
git checkout dev && git pull origin dev      # 1. partir de dev al dia
git checkout -b feature/mi-funcionalidad     # 2. abrir la rama
git add . && git commit -m "feat(ui): ..."   # 3. commits pequenos y con formato
npm test                                     # 4. verificar antes de subir
git push -u origin feature/mi-funcionalidad  # 5. subir la rama
                                             # 6. abrir el PR hacia dev en GitHub
                                             # 7. atender la revision y mezclar
```

Reglas cortas:

- Nunca se trabaja directo sobre `main` ni sobre `dev`.
- Nunca se sube codigo que no compila o con pruebas en rojo.
- El `.env` jamas se sube: ya esta en `.gitignore`.
