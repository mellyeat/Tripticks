# Tripticks

Sistema de reservacion de viajes (Express.js + Supabase) bajo arquitectura MVC.

## Puesta en marcha con Docker

Solo hace falta Docker: las dependencias y los estilos se compilan dentro de la imagen.

```bash
cp .env.example .env   # completar SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y JWT_SECRET
docker compose up --build
```

La aplicacion queda en http://localhost:3000 (o el `PORT` que se defina en `.env`).

## Documentacion

| Documento | Contenido |
|---|---|
| [Flujo de trabajo con Git](./docs/flujo-git.md) | **Lectura obligatoria antes del primer commit.** Ramas, convencion de commits y proceso de Pull Request |
| [Convenciones de codigo](./docs/convenciones.md) | **Lectura obligatoria antes del primer commit.** Nomenclatura, formato, estructura de carpetas y buenas practicas |
| [API REST](./docs/api.md) | Endpoints, contratos de peticion y respuesta |
