# Requerimientos del Sistema

## Requerimientos Funcionales

### RF-01 Registro de usuarios
El sistema deberá permitir que un usuario cree una cuenta proporcionando la siguiente información:

- Nombre completo.
- Correo electrónico.
- Contraseña.

El sistema deberá validar que el correo electrónico no exista previamente.

---

### RF-02 Inicio de sesión
El sistema deberá permitir que un usuario inicie sesión mediante:

- Correo electrónico.
- Contraseña.

Una vez autenticado, el sistema deberá generar un token JWT para acceder a las funciones protegidas.

---

### RF-03 Cierre de sesión
El sistema deberá permitir que el usuario cierre sesión eliminando el token de autenticación.

---

### RF-04 Consulta de viajes
El sistema deberá mostrar la lista de viajes disponibles incluyendo:

- Destino.
- Precio.
- Fecha de salida.
- Fecha de regreso.
- Cupos disponibles.
- Imagen representativa.

---

### RF-05 Buscar viajes
El sistema deberá permitir buscar viajes utilizando el destino como criterio de búsqueda.

---

### RF-06 Filtrar viajes
El sistema deberá permitir filtrar viajes por:

- Destino.
- Precio.
- Fecha.
- Disponibilidad.

---

### RF-07 Ver detalle del viaje
El usuario podrá visualizar toda la información del viaje seleccionado.

La información deberá incluir:

- Descripción.
- Itinerario.
- Precio.
- Fechas.
- Cupos disponibles.
- Imagen.

---

### RF-08 Crear reservación
El sistema permitirá realizar una reservación de un viaje disponible.

Al confirmar la reservación deberá:

- Registrar al usuario.
- Registrar el viaje.
- Registrar la fecha.
- Disminuir el número de lugares disponibles.

---

### RF-09 Cancelar reservación
El usuario podrá cancelar una reservación previamente realizada.

Al cancelar:

- Se actualizará el estado de la reservación.
- Se liberará el lugar disponible.

---

### RF-10 Consultar reservaciones
El usuario podrá consultar todas las reservaciones asociadas a su cuenta.

---

### RF-11 Validar disponibilidad
Antes de confirmar una reservación, el sistema deberá verificar que existan lugares disponibles.

---

### RF-12 Evitar reservaciones duplicadas
El sistema no permitirá que un usuario reserve el mismo viaje más de una vez mientras tenga una reservación activa.

---

### RF-13 Administración de viajes
El administrador podrá:

- Crear viajes.
- Editar viajes.
- Eliminar viajes.
- Consultar todos los viajes registrados.

---

### RF-14 Administración de usuarios
El administrador podrá:

- Consultar usuarios.
- Editar información de usuarios.
- Eliminar usuarios.
- Asignar roles.

---

### RF-15 Administración de reservaciones
El administrador podrá:

- Consultar reservaciones.
- Modificar su estado.
- Cancelar reservaciones.

---

### RF-16 Dashboard de administración
El administrador podrá visualizar información estadística como:

- Total de usuarios.
- Total de viajes.
- Total de reservaciones.
- Viajes con mayor demanda.

---

### RF-17 Control de acceso
El sistema deberá restringir el acceso a las funcionalidades de acuerdo con el rol del usuario:

- Administrador.
- Usuario.

---

### RF-18 API REST
El sistema deberá proporcionar una API REST para administrar:

- Usuarios.
- Viajes.
- Reservaciones.
- Autenticación.

---

### RF-19 Validación de datos
El sistema deberá validar toda la información antes de almacenarla.

Las validaciones incluyen:

- Campos obligatorios.
- Correos electrónicos válidos.
- Contraseñas válidas.
- Fechas válidas.
- Cupos mayores a cero.

---

### RF-20 Manejo de errores
El sistema deberá mostrar mensajes de error claros cuando ocurra alguna excepción, por ejemplo:

