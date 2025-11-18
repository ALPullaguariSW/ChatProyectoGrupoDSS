import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as roomService from '../services/roomService';
import Message from '../models/Message';
import logger from '../utils/logger';

/**
 * Crear nueva sala
 */
export const createRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    const { name, nickname, type, limit, pin } = req.body;
    const ip = (req.ip || '').replace('::ffff:', '');

    const result = await roomService.createRoom(
      name,
      type,
      limit,
      req.user.userId,
      nickname,
      ip,
      pin
    );

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error creando sala:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

/**
 * Verificar PIN de sala
 */
export const verifyPin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pin } = req.body;

    const room = await roomService.verifyRoomPin(pin);

    if (room) {
      res.json({
        success: true,
        room: {
          id: room._id,
          name: room.name,
          type: room.type,
          limit: room.limit,
          currentUsers: room.users.length,
        },
      });
    } else {
      res.status(404).json({ success: false, message: 'PIN inválido' });
    }
  } catch (error) {
    logger.error('Error verificando PIN:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

/**
 * Obtener detalles de sala
 */
export const getRoomDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    const room = await roomService.getRoomById(roomId);

    if (!room) {
      res.status(404).json({ success: false, message: 'Sala no encontrada' });
      return;
    }

    res.json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        type: room.type,
        limit: room.limit,
        users: room.users.map(u => ({
          nickname: u.nickname,
          joinedAt: u.joinedAt,
        })),
        creatorNickname: room.creatorNickname,
      },
    });
  } catch (error) {
    logger.error('Error obteniendo detalles de sala:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

/**
 * Obtener mensajes de sala
 */
export const getRoomMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;

    const query: any = { roomId, deleted: false };
    
    if (before) {
      query.timestamp = { $lt: new Date(before as string) };
    }

    const messages = await Message
      .find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      messages: messages.reverse(),
    });
  } catch (error) {
    logger.error('Error obteniendo mensajes:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

/**
 * Eliminar sala (solo creador o admin)
 */
export const deleteRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    const { roomId } = req.params;
    const ip = (req.ip || '').replace('::ffff:', '');

    const result = await roomService.deleteRoom(roomId, req.user.userId, ip);

    if (result.success) {
      res.json(result);
    } else {
      res.status(403).json(result);
    }
  } catch (error) {
    logger.error('Error eliminando sala:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

/**
 * Obtener salas del usuario
 */
export const getUserRooms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    const rooms = await roomService.getUserRooms(req.user.deviceId);

    res.json({
      success: true,
      rooms: rooms.map(r => ({
        id: r._id,
        name: r.name,
        type: r.type,
        users: r.users.length,
        limit: r.limit,
      })),
    });
  } catch (error) {
    logger.error('Error obteniendo salas del usuario:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};
