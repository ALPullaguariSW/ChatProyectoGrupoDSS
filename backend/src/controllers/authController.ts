import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as authService from '../services/authService';

import logger from '../utils/logger';

/**
 * Registro de nuevo usuario
 */
export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;
    const ip = (req.ip || '').replace('::ffff:', '');
    const userAgent = req.headers['user-agent'] || '';

    const result = await authService.register(username, email, password, ip, userAgent);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error en controller register:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

/**
 * Login de usuario
 */
export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password, twoFactorCode } = req.body;
    const ip = (req.ip || '').replace('::ffff:', '');
    const userAgent = req.headers['user-agent'] || '';

    const result = await authService.login(username, password, ip, userAgent, twoFactorCode);

    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    logger.error('Error en controller login:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

/**
 * Logout de usuario
 */
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    const ip = (req.ip || '').replace('::ffff:', '');
    await authService.logout(req.user.userId, req.user.deviceId, ip);

    res.json({ success: true, message: 'Logout exitoso' });
  } catch (error) {
    logger.error('Error en logout:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

/**
 * Refrescar token de acceso
 */
export const refreshToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ success: false, message: 'Refresh token requerido' });
      return;
    }

    const result = await authService.refreshAccessToken(refreshToken);

    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    logger.error('Error refrescando token:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

/**
 * Habilitar 2FA
 */
export const enable2FA = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    const result = await authService.enable2FA(req.user.userId);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Error habilitando 2FA:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

/**
 * Verificar y activar 2FA
 */
export const verify2FA = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    const { token } = req.body;
    const ip = (req.ip || '').replace('::ffff:', '');

    const isValid = await authService.verify2FA(req.user.userId, token, ip);

    if (isValid) {
      res.json({ success: true, message: '2FA activado exitosamente' });
    } else {
      res.status(400).json({ success: false, message: 'Código inválido' });
    }
  } catch (error) {
    logger.error('Error verificando 2FA:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

/**
 * Deshabilitar 2FA
 */
export const disable2FA = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    const ip = (req.ip || '').replace('::ffff:', '');
    await authService.disable2FA(req.user.userId, ip);

    res.json({ success: true, message: '2FA deshabilitado' });
  } catch (error) {
    logger.error('Error deshabilitando 2FA:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

/**
 * Obtener perfil del usuario actual
 */
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    res.json({
      success: true,
      user: {
        userId: req.user.userId,
        username: req.user.username,
        role: req.user.role,
      },
    });
  } catch (error) {
    logger.error('Error obteniendo perfil:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};