- Usuario inexistente.
- Contraseña incorrecta.
- Viaje sin disponibilidad.
- Error interno del servidor.

---

# Requerimientos No Funcionales

### RNF-01 Rendimiento
Las consultas principales del sistema deberán responder en un tiempo menor a **3 segundos** bajo condiciones normales de uso.

---

### RNF-02 Seguridad
Las contraseñas deberán almacenarse utilizando algoritmos de hash seguros como **bcrypt**.

---

### RNF-03 Autenticación
Las rutas protegidas deberán utilizar autenticación mediante **JWT**.

---

### RNF-04 Disponibilidad
El sistema deberá mantener una disponibilidad mínima del **95 %** durante su operación.

---

### RNF-05 Escalabilidad
La arquitectura deberá permitir agregar nuevas funcionalidades sin afectar los módulos existentes.

---

### RNF-06 Mantenibilidad
El proyecto deberá implementarse siguiendo el patrón de arquitectura **MVC** para facilitar el mantenimiento.

---

### RNF-07 Compatibilidad
La aplicación deberá funcionar correctamente en los siguientes navegadores:

- Google Chrome.
- Microsoft Edge.
- Mozilla Firefox.

---

### RNF-08 Responsividad
La interfaz deberá adaptarse correctamente a dispositivos:

- Computadoras.
- Tablets.
- Teléfonos móviles.

---

### RNF-09 Base de datos
La información deberá almacenarse en **Supabase**, utilizando integridad referencial mediante llaves primarias y foráneas.

---

### RNF-10 Respaldo de información
La base de datos deberá contar con mecanismos de respaldo para prevenir la pérdida de información.

---

### RNF-11 Usabilidad
La interfaz deberá ser intuitiva y permitir realizar una reservación de manera sencilla y con una navegación clara.

---

### RNF-12 Calidad del código
Todo el código deberá seguir las convenciones de desarrollo establecidas por el equipo.

---

### RNF-13 Portabilidad
La aplicación deberá poder desplegarse en cualquier servidor compatible con **Node.js** mediante el uso de variables de entorno.

---

### RNF-14 Confiabilidad
El sistema deberá garantizar la consistencia de la información evitando registros duplicados y validando todas las operaciones críticas.

---

### RNF-15 Registro de eventos
El sistema deberá generar registros (logs) de errores y eventos importantes para facilitar el monitoreo y la depuración.

---

### RNF-16 Documentación
El proyecto deberá incluir documentación técnica y documentación de usuario para facilitar su instalación, configuración y uso.

---

### RNF-17 Despliegue
La aplicación deberá poder desplegarse en un entorno de producción utilizando variables de entorno para proteger la información sensible.

---

### RNF-18 Pruebas
Las funcionalidades principales deberán ser verificadas mediante casos de prueba antes de la entrega final del proyecto.

---

# Relación con las Épicas

| Épica | Requerimientos relacionados |
|--------|-----------------------------|
| Épica 1 - Configuración inicial | RNF-05, RNF-06, RNF-12, RNF-13 |
| Épica 2 - Base de Datos | RF-11, RF-12, RNF-09, RNF-10 |
| Épica 3 - Backend | RF-01 al RF-20 |
| Épica 4 - Frontend | RF-04 al RF-20, RNF-07, RNF-08, RNF-11 |
| Épica 5 - Integración | RF-18, RF-19, RF-20 |
| Épica 6 - DevOps | RNF-01, RNF-04, RNF-10, RNF-15, RNF-17 |
| Épica 7 - Testing | RNF-18 |
| Épica 8 - Documentación | RNF-16 |

---

## Resumen

- **20 Requerimientos Funcionales**
- **18 Requerimientos No Funcionales**
- Basados en la metodología Scrum y alineados con las épicas, historias de usuario y Product Backlog del proyecto de reservación de viajes desarrollado con **Express.js**, **JavaScript**, **HTML5**, **Tailwind CSS** y **Supabase**.