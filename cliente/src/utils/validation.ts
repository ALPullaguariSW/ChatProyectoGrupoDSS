/**
 * ═══════════════════════════════════════════════════════════════════════
 * 🛡️ VALIDATION SERVICE - FRONTEND INPUT VALIDATION & SANITIZATION
 * ═══════════════════════════════════════════════════════════════════════
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: string;
}

/**
 * Escapar HTML para prevenir XSS
 */
export const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
};

/**
 * Detectar patrones de SQL Injection
 */
export const detectSQLInjection = (input: string): boolean => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(UNION\s+SELECT)/gi,
    /(--|\#|\/\*|\*\/)/g,
    /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s+\d+\s*=\s*\d+)/gi,
    /(;|\||&&)/g,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
};

/**
 * Detectar patrones de NoSQL Injection
 */
export const detectNoSQLInjection = (input: string): boolean => {
  const noSqlPatterns = [/\$where/gi, /\$ne/gi, /\$gt/gi, /\$lt/gi, /\$regex/gi, /\{\s*\$.*\}/g];

  return noSqlPatterns.some((pattern) => pattern.test(input));
};

/**
 * Detectar XSS (Cross-Site Scripting)
 */
export const detectXSS = (input: string): boolean => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
    /onerror\s*=/gi,
    /onload\s*=/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
};

/**
 * Validar y sanitizar PIN de sala
 */
export const validatePin = (pin: string): ValidationResult => {
  const errors: string[] = [];

  if (!pin) {
    errors.push('PIN es requerido');
    return { isValid: false, errors };
  }

  // Solo números
  if (!/^\d+$/.test(pin)) {
    errors.push('PIN debe contener solo números');
    return { isValid: false, errors };
  }

  // Exactamente 6 dígitos
  if (pin.length !== 6) {
    errors.push('PIN debe tener exactamente 6 dígitos');
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: pin,
  };
};

/**
 * Validar y sanitizar nickname
 */
