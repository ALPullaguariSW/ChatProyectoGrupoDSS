import winston from 'winston';
import path from 'path';
import fs from 'fs';
import config from '../config';
import crypto from 'crypto';

// Crear directorio de logs si no existe
const logDir = config.logging.filePath;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Formato personalizado para logs auditables con firma digital
const auditFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const logEntry: any = {
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
    };
    
    if (info.userId) logEntry.userId = info.userId;
    if (info.ip) logEntry.ip = info.ip;
    if (info.action) logEntry.action = info.action;
    if (info.metadata) logEntry.metadata = info.metadata;
    
    // Crear firma SHA-256 del log para inmutabilidad
    const logString = JSON.stringify(logEntry);
    const signature = crypto.createHash('sha256').update(logString).digest('hex');
    
    return JSON.stringify({ ...logEntry, signature });
  })
);

// Logger principal
const logger = winston.createLogger({
  level: config.logging.level,
  format: auditFormat,
  transports: [
    // Logs de error
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Logs de auditoría (append-only)
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
    // Logs combinados
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// En desarrollo, también mostrar en consola
if (config.env === 'development') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Función helper para logs de auditoría
export const auditLog = (action: string, userId: string, ip: string, metadata?: any) => {
  logger.info({
    action,
    userId,
    ip,
    metadata,
  });
};

export default logger;
