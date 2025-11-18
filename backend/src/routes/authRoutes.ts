import express from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { authRateLimiter } from '../middleware/security';
import { loginSchema } from '../utils/validators';
import { detectSQLInjection, detectNoSQLInjection, detectXSS } from '../utils/validation';
import Joi from 'joi';

const router = express.Router();

// Schema para refresh token
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// Schema para 2FA
const verify2FASchema = Joi.object({
  token: Joi.string().length(6).required(),
});

// Custom validator para inyecciones
const noInjection = (value: string, helpers: Joi.CustomHelpers) => {
  if (detectSQLInjection(value)) {
    return helpers.error('any.invalid', { message: 'Entrada contiene patrón de inyección SQL' });
  }
  if (detectNoSQLInjection(value)) {
    return helpers.error('any.invalid', { message: 'Entrada contiene patrón de inyección NoSQL' });
  }
  if (detectXSS(value)) {
    return helpers.error('any.invalid', { message: 'Entrada contiene código potencialmente peligroso' });
  }
  return value;
};

// Schema para registro
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).custom(noInjection).required(),
  email: Joi.string().email().custom(noInjection).required(),
  password: Joi.string().min(8).required(),
});

/**
 * @route   POST /api/auth/register
 * @desc    Registro de nuevo usuario
 * @access  Public
 */
router.post('/register', authRateLimiter, validate(registerSchema), authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuario
 * @access  Public
 */
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout de usuario
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refrescar access token
 * @access  Public
 */
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtener perfil del usuario
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   POST /api/auth/2fa/enable
 * @desc    Habilitar 2FA
 * @access  Private
 */
router.post('/2fa/enable', authenticate, authController.enable2FA);

/**
 * @route   POST /api/auth/2fa/verify
 * @desc    Verificar y activar 2FA
 * @access  Private
 */
router.post('/2fa/verify', authenticate, validate(verify2FASchema), authController.verify2FA);

/**
 * @route   POST /api/auth/2fa/disable
 * @desc    Deshabilitar 2FA
 * @access  Private
 */
router.post('/2fa/disable', authenticate, authController.disable2FA);

export default router;