export const validateNickname = (nickname: string): ValidationResult => {
  const errors: string[] = [];

  if (!nickname) {
    errors.push('Nickname es requerido');
    return { isValid: false, errors };
  }

  // Detectar inyecciones
  if (detectSQLInjection(nickname)) {
    errors.push('Nickname contiene caracteres no permitidos (SQL)');
    return { isValid: false, errors };
  }

  if (detectXSS(nickname)) {
    errors.push('Nickname contiene caracteres no permitidos (XSS)');
    return { isValid: false, errors };
  }

  // Sanitizar
  const sanitized = nickname
    .replace(/[<>'"]/g, '')
    .replace(/[^\w\s\-áéíóúÁÉÍÓÚñÑ]/g, '')
    .trim();

  if (sanitized.length < 3) {
    errors.push('Nickname debe tener al menos 3 caracteres');
    return { isValid: false, errors };
  }

  if (sanitized.length > 20) {
    errors.push('Nickname no puede exceder 20 caracteres');
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized,
  };
};

/**
 * Validar y sanitizar nombre de sala
 */
export const validateRoomName = (name: string): ValidationResult => {
  const errors: string[] = [];

  if (!name) {
    errors.push('Nombre de sala es requerido');
    return { isValid: false, errors };
  }

  // Detectar inyecciones
  if (detectSQLInjection(name)) {
    errors.push('Nombre contiene caracteres no permitidos (SQL)');
    return { isValid: false, errors };
  }

  if (detectXSS(name)) {
    errors.push('Nombre contiene caracteres no permitidos (XSS)');
    return { isValid: false, errors };
  }

  // Sanitizar
  const sanitized = name
    .replace(/[<>'"]/g, '')
    .replace(/[^\w\s\-áéíóúÁÉÍÓÚñÑ]/g, '')
    .trim();

  if (sanitized.length < 3) {
    errors.push('Nombre debe tener al menos 3 caracteres');
    return { isValid: false, errors };
  }

  if (sanitized.length > 50) {
    errors.push('Nombre no puede exceder 50 caracteres');
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized,
  };
};

/**
 * Validar límite de usuarios en sala
 */
export const validateRoomLimit = (limit: string | number): ValidationResult => {
  const errors: string[] = [];
  const numLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;

  if (isNaN(numLimit)) {
    errors.push('Límite debe ser un número válido');
    return { isValid: false, errors };
  }

  if (numLimit < 2) {
    errors.push('Límite mínimo es 2 usuarios');
    return { isValid: false, errors };
  }

  if (numLimit > 50) {
    errors.push('Límite máximo es 50 usuarios');
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: numLimit.toString(),
  };
};

/**
 * Validar y sanitizar mensaje de chat
 */
export const validateMessage = (message: string): ValidationResult => {
  const errors: string[] = [];

  if (!message) {
    errors.push('Mensaje no puede estar vacío');
    return { isValid: false, errors };
  }

  // Detectar inyecciones
  if (detectXSS(message)) {
    errors.push('Mensaje contiene contenido no permitido (XSS)');
    return { isValid: false, errors };
  }

  // Sanitizar mensaje preservando algunos caracteres especiales
  const sanitized = message
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();

  if (sanitized.length === 0) {
    errors.push('Mensaje no puede estar vacío después de sanitización');
    return { isValid: false, errors };
  }

  if (sanitized.length > 5000) {
    errors.push('Mensaje no puede exceder 5000 caracteres');
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized,
  };
};

/**
 * Validar archivo subido
 */
export const validateFile = (file: File): ValidationResult => {
  const errors: string[] = [];
  const maxSize = 10 * 1024 * 1024; // 10MB

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!file) {
    errors.push('No se seleccionó ningún archivo');
    return { isValid: false, errors };
  }

  // Validar tamaño
  if (file.size > maxSize) {
    errors.push('Archivo excede el tamaño máximo de 10MB');
    return { isValid: false, errors };
  }

  // Validar tipo
  if (!allowedTypes.includes(file.type)) {
    errors.push('Tipo de archivo no permitido');
    return { isValid: false, errors };
  }

  // Validar nombre de archivo
  if (detectXSS(file.name) || detectSQLInjection(file.name)) {
    errors.push('Nombre de archivo contiene caracteres no permitidos');
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
  };
};

/**
 * Validar username para registro/login
 */
export const validateUsername = (username: string): ValidationResult => {
  const errors: string[] = [];

  if (!username) {
    errors.push('Usuario es requerido');
    return { isValid: false, errors };
  }

  // Detectar inyecciones
  if (detectSQLInjection(username)) {
    errors.push('Usuario contiene caracteres no permitidos (SQL)');
    return { isValid: false, errors };
  }

  if (detectNoSQLInjection(username)) {
    errors.push('Usuario contiene caracteres no permitidos (NoSQL)');
    return { isValid: false, errors };
  }

  if (detectXSS(username)) {
    errors.push('Usuario contiene caracteres no permitidos (XSS)');
    return { isValid: false, errors };
  }

  // Sanitizar
  const sanitized = username.replace(/[^a-zA-Z0-9_-]/g, '').trim();

  if (sanitized.length < 3) {
    errors.push('Usuario debe tener al menos 3 caracteres');
    return { isValid: false, errors };
  }

  if (sanitized.length > 30) {
    errors.push('Usuario no puede exceder 30 caracteres');
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized,
  };
};

/**
 * Validar email
 */
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];

  if (!email) {
    errors.push('Email es requerido');
    return { isValid: false, errors };
  }

  // Detectar inyecciones
  if (detectSQLInjection(email) || detectXSS(email)) {
    errors.push('Email contiene caracteres no permitidos');
    return { isValid: false, errors };
  }

  // Validar formato de email
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) {
    errors.push('Email no tiene formato válido');
    return { isValid: false, errors };
  }

  if (email.length > 254) {
    errors.push('Email excede longitud máxima');
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: email.toLowerCase().trim(),
  };
};

/**
 * Validar password
 */
export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];

  if (!password) {
    errors.push('Contraseña es requerida');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Contraseña debe tener al menos 8 caracteres');
  }

  if (password.length > 128) {
    errors.push('Contraseña no puede exceder 128 caracteres');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Contraseña debe contener al menos una minúscula');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Contraseña debe contener al menos una mayúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Contraseña debe contener al menos un número');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Contraseña debe contener al menos un carácter especial');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: password, // No sanitizar passwords
  };
};

/**
 * Calcular fortaleza de password
 */
export const calculatePasswordStrength = (
  password: string
): {
  score: number;
  label: 'Muy débil' | 'Débil' | 'Media' | 'Fuerte' | 'Muy fuerte';
  color: string;
} => {
  let score = 0;

  if (!password) return { score: 0, label: 'Muy débil', color: '#f44336' };

  // Longitud
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Complejidad
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

  // Diversidad
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= 8) score += 1;

  if (score <= 2) return { score, label: 'Muy débil', color: '#f44336' };
  if (score <= 4) return { score, label: 'Débil', color: '#ff9800' };
  if (score <= 5) return { score, label: 'Media', color: '#ffc107' };
  if (score <= 6) return { score, label: 'Fuerte', color: '#4caf50' };
  return { score, label: 'Muy fuerte', color: '#2196f3' };
};
