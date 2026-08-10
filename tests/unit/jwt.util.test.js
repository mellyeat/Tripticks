'use strict';

const jwt = require('jsonwebtoken');
const jwtUtil = require('../../src/utils/jwt.util');
const ApiError = require('../../src/utils/apiError');

const USUARIO = { id: 'e7c1a9f0-0000-4000-8000-000000000001', rol: 'usuario' };

describe('jwt.util', () => {
  describe('firmar', () => {
    it('incluye el id y el rol en el payload', () => {
      const payload = jwtUtil.verificar(jwtUtil.firmar(USUARIO));

      expect(payload.sub).toBe(USUARIO.id);
      expect(payload.rol).toBe('usuario');
    });

    it('no expone datos sensibles del usuario', () => {
      const payload = jwtUtil.verificar(
        jwtUtil.firmar({ ...USUARIO, email: 'ana@ejemplo.com', password_hash: '$2b$10$abc' })
      );

      expect(payload).not.toHaveProperty('email');
      expect(payload).not.toHaveProperty('password_hash');
    });

    it('asigna una fecha de expiracion', () => {
      const payload = jwtUtil.verificar(jwtUtil.firmar(USUARIO));

      expect(payload.exp).toBeGreaterThan(payload.iat);
    });
  });

  describe('verificar', () => {
    it('rechaza un token manipulado', () => {
      const token = jwtUtil.firmar(USUARIO);
      const manipulado = `${token}x`;

      expect(() => jwtUtil.verificar(manipulado)).toThrow(ApiError);
    });

    it('rechaza un token firmado con otro secreto', () => {
      const ajeno = jwt.sign({ sub: USUARIO.id, rol: 'administrador' }, 'otro-secreto');

      expect(() => jwtUtil.verificar(ajeno)).toThrow(ApiError);
    });

    it('avisa cuando el token expiro', () => {
      const expirado = jwt.sign({ sub: USUARIO.id, rol: 'usuario' }, process.env.JWT_SECRET, {
        expiresIn: '-1s',
      });

      expect(() => jwtUtil.verificar(expirado)).toThrow(/expiro/i);
    });

    it('responde 401 ante cualquier token invalido', () => {
      try {
        jwtUtil.verificar('no-es-un-token');
        throw new Error('Se esperaba que lanzara');
      } catch (error) {
        expect(error.estado).toBe(401);
      }
    });
  });

  describe('extraerDelEncabezado', () => {
    it('extrae el token de un encabezado Bearer', () => {
      expect(jwtUtil.extraerDelEncabezado('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    });

    it('devuelve null cuando el encabezado falta o tiene otro esquema', () => {
      expect(jwtUtil.extraerDelEncabezado(undefined)).toBeNull();
      expect(jwtUtil.extraerDelEncabezado('')).toBeNull();
      expect(jwtUtil.extraerDelEncabezado('Basic abc')).toBeNull();
      expect(jwtUtil.extraerDelEncabezado('Bearer')).toBeNull();
    });
  });
});
