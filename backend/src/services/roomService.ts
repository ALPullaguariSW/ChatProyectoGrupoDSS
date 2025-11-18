import Room, { IRoom, IRoomUser } from '../models/Room';
import { generateRoomPin, generateEphemeralKey } from '../utils/crypto';
import { auditLog } from '../utils/logger';
import logger from '../utils/logger';
import bcrypt from 'bcryptjs';

/**
 * Crear nueva sala
 */
export const createRoom = async (
  name: string,
  type: 'text' | 'multimedia',
  limit: number,
  creatorId: string,
  creatorNickname: string,
  ip: string,
  customPin?: string
): Promise<{ success: boolean; room?: IRoom; message?: string }> => {
  try {
    // Generar o validar PIN
    let pin = customPin || generateRoomPin();
    let attempts = 0;
    
    while (await Room.findOne({ pin }) && attempts < 100) {
      pin = generateRoomPin();
      attempts++;
    }

    if (attempts >= 100) {
      return { success: false, message: 'No se pudo generar un PIN único' };
    }

    // Hash del PIN para almacenamiento seguro
    const hashedPin = await bcrypt.hash(pin, 10);

    // Generar clave efímera para la sala
    const ephemeralKey = generateEphemeralKey();

    // Crear sala
    const room = new Room({
      pin: hashedPin,
      name,
      type,
      limit,
      creatorId,
      creatorNickname,
      users: [],
      ephemeralKey,
      isActive: true,
    });

    await room.save();

    auditLog('ROOM_CREATED', creatorId, ip, {
      roomId: room._id,
      roomName: name,
      type,
      limit,
    });

    logger.info(`Sala creada: ${name} (PIN: ${pin})`);

    // Retornar el PIN sin hash para mostrarlo al creador
    return {
      success: true,
      room: {
        ...room.toObject(),
        pin, // PIN original sin hash
      } as any,
    };
  } catch (error) {
    logger.error('Error creando sala:', error);
    return { success: false, message: 'Error creando la sala' };
  }
};

/**
 * Verificar PIN de sala
 */
export const verifyRoomPin = async (pin: string): Promise<IRoom | null> => {
  try {
    const rooms = await Room.find({ isActive: true });
    
    for (const room of rooms) {
      const isValid = await bcrypt.compare(pin, room.pin);
      if (isValid) {
        return room;
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Error verificando PIN:', error);
    return null;
  }
};

/**
 * Unirse a sala
 */
export const joinRoom = async (
  pin: string,
  userId: string,
  nickname: string,
  ip: string,
  deviceId: string
): Promise<{ success: boolean; room?: IRoom; message?: string }> => {
  try {
    const room = await verifyRoomPin(pin);
    
    if (!room) {
      return { success: false, message: 'PIN inválido' };
    }

    // Verificar límite de usuarios
    if (room.users.length >= room.limit) {
      return { success: false, message: 'La sala está llena' };
    }

    // Verificar si el usuario ya está en la sala
    const existingUser = room.users.find(u => u.deviceId === deviceId);
    if (existingUser) {
      return { success: false, message: 'Ya estás en esta sala' };
    }

    // Verificar si el usuario está en otra sala (una sala por dispositivo)
    const otherRoom = await Room.findOne({
      isActive: true,
      'users.deviceId': deviceId,
      _id: { $ne: room._id },
    });

    if (otherRoom) {
      return { success: false, message: 'Solo puedes estar en una sala a la vez' };
    }

    // Agregar usuario a la sala
    const newUser: IRoomUser = {
      userId,
      nickname,
      ip,
      deviceId,
      joinedAt: new Date(),
    };

    room.users.push(newUser);
    await room.save();

    auditLog('ROOM_JOINED', userId, ip, {
      roomId: room._id,
      roomName: room.name,
      nickname,
    });

    return { success: true, room };
  } catch (error) {
    logger.error('Error uniéndose a sala:', error);
    return { success: false, message: 'Error uniéndose a la sala' };
  }
};

/**
 * Salir de sala
 */
export const leaveRoom = async (
  roomId: string,
  deviceId: string,
  ip: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const room = await Room.findById(roomId);
    
    if (!room) {
      return { success: false, message: 'Sala no encontrada' };
    }

    const userIndex = room.users.findIndex(u => u.deviceId === deviceId);
    
    if (userIndex === -1) {
      return { success: false, message: 'Usuario no está en la sala' };
    }

    const user = room.users[userIndex];
    room.users.splice(userIndex, 1);
    await room.save();

    auditLog('ROOM_LEFT', user.userId, ip, {
      roomId: room._id,
      roomName: room.name,
      nickname: user.nickname,
    });

    return { success: true };
  } catch (error) {
    logger.error('Error saliendo de sala:', error);
    return { success: false, message: 'Error saliendo de la sala' };
  }
};

/**
 * Eliminar sala (solo creador)
 */
export const deleteRoom = async (
  roomId: string,
  userId: string,
  ip: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const room = await Room.findById(roomId);
    
    if (!room) {
      return { success: false, message: 'Sala no encontrada' };
    }

    if (room.creatorId !== userId) {
      return { success: false, message: 'Solo el creador puede eliminar la sala' };
    }

    room.isActive = false;
    await room.save();

    auditLog('ROOM_DELETED', userId, ip, {
      roomId: room._id,
      roomName: room.name,
    });

    return { success: true };
  } catch (error) {
    logger.error('Error eliminando sala:', error);
    return { success: false, message: 'Error eliminando la sala' };
  }
};

/**
 * Obtener sala por ID
 */
export const getRoomById = async (roomId: string): Promise<IRoom | null> => {
  try {
    return await Room.findById(roomId);
  } catch (error) {
    logger.error('Error obteniendo sala:', error);
    return null;
  }
};

/**
 * Obtener salas activas del usuario
 */
export const getUserRooms = async (deviceId: string): Promise<IRoom[]> => {
  try {
    return await Room.find({
      isActive: true,
      'users.deviceId': deviceId,
    });
  } catch (error) {
    logger.error('Error obteniendo salas del usuario:', error);
    return [];
  }
};

/**
 * Limpiar salas inactivas
 */
export const cleanupInactiveRooms = async (): Promise<void> => {
  try {
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas
    
    await Room.updateMany(
      {
        isActive: true,
        users: { $size: 0 },
        updatedAt: { $lt: threshold },
      },
      {
        isActive: false,
      }
    );

    logger.info('Salas inactivas limpiadas');
  } catch (error) {
    logger.error('Error limpiando salas:', error);
  }
};
