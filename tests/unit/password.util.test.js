'use strict';

const password = require('../../src/utils/password.util');

describe('password.util', () => {
  describe('hashear', () => {
    it('nunca devuelve la contrasena en texto claro', async () => {
      const hash = await password.hashear('Secreta123');

      expect(hash).not.toBe('Secreta123');
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it('genera hashes distintos para la misma contrasena', async () => {
      const primero = await password.hashear('Secreta123');
      const segundo = await password.hashear('Secreta123');

      expect(primero).not.toBe(segundo);
    });
  });

  describe('verificar', () => {
    it('acepta la contrasena correcta', async () => {
      const hash = await password.hashear('Secreta123');

      await expect(password.verificar('Secreta123', hash)).resolves.toBe(true);
    });

    it('rechaza una contrasena incorrecta', async () => {
      const hash = await password.hashear('Secreta123');

      await expect(password.verificar('Secreta124', hash)).resolves.toBe(false);
    });

    it('distingue mayusculas de minusculas', async () => {
      const hash = await password.hashear('Secreta123');

      await expect(password.verificar('secreta123', hash)).resolves.toBe(false);
    });

    it('devuelve false sin lanzar cuando falta el hash o la contrasena', async () => {
      await expect(password.verificar('Secreta123', null)).resolves.toBe(false);
      await expect(password.verificar('', 'hash')).resolves.toBe(false);
    });
  });
});
