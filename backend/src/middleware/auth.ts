import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService';
import { getSession } from '../config/redis';
import { generateDeviceFingerprint } from '../utils/crypto';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
    deviceId: string;
  };
}

/**
 * Middleware para verificar autenticación JWT
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ success: false, message: 'Token no proporcionado' });
      return;
    }

    const payload = verifyToken(token);
    
    if (!payload) {
      res.status(401).json({ success: false, message: 'Token inválido o expirado' });
      return;
    }

    // Verificar sesión en Redis
    const ip = (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');
    const userAgent = req.headers['user-agent'] || '';
    const deviceId = generateDeviceFingerprint(ip, userAgent);
    
    logger.info(`[AUTH DEBUG] IP: ${ip}, UserAgent: ${userAgent}, DeviceID: ${deviceId}`);
    
    const session = await getSession(`session:${payload.userId}:${deviceId}`);
    
    if (!session) {
      logger.error(`[AUTH DEBUG] Sesión no encontrada: session:${payload.userId}:${deviceId}`);
      res.status(401).json({ success: false, message: 'Sesión inválida o expirada' });
      return;
    }

    // Verificar que el usuario esté activo
    const User = (await import('../models/User')).default;
    const user = await User.findById(payload.userId);
    
    if (!user || user.isActive === false) {
      res.status(403).json({ success: false, message: 'Cuenta bloqueada o inactiva' });
      return;
    }

    // Agregar usuario a la request
    req.user = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      deviceId,
    };

    next();
  } catch (error) {
    logger.error('Error en autenticación:', error);
    res.status(500).json({ success: false, message: 'Error en autenticación' });
  }
};

/**
 * Middleware para verificar rol de admin
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Acceso denegado: se requiere rol de administrador' });
    return;
  }
  next();
};

/**
 * Middleware opcional de autenticación (no bloquea si no hay token)
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        const ip = (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');
        const userAgent = req.headers['user-agent'] || '';
        const deviceId = generateDeviceFingerprint(ip, userAgent);
        
        req.user = {
          userId: payload.userId,
          username: payload.username,
          role: payload.role,
          deviceId,
        };
      }
    }
    
    next();
  } catch (error) {
    logger.error('Error en autenticación opcional:', error);
    next();
  }
};
