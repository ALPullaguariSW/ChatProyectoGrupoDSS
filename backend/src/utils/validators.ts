import Joi from 'joi';
import { detectSQLInjection, detectNoSQLInjection, detectXSS } from './validation';

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

// Validación para registro de admin
export const registerAdminSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .required()
    .messages({
      'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
    }),
  email: Joi.string().email().required(),
});

// Validación para login
export const loginSchema = Joi.object({
  username: Joi.string().custom(noInjection).required(),
  password: Joi.string().required(),
  twoFactorCode: Joi.string().length(6).optional(),
});

// Validación para crear sala
export const createRoomSchema = Joi.object({
  name: Joi.string().min(3).max(50).custom(noInjection).required(),
  nickname: Joi.string().min(3).max(20).custom(noInjection).required(),
  type: Joi.string().valid('text', 'multimedia').required(),
  limit: Joi.number().integer().min(2).max(50).required(),
  pin: Joi.string().length(6).pattern(/^[0-9]+$/).optional(),
});

// Validación para unirse a sala
export const joinRoomSchema = Joi.object({
  pin: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
  nickname: Joi.string().min(3).max(20).custom(noInjection).required(),
});

// Validación para enviar mensaje
export const sendMessageSchema = Joi.object({
  roomId: Joi.string().required(),
  message: Joi.string().min(1).max(5000).custom(noInjection).required(),
  encrypted: Joi.boolean().optional(),
});

// Validación para upload de archivo
export const fileUploadSchema = Joi.object({
  roomId: Joi.string().required(),
});

// Validación de IP
export const isValidIp = (ip: string): boolean => {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

// Sanitizar nickname (prevenir XSS)
export const sanitizeNickname = (nickname: string): string => {
  return nickname
    .replace(/[<>'"]/g, '')
    .trim()
    .substring(0, 20);
};

// Sanitizar mensaje (prevenir XSS)
export const sanitizeMessage = (message: string): string => {
  return message
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
    .substring(0, 1000);
};

// Validar formato de archivo
export const isAllowedFileType = (mimetype: string, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(mimetype);
};

// Validar tamaño de archivo
export const isValidFileSize = (size: number, maxSize: number): boolean => {
  return size <= maxSize;
};
