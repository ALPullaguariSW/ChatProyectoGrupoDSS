import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para validar y sanitizar inputs críticos
 */

/**
 * Detectar patrones de SQL Injection
 */
export const detectSQLInjection = (input: string): boolean => {
  const sqlPatterns = [
    /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b|\bEXEC\b|\bEXECUTE\b)/gi,
    /(\bUNION\b.*\bSELECT\b)/gi,
    /(--|;|\/\*|\*\/)/g,
    /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s+\d+\s*=\s*\d+)/gi,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

/**
 * Detectar patrones de NoSQL Injection
 */
export const detectNoSQLInjection = (input: string): boolean => {
  const nosqlPatterns = [
    /\$where/gi,
    /\$ne/gi,
    /\$gt/gi,
    /\$lt/gi,
    /\$regex/gi,
    /\$or/gi,
    /\$and/gi,
  ];
  
  return nosqlPatterns.some(pattern => pattern.test(input));
};

/**
 * Detectar patrones de XSS
 */
export const detectXSS = (input: string): boolean => {
  const xssPatterns = [
    /<script\b[^>]*>.*?<\/script>/gi,
    /<iframe\b[^>]*>.*?<\/iframe>/gi,
    /<object\b[^>]*>.*?<\/object>/gi,
    /<embed\b[^>]*>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+onerror/gi,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
};

/**
 * Validar nickname
 */
export const validateNickname = (nickname: string): { valid: boolean; error?: string } => {
  if (!nickname || typeof nickname !== 'string') {
    return { valid: false, error: 'Nickname es requerido' };
  }

  const trimmed = nickname.trim();
  
  // Detectar inyecciones
  if (detectSQLInjection(trimmed)) {
    return { valid: false, error: 'Nickname contiene patrón de inyección SQL' };
  }
  
  if (detectNoSQLInjection(trimmed)) {
    return { valid: false, error: 'Nickname contiene patrón de inyección NoSQL' };
  }
  
  if (detectXSS(trimmed)) {
    return { valid: false, error: 'Nickname contiene código potencialmente peligroso' };
  }
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Nickname debe tener al menos 3 caracteres' };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, error: 'Nickname no puede exceder 20 caracteres' };
  }
  
  // Solo alfanuméricos, espacios, guiones y underscores
  const nicknameRegex = /^[a-zA-Z0-9 _-]+$/;
  if (!nicknameRegex.test(trimmed)) {
    return { valid: false, error: 'Nickname solo puede contener letras, números, espacios, guiones y guiones bajos' };
  }
  
  return { valid: true };
};

/**
 * Validar PIN de sala
 */
export const validateRoomPin = (pin: string): { valid: boolean; error?: string } => {
  if (!pin || typeof pin !== 'string') {
    return { valid: false, error: 'PIN es requerido' };
  }
  
  const trimmed = pin.trim();
  
  if (trimmed.length !== 6) {
    return { valid: false, error: 'PIN debe ser de 6 dígitos' };
  }
  
  if (!/^\d{6}$/.test(trimmed)) {
    return { valid: false, error: 'PIN solo puede contener dígitos' };
  }
  
  return { valid: true };
};

/**
 * Validar contenido de mensaje
 */
export const validateMessage = (content: string): { valid: boolean; error?: string; sanitized?: string } => {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Mensaje no puede estar vacío' };
  }
  
  const trimmed = content.trim();
  
  // Detectar inyecciones
  if (detectSQLInjection(trimmed)) {
    return { valid: false, error: 'Mensaje contiene patrón de inyección SQL' };
  }
  
  if (detectNoSQLInjection(trimmed)) {
    return { valid: false, error: 'Mensaje contiene patrón de inyección NoSQL' };
  }
  
  if (detectXSS(trimmed)) {
    return { valid: false, error: 'Mensaje contiene código potencialmente peligroso' };
  }
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Mensaje no puede estar vacío' };
  }
  
  if (trimmed.length > 5000) {
    return { valid: false, error: 'Mensaje no puede exceder 5000 caracteres' };
  }
  
  // Sanitizar HTML/Script tags para prevenir XSS
  const sanitized = trimmed
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
  
  return { valid: true, sanitized };
};

/**
 * Validar nombre de sala
 */
