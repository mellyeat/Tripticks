'use strict';

/**
 * Cierre de sesion desde el navegador (public/js/session.js).
 *
 * La sesion vive en una cookie httpOnly: el navegador no puede leerla ni
 * borrarla, solo el servidor. localStorage es un espejo para pintar la
 * interfaz, no la sesion. Si el cierre depende de ese espejo, basta con que
 * este vacio para que la cookie sobreviva y la sesion vuelva sola al recargar.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function cargarSesion({ token }) {
  const archivo = path.resolve(__dirname, '../../public/js/session.js');
  const codigo = fs.readFileSync(archivo, 'utf8');

  const llamadas = [];
  const almacen = token ? { 'tripticks.token': token } : {};

  // El modulo es un IIFE de navegador: se le da un "window" minimo. No se
  // dispara DOMContentLoaded, asi que no conecta ningun boton.
  const ventana = {
    document: {
      body: { getAttribute: () => null },
      getElementById: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
    },
    localStorage: {
      getItem: (clave) => (clave in almacen ? almacen[clave] : null),
      setItem: (clave, valor) => {
        almacen[clave] = valor;
      },
      removeItem: (clave) => {
        delete almacen[clave];
      },
    },
    location: { href: '/perfil' },
    Api: {
      post: (ruta) => {
        llamadas.push(ruta);
        return Promise.resolve({});
      },
    },
  };

  vm.runInNewContext(codigo, { window: ventana });

  return { sesion: ventana.Sesion, llamadas, ventana, almacen };
}

describe('cerrarSesion', () => {
  it('avisa al servidor aunque localStorage este vacio, porque la cookie sigue viva', async () => {
    const { sesion, llamadas } = cargarSesion({ token: null });

    sesion.cerrarSesion();
    await Promise.resolve();

    expect(llamadas).toEqual(['/auth/logout']);
  });

  it('avisa al servidor cuando si hay token guardado', async () => {
    const { sesion, llamadas } = cargarSesion({ token: 'jwt-de-prueba' });

    sesion.cerrarSesion();
    await Promise.resolve();

    expect(llamadas).toEqual(['/auth/logout']);
  });

  it('limpia el espejo local y vuelve a la portada', async () => {
    const { sesion, ventana, almacen } = cargarSesion({ token: 'jwt-de-prueba' });

    sesion.cerrarSesion();
    await Promise.resolve();
    await Promise.resolve();

    expect(almacen['tripticks.token']).toBeUndefined();
    expect(ventana.location.href).toBe('/');
  });
});
