'use strict';

/**
 * El destino de vuelta despues de iniciar sesion (public/js/auth.js).
 *
 * Llega en la barra de direcciones, asi que lo elige quien arme el enlace. Un
 * /login?destino=... sin comprobar manda al usuario fuera del sitio, o ejecuta
 * codigo en el nuestro, justo despues de que escribio su contrasena.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function cargarDestinoSeguro() {
  const archivo = path.resolve(__dirname, '../../public/js/auth.js');
  const codigo = fs.readFileSync(archivo, 'utf8');

  // El modulo es un IIFE de navegador: se le da un "window" minimo con lo que
  // toca al cargarse, sin llegar a conectar ningun formulario.
  const ventana = {
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: (evento, escucha) => {
        if (evento === 'DOMContentLoaded') {
          escucha();
        }
      },
    },
    location: { search: '', pathname: '/' },
    URLSearchParams,
  };

  vm.runInNewContext(codigo, { window: ventana, URLSearchParams });

  return ventana.Acceso.destinoSeguro;
}

const destinoSeguro = cargarDestinoSeguro();

describe('destinoSeguro', () => {
  it('conserva una ruta interna', () => {
    expect(destinoSeguro('/reservations')).toBe('/reservations');
  });

  it('conserva una ruta interna con cadena de consulta', () => {
    expect(destinoSeguro('/checkout?viaje=abc')).toBe('/checkout?viaje=abc');
  });

  it('descarta una direccion absoluta a otro dominio', () => {
    expect(destinoSeguro('https://sitio-falso.example/robar')).toBe('/');
  });

  it('descarta la forma sin esquema, que el navegador lee como otro dominio', () => {
    expect(destinoSeguro('//sitio-falso.example/robar')).toBe('/');
  });

  it('descarta la variante con barra invertida', () => {
    expect(destinoSeguro('/\\sitio-falso.example')).toBe('/');
  });

  it('descarta el esquema javascript, que ejecutaria en nuestro origen', () => {
    expect(destinoSeguro('javascript:alert(1)')).toBe('/');
  });

  it('descarta el esquema data', () => {
    expect(destinoSeguro('data:text/html,<script>alert(1)</script>')).toBe('/');
  });

  it('devuelve la portada cuando no llega destino', () => {
    expect(destinoSeguro(null)).toBe('/');
    expect(destinoSeguro('')).toBe('/');
    expect(destinoSeguro(undefined)).toBe('/');
  });
});
