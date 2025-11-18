import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import config from '../config';
import logger from '../utils/logger';

/**
 * Configuración de Helmet para seguridad HTTP
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  xssFilter: true,
});

/**
 * Rate Limiting para prevenir DDoS
 */
export const rateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: 'Demasiadas solicitudes desde esta IP, por favor intenta de nuevo más tarde',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');
    logger.warn(`Rate limit excedido para IP: ${ip}`);
    res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes, por favor intenta más tarde',
    });
  },
});

/**
 * Rate Limiting estricto para autenticación
 * NOTA: Límites aumentados para testing (cambiar a 5/15min en producción)
 */
export const authRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto (era 15 minutos)
  max: 100, // 100 intentos (era 5)
  message: 'Demasiados intentos de login, intenta de nuevo más tarde',
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    const ip = (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');
    logger.warn(`Rate limit de autenticación excedido para IP: ${ip}`);
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de login, intenta de nuevo más tarde',
    });
  },
});

/**
 * Middleware para validar y sanitizar IP
 */
export const sanitizeIp = (req: Request, _res: Response, next: NextFunction): void => {
  let ip = req.ip || req.socket.remoteAddress || '';
  
  // Remover prefijo IPv6
  if (ip.includes('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  
  // Validar formato de IP
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
    ip = '0.0.0.0';
  }
  
  // Asignar IP usando Object.defineProperty para evitar error de solo lectura
  Object.defineProperty(req, 'ip', {
    value: ip,
    writable: true,
    configurable: true,
  });
  
  next();
};

/**
 * Middleware para logging de requests
 */
export const requestLogger = (req: Request, _res: Response, next: NextFunction): void => {
  const ip = (req.ip || '').replace('::ffff:', '');
  const method = req.method;
  const url = req.originalUrl;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  logger.info(`${method} ${url}`, {
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
  });
  
  next();
};

/**
 * Middleware de manejo de errores
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const ip = (req.ip || '').replace('::ffff:', '');
  
  logger.error('Error en request:', {
    error: err.message,
    stack: err.stack,
    ip,
    method: req.method,
    url: req.originalUrl,
  });

  // No exponer detalles del error en producción
  const message = config.env === 'development' ? err.message : 'Error interno del servidor';
  
  res.status(err.status || 500).json({
    success: false,
    message,
    ...(config.env === 'development' && { stack: err.stack }),
  });
};

/**
 * Middleware para validar Content-Type
 */
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'];
    
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        res.status(415).json({
          success: false,
          message: 'Tipo de contenido no soportado',
        });
        return;
      }
    }
    
    next();
  };
};
