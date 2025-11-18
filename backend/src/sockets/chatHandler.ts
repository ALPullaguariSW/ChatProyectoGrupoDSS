import { Server, Socket } from 'socket.io';
import { verifyToken } from '../services/authService';
import * as roomService from '../services/roomService';
import Message from '../models/Message';
import { generateHash, generateDeviceFingerprint } from '../utils/crypto';
import { sanitizeMessage, sanitizeNickname } from '../utils/validators';
import { auditLog } from '../utils/logger';
import logger from '../utils/logger';

interface SocketData {
  userId?: string;
  username?: string;
  nickname?: string;
  roomId?: string;
  deviceId?: string;
  ip?: string;
}

/**
 * Configurar Socket.IO handlers
 */
export const setupSocketHandlers = (io: Server): void => {
  // Middleware de autenticación para sockets (REQUERIDO)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const ip = (socket.handshake.address || '').replace('::ffff:', '');
      const userAgent = socket.handshake.headers['user-agent'] || '';
      
      socket.data.ip = ip;
      socket.data.deviceId = generateDeviceFingerprint(ip, userAgent);

      // Token es OBLIGATORIO (requisito OWASP)
      if (!token) {
        logger.warn(`Intento de conexión socket sin token desde IP: ${ip}`);
        return next(new Error('Authentication required'));
      }

      const payload = verifyToken(token);
      if (!payload) {
        logger.warn(`Token inválido en socket desde IP: ${ip}`);
        return next(new Error('Invalid token'));
      }

      socket.data.userId = payload.userId;
      socket.data.username = payload.username;

      next();
    } catch (error) {
      logger.error('Error en middleware de socket:', error);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const socketData = socket.data as SocketData;
    logger.info(`Socket conectado: ${socket.id} (IP: ${socketData.ip})`);

    /**
     * Unirse a una sala
     */
    socket.on('join_room', async (data: { pin: string; nickname: string }) => {
      try {
        const { pin, nickname } = data;
        const sanitizedNickname = sanitizeNickname(nickname);

        if (!sanitizedNickname || !pin) {
          socket.emit('error', { message: 'PIN y nickname requeridos' });
          return;
        }

        // Usuario siempre autenticado (validado en middleware)
        const userId = socketData.userId!;
        
        // Usar userId como deviceId único
        const uniqueDeviceId = `auth_${socketData.userId}`;

        const result = await roomService.joinRoom(
          pin,
          userId,
          sanitizedNickname,
          socketData.ip!,
          uniqueDeviceId
        );

        if (!result.success || !result.room) {
          socket.emit('error', { message: result.message });
          return;
        }

        // Unirse a la sala de Socket.IO
        socket.join(result.room._id.toString());
        socketData.roomId = result.room._id.toString();
        socketData.nickname = sanitizedNickname;
        socketData.userId = userId;

        // Obtener mensajes históricos
        const messages = await Message.find({
          roomId: result.room._id,
          deleted: false,
        })
          .sort({ timestamp: -1 })
          .limit(50);

        // Emitir éxito al usuario
        socket.emit('join_room_success', {
          room: {
            id: result.room._id,
            name: result.room.name,
            type: result.room.type,
            ephemeralKey: result.room.ephemeralKey,
            users: result.room.users.map(u => ({
              nickname: u.nickname,
              joinedAt: u.joinedAt,
            })),
          },
          messages: messages.reverse(),
        });

        // Notificar a todos en la sala
        io.to(result.room._id.toString()).emit('user_joined', {
          nickname: sanitizedNickname,
          users: result.room.users.map(u => ({
            nickname: u.nickname,
            joinedAt: u.joinedAt,
          })),
        });

        auditLog('SOCKET_JOIN_ROOM', userId, socketData.ip!, {
          roomId: result.room._id,
          nickname: sanitizedNickname,
        });
      } catch (error) {
        logger.error('Error en join_room:', error);
        socket.emit('error', { message: 'Error uniéndose a la sala' });
      }
    });

    /**
     * Enviar mensaje
     */
    socket.on('send_message', async (data: { message: string; encrypted?: boolean }) => {
      try {
        const { message, encrypted = false } = data;
        const { roomId, userId, nickname } = socketData;

        if (!roomId || !userId || !nickname) {
          socket.emit('error', { message: 'No estás en una sala' });
          return;
        }

        const sanitizedMessage = sanitizeMessage(message);

        if (!sanitizedMessage) {
          socket.emit('error', { message: 'Mensaje inválido' });
          return;
        }

        // Crear hash del mensaje para integridad
        const messageHash = generateHash(`${userId}:${sanitizedMessage}:${Date.now()}`);

        // Guardar mensaje en BD
        const newMessage = new Message({
          roomId,
          userId,
          nickname,
          message: sanitizedMessage,
          encrypted,
          messageHash,
          ip: socketData.ip,
          timestamp: new Date(),
        });

        await newMessage.save();

        // Emitir mensaje a todos en la sala
        io.to(roomId).emit('new_message', {
          id: newMessage._id,
          nickname,
          message: sanitizedMessage,
          encrypted,
          timestamp: newMessage.timestamp,
          messageHash,
        });

        auditLog('MESSAGE_SENT', userId, socketData.ip!, {
          roomId,
          messageLength: sanitizedMessage.length,
        });
      } catch (error) {
        logger.error('Error en send_message:', error);
        socket.emit('error', { message: 'Error enviando mensaje' });
      }
    });

    /**
     * Usuario está escribiendo
     */
    socket.on('typing', () => {
      const { roomId, nickname } = socketData;
      if (roomId && nickname) {
        socket.to(roomId).emit('user_typing', { nickname });
      }
    });

    /**
     * Usuario dejó de escribir
     */
    socket.on('stop_typing', () => {
      const { roomId, nickname } = socketData;
      if (roomId && nickname) {
        socket.to(roomId).emit('user_stop_typing', { nickname });
      }
    });

    /**
     * Salir de sala
     */
    socket.on('leave_room', async () => {
      try {
        const { roomId, userId, nickname, deviceId } = socketData;

        if (!roomId || !deviceId) {
          return;
        }

        const result = await roomService.leaveRoom(roomId, deviceId, socketData.ip!);

        if (result.success) {
          socket.leave(roomId);
          
          // Notificar a todos en la sala
          io.to(roomId).emit('user_left', { nickname });

          // Obtener sala actualizada
          const room = await roomService.getRoomById(roomId);
          if (room) {
            io.to(roomId).emit('room_updated', {
              users: room.users.map(u => ({
                nickname: u.nickname,
                joinedAt: u.joinedAt,
              })),
            });
          }

          auditLog('SOCKET_LEAVE_ROOM', userId || 'unknown', socketData.ip!, {
            roomId,
            nickname,
          });

          // Limpiar datos del socket
          socketData.roomId = undefined;
          socketData.nickname = undefined;
        }
      } catch (error) {
        logger.error('Error en leave_room:', error);
      }
    });

    /**
     * Eliminar sala (solo creador)
     */
    socket.on('delete_room', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        const { userId } = socketData;

        if (!userId) {
          socket.emit('error', { message: 'No autenticado' });
          return;
        }

        const result = await roomService.deleteRoom(roomId, userId, socketData.ip!);

        if (result.success) {
          // Notificar a todos en la sala
          io.to(roomId).emit('room_deleted', {
            message: 'La sala ha sido eliminada por el creador',
          });

          // Desconectar a todos
          io.in(roomId).socketsLeave(roomId);

          auditLog('SOCKET_DELETE_ROOM', userId, socketData.ip!, { roomId });
        } else {
          socket.emit('error', { message: result.message });
        }
      } catch (error) {
        logger.error('Error en delete_room:', error);
        socket.emit('error', { message: 'Error eliminando sala' });
      }
    });

    /**
     * Desconexión
     */
    socket.on('disconnect', async () => {
      try {
        const { roomId, userId, nickname, deviceId } = socketData;

        logger.info(`Socket desconectado: ${socket.id}`);

        if (roomId && deviceId) {
          // Salir de la sala automáticamente
          await roomService.leaveRoom(roomId, deviceId, socketData.ip!);
          
          // Notificar a todos
          io.to(roomId).emit('user_left', { nickname });

          // Actualizar lista de usuarios
          const room = await roomService.getRoomById(roomId);
          if (room) {
            io.to(roomId).emit('room_updated', {
              users: room.users.map(u => ({
                nickname: u.nickname,
                joinedAt: u.joinedAt,
              })),
            });
          }

          auditLog('SOCKET_DISCONNECT', userId || 'unknown', socketData.ip!, {
            roomId,
            nickname,
          });
        }
      } catch (error) {
        logger.error('Error en disconnect:', error);
      }
    });
  });

  logger.info('✅ Socket.IO handlers configurados');
};
