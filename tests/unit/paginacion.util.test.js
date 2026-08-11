'use strict';

const paginacion = require('../../src/utils/paginacion.util');

describe('paginacion.util', () => {
  describe('normalizar', () => {
    it('aplica los valores por defecto cuando no llega nada', () => {
      expect(paginacion.normalizar()).toEqual({ pagina: 1, limite: 9 });
    });

    it('convierte los valores de texto de la cadena de consulta', () => {
      expect(paginacion.normalizar({ pagina: '3', limite: '20' })).toEqual({
        pagina: 3,
        limite: 20,
      });
    });

    it('recorta el limite al maximo permitido', () => {
      expect(paginacion.normalizar({ limite: '500' }).limite).toBe(50);
    });

    it('ignora una pagina menor a uno', () => {
      expect(paginacion.normalizar({ pagina: '0' }).pagina).toBe(1);
      expect(paginacion.normalizar({ pagina: '-4' }).pagina).toBe(1);
    });

    it('ignora un valor que no es numero', () => {
      expect(paginacion.normalizar({ pagina: 'abc', limite: 'xyz' })).toEqual({
        pagina: 1,
        limite: 9,
      });
    });
  });

  describe('rango', () => {
    it('calcula un rango inclusivo desde la primera pagina', () => {
      expect(paginacion.rango({ pagina: 1, limite: 9 })).toEqual({ desde: 0, hasta: 8 });
    });

    it('desplaza el rango en las paginas siguientes', () => {
      expect(paginacion.rango({ pagina: 3, limite: 10 })).toEqual({ desde: 20, hasta: 29 });
    });
  });

  describe('resumen', () => {
    it('calcula el total de paginas redondeando hacia arriba', () => {
      expect(paginacion.resumen({ pagina: 1, limite: 9, total: 20 }).paginas).toBe(3);
    });

    it('devuelve una pagina cuando no hay resultados', () => {
      expect(paginacion.resumen({ pagina: 1, limite: 9, total: 0 })).toEqual({
        pagina: 1,
        limite: 9,
        total: 0,
        paginas: 1,
      });
    });

    it('trata un total ausente como cero', () => {
      expect(paginacion.resumen({ pagina: 1, limite: 9, total: null }).total).toBe(0);
    });
  });
});
