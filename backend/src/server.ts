import express, { Application } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config';
import { connectDatabase } from './config/database';
import redisClient from './config/redis';
import logger from './utils/logger';
import { registerAdmin } from './services/authService';
import { cleanupInactiveRooms } from './services/roomService';

// Middleware
import {
  helmetMiddleware,
  rateLimiter,
  sanitizeIp,
  requestLogger,
  errorHandler,
} from './middleware/security';

// Routes
import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import fileRoutes from './routes/fileRoutes';
import adminRoutes from './routes/adminRoutes';

// Socket handlers
import { setupSocketHandlers } from './sockets/chatHandler';

/**
 * Inicializar aplicación Express
 */
const app: Application = express();
const server = http.createServer(app);

/**
 * Configurar Socket.IO con seguridad
 */
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      // Aplicar la misma lógica de CORS que Express
      if (!origin) {
        return callback(null, true);
      }
      if (origin.match(/^https?:\/\/localhost(:\d+)?$/) ||
          origin.match(/^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/)) {
        return callback(null, true);
      }
      const allowedOrigins = Array.isArray(config.cors.origin) ? config.cors.origin : [config.cors.origin];
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

/**
 * CORS dinámico para red local
 */
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Permitir requests sin origin (mobile apps, postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    // Permitir localhost en todos los puertos
    if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
      return callback(null, true);
    }

    // Permitir IPs privadas (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if (origin.match(/^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/)) {
      return callback(null, true);
    }

    // Si hay un dominio configurado, permitirlo
    const allowedOrigins = Array.isArray(config.cors.origin) 
      ? config.cors.origin 
      : [config.cors.origin];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Rechazar otros orígenes
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

/**
 * Middleware global
 */
// Confiar en proxy (Nginx) para obtener IP real del cliente
app.set('trust proxy', 1);

app.use(helmetMiddleware);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(sanitizeIp);
app.use(requestLogger);
app.use(rateLimiter);

/**
 * Health check
 */
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/admin', adminRoutes);

/**
 * Root endpoint
 */
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Secure Chat API - Sistema de chat en tiempo real con salas seguras',
    version: '1.0.0',
    documentation: '/api/docs',
  });
});

/**
 * Error handler (debe ser el último middleware)
 */
app.use(errorHandler);

/**
 * Configurar Socket.IO handlers
 */
setupSocketHandlers(io);

/**
 * Inicializar servidor
 */
const startServer = async (): Promise<void> => {
  try {
    // Conectar a MongoDB
    await connectDatabase();

    // Verificar conexión a Redis
    await redisClient.ping();

    // Registrar admin por defecto
    await registerAdmin();

    // Iniciar limpieza de salas inactivas cada hora
    setInterval(async () => {
      await cleanupInactiveRooms();
    }, 60 * 60 * 1000);

    // Iniciar servidor
    server.listen(config.port, config.host, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║         🔒 SECURE CHAT SERVER - SISTEMA SEGURO 🔒            ║
║                                                               ║
║  Servidor:     http://${config.host}:${config.port}                        ║
║  Entorno:      ${config.env}                                 ║
║  MongoDB:      Conectado ✅                                   ║
║  Redis:        Conectado ✅                                   ║
║  Socket.IO:    Activo ✅                                      ║
║                                                               ║
║  Características de Seguridad:                               ║
║  ├─ Autenticación JWT + 2FA                                  ║
║  ├─ Encriptación AES-256-GCM                                 ║
║  ├─ Rate Limiting & DDoS Protection                          ║
║  ├─ Detección de Esteganografía                             ║
║  ├─ Logs Auditables con Firmas SHA-256                      ║
║  ├─ Sesión Única por Dispositivo                            ║
║  └─ Encriptación End-to-End en Salas                        ║
║                                                               ║
║  Admin por defecto:                                          ║
║  Usuario: ${config.admin.username}                                      ║
║  Password: ${config.admin.password}                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

/**
 * Manejo de señales de terminación
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido. Cerrando servidor...');
  server.close(() => {
    logger.info('Servidor cerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT recibido. Cerrando servidor...');
  server.close(() => {
    logger.info('Servidor cerrado');
    process.exit(0);
  });
});

/**
 * Manejo de errores no capturados
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Iniciar servidor
startServer();

export { app, server, io };