export const validateRoomName = (name: string): { valid: boolean; error?: string } => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Nombre de sala es requerido' };
  }
  
  const trimmed = name.trim();
  
  // Detectar inyecciones
  if (detectSQLInjection(trimmed)) {
    return { valid: false, error: 'Nombre contiene patrón de inyección SQL' };
  }
  
  if (detectNoSQLInjection(trimmed)) {
    return { valid: false, error: 'Nombre contiene patrón de inyección NoSQL' };
  }
  
  if (detectXSS(trimmed)) {
    return { valid: false, error: 'Nombre contiene código potencialmente peligroso' };
  }
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Nombre de sala debe tener al menos 3 caracteres' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'Nombre de sala no puede exceder 50 caracteres' };
  }
  
  return { valid: true };
};

/**
 * Validar límite de usuarios
 */
export const validateUserLimit = (limit: number): { valid: boolean; error?: string } => {
  if (typeof limit !== 'number' || isNaN(limit)) {
    return { valid: false, error: 'Límite debe ser un número' };
  }
  
  if (limit < 2) {
    return { valid: false, error: 'Límite mínimo es 2 usuarios' };
  }
  
  if (limit > 50) {
    return { valid: false, error: 'Límite máximo es 50 usuarios' };
  }
  
  return { valid: true };
};

/**
 * Validar tipo de sala
 */
export const validateRoomType = (type: string): { valid: boolean; error?: string } => {
  if (!type || typeof type !== 'string') {
    return { valid: false, error: 'Tipo de sala es requerido' };
  }
  
  if (!['text', 'multimedia'].includes(type)) {
    return { valid: false, error: 'Tipo de sala debe ser "text" o "multimedia"' };
  }
  
  return { valid: true };
};

/**
 * Middleware para proteger contra ataques de fuerza bruta en login
 */
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

export const bruteForceProtection = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || '0.0.0.0';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutos
  const maxAttempts = 5;
  
  const attempts = loginAttempts.get(ip);
  
  if (!attempts) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    next();
    return;
  }
  
  // Resetear si pasó la ventana de tiempo
  if (now - attempts.firstAttempt > windowMs) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    next();
    return;
  }
  
  // Incrementar intentos
  attempts.count++;
  
  if (attempts.count > maxAttempts) {
    const remainingTime = Math.ceil((windowMs - (now - attempts.firstAttempt)) / 1000 / 60);
    res.status(429).json({
      success: false,
      message: `Demasiados intentos de login. Intente nuevamente en ${remainingTime} minutos`,
    });
    return;
  }
  
  next();
};

/**
 * Resetear contador de intentos de login al éxito
 */
export const resetLoginAttempts = (ip: string): void => {
  loginAttempts.delete(ip);
};

/**
 * Validar formato de email
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email es requerido' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Email inválido' };
  }
  
  return { valid: true };
};

/**
 * Validar fortaleza de contraseña
 */
export const validatePassword = (password: string): { valid: boolean; error?: string; strength?: string } => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Contraseña es requerida' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Contraseña debe tener al menos 8 caracteres' };
  }
  
  // Verificar complejidad
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const score = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
  
  if (score < 3) {
    return {
      valid: false,
      error: 'Contraseña debe contener al menos 3 de: mayúsculas, minúsculas, números, caracteres especiales',
    };
  }
  
  const strength = score === 4 ? 'fuerte' : score === 3 ? 'media' : 'débil';
  
  return { valid: true, strength };
};

/**
 * Sanitizar texto para prevenir NoSQL Injection
 */
export const sanitizeMongoQuery = (query: any): any => {
  if (typeof query !== 'object' || query === null) {
    return query;
  }
  
  const sanitized: any = Array.isArray(query) ? [] : {};
  
  for (const key in query) {
    // Remover operadores MongoDB peligrosos
    if (key.startsWith('$')) {
      continue;
    }
    
    const value = query[key];
    
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMongoQuery(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Middleware para validar tamaño de payload
 */
export const validatePayloadSize = (maxSizeKB: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength && parseInt(contentLength) > maxSizeKB * 1024) {
      res.status(413).json({
        success: false,
        message: `Payload demasiado grande. Máximo ${maxSizeKB}KB permitido`,
      });
      return;
    }
    
    next();
  };
};

export default {
  validateNickname,
  validateRoomPin,
  validateMessage,
  validateRoomName,
  validateUserLimit,
  validateRoomType,
  validateEmail,
  validatePassword,
  sanitizeMongoQuery,
  bruteForceProtection,
  resetLoginAttempts,
  validatePayloadSize,
};
