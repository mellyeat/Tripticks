'use strict';

const path = require('path');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const rutas = require('./routes');
const rutasWeb = require('./routes/web.routes');
const registroHttp = require('./middlewares/logger.middleware');
const normalizarConsulta = require('./middlewares/query.middleware');
const noEncontrado = require('./middlewares/notFound.middleware');
const manejarErrores = require('./middlewares/error.middleware');
const { ORIGENES_IMAGEN } = require('./config/constants');
const { corsOrigenes, proxiesDeConfianza } = require('./config/env');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.resolve(__dirname, 'views'));

// req.ip es la llave del cupo de peticiones: detras de un proxy tiene que salir
// de X-Forwarded-For y no de la IP del propio proxy.
app.set('trust proxy', proxiesDeConfianza);

// Express anuncia el motor en cada respuesta; es informacion gratis para quien
// busca vulnerabilidades conocidas de una version concreta.
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ORIGENES_IMAGEN,
      },
    },
  })
);
/* La API y las vistas se sirven desde el mismo origen, asi que por omision no se
   permite ninguno externo. CORS_ORIGINS abre la puerta solo a los que se
   declaren, y nunca con credenciales: una cookie de sesion que viaje a otro
   origen es una sesion que ese origen puede usar. */
app.use(
  cors({
    origin: corsOrigenes.length > 0 ? corsOrigenes : false,
    credentials: false,
  })
);

/* Los limites de tamano cortan el cuerpo antes de parsearlo. En urlencoded
   ademas se acota la profundidad y el numero de campos: sin eso, un formulario
   con miles de claves anidadas obliga al servidor a construir el objeto entero
   antes de que ninguna validacion llegue a mirarlo. */
app.use(express.json({ limit: '10kb' }));
app.use(
  express.urlencoded({
    extended: true,
    limit: '10kb',
    parameterLimit: 100,
    depth: 5,
  })
);
app.use(cookieParser());

/* Antes que cualquier validador: un parametro repetido llega como arreglo y
   reventaria a express-validator con un 500. */
app.use(normalizarConsulta);

app.use(registroHttp);

app.use(express.static(path.resolve(__dirname, '../public')));

app.use('/api', rutas);
app.use('/', rutasWeb);

app.use(noEncontrado);
app.use(manejarErrores);

module.exports = app;
