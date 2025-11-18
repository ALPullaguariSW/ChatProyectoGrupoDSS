import express from 'express';
import * as roomController from '../controllers/roomController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { createRoomSchema } from '../utils/validators';
import Joi from 'joi';

const router = express.Router();

// Schema para verificar PIN
const verifyPinSchema = Joi.object({
  pin: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
});

/**
 * @route   POST /api/rooms
 * @desc    Crear nueva sala
 * @access  Private (Admin)
 */
router.post('/', authenticate, validate(createRoomSchema), roomController.createRoom);

/**
 * @route   POST /api/rooms/verify-pin
 * @desc    Verificar PIN de sala
 * @access  Public
 */
router.post('/verify-pin', validate(verifyPinSchema), roomController.verifyPin);

/**
 * @route   GET /api/rooms/:roomId
 * @desc    Obtener detalles de sala
 * @access  Public
 */
router.get('/:roomId', roomController.getRoomDetails);

/**
 * @route   GET /api/rooms/:roomId/messages
 * @desc    Obtener mensajes de sala
 * @access  Public
 */
router.get('/:roomId/messages', roomController.getRoomMessages);

/**
 * @route   DELETE /api/rooms/:roomId
 * @desc    Eliminar sala
 * @access  Private (Creator or Admin)
 */
router.delete('/:roomId', authenticate, roomController.deleteRoom);

/**
 * @route   GET /api/rooms/user/my-rooms
 * @desc    Obtener salas del usuario
 * @access  Private
 */
router.get('/user/my-rooms', authenticate, roomController.getUserRooms);

export default router;
