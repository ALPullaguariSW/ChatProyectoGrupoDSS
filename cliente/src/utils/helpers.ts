import CryptoJS from 'crypto-js';

/**
 * Encriptar mensaje con clave de sala
 */
export const encryptMessage = (message: string, key: string): string => {
  try {
    return CryptoJS.AES.encrypt(message, key).toString();
  } catch (error) {
    console.error('Error encriptando mensaje:', error);
    return message;
  }
};

/**
 * Desencriptar mensaje con clave de sala
 */
export const decryptMessage = (encryptedMessage: string, key: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encryptedMessage;
  } catch (error) {
    console.error('Error desencriptando mensaje:', error);
    return encryptedMessage;
  }
};

/**
 * Generar hash SHA-256
 */
export const generateHash = (data: string): string => {
  return CryptoJS.SHA256(data).toString();
};

/**
 * Verificar hash
 */
export const verifyHash = (data: string, hash: string): boolean => {
  return generateHash(data) === hash;
};

/**
 * Validar PIN (6 dígitos)
 */
export const isValidPin = (pin: string): boolean => {
  return /^\d{6}$/.test(pin);
};

/**
 * Sanitizar nickname (prevenir XSS)
 */
export const sanitizeNickname = (nickname: string): string => {
  return nickname
    .replace(/[<>'"]/g, '')
    .trim()
    .substring(0, 20);
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * 🛡️ ENHANCED SANITIZATION FUNCTIONS - SECURITY LAYER
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * Sanitizar input general (prevenir XSS, injection)
 */
export const sanitizeInput = (input: string, maxLength: number = 500): string => {
  if (!input || typeof input !== 'string') return '';

  return (
    input
      // Remover caracteres HTML peligrosos
      .replace(/[<>]/g, '')
      // Remover comillas para prevenir inyección de atributos
      .replace(/["'`]/g, '')
      // Remover caracteres de control
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Remover scripts y eventos
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      // Normalizar espacios
      .replace(/\s+/g, ' ')
      .trim()
      // Limitar longitud
      .substring(0, maxLength)
  );
};

/**
 * Sanitizar texto de mensaje de chat
 */
export const sanitizeMessage = (message: string): string => {
  if (!message || typeof message !== 'string') return '';

  return (
    message
      // Permitir algunos caracteres especiales pero remover peligrosos
      .replace(/[<>]/g, (match) => {
        return match === '<' ? '&lt;' : '&gt;';
      })
      // Escapar comillas
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      // Remover javascript: URLs
      .replace(/javascript:/gi, '')
      // Remover event handlers
      .replace(/on\w+\s*=/gi, '')
      // Normalizar espacios pero preservar nuevas líneas
      .replace(/[ \t]+/g, ' ')
      .trim()
      // Limitar longitud del mensaje
      .substring(0, 5000)
  );
};

/**
 * Sanitizar nombre de sala
 */
export const sanitizeRoomName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';

  return (
    name
      // Remover todo excepto letras, números, espacios, guiones
      .replace(/[^a-zA-Z0-9\s\-_áéíóúÁÉÍÓÚñÑ]/g, '')
      // Normalizar espacios
      .replace(/\s+/g, ' ')
      .trim()
      // Limitar longitud
      .substring(0, 50)
  );
};

/**
 * Sanitizar filename (archivos subidos)
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename || typeof filename !== 'string') return 'file';

  // Extraer extensión
  const lastDot = filename.lastIndexOf('.');
  const name = lastDot > 0 ? filename.substring(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.substring(lastDot) : '';

  // Sanitizar nombre
  const sanitizedName = name.replace(/[^a-zA-Z0-9\-_]/g, '_').substring(0, 50);

  // Sanitizar extensión (solo permitir ciertas extensiones)
  const sanitizedExt = ext
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '')
    .substring(0, 10);

  return sanitizedName + sanitizedExt;
};

/**
 * Validar email
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;

  // RFC 5322 simplificado
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validar username
 */
export const isValidUsername = (username: string): boolean => {
  if (!username || typeof username !== 'string') return false;

  // 3-20 caracteres, solo letras, números, guiones y guiones bajos
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
};

/**
 * Validar password strength
 */
export const validatePasswordStrength = (
  password: string
): {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  errors: string[];
} => {
  const errors: string[] = [];
  let score = 0;

  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      strength: 'weak',
      errors: ['Password es requerido'],
    };
  }

  // Longitud mínima
  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  } else {
    score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
  }

  // Mayúsculas
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe contener mayúsculas');
  } else {
    score += 1;
  }

  // Minúsculas
  if (!/[a-z]/.test(password)) {
    errors.push('Debe contener minúsculas');
  } else {
    score += 1;
  }

  // Números
  if (!/[0-9]/.test(password)) {
    errors.push('Debe contener números');
  } else {
    score += 1;
  }

  // Caracteres especiales
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Debe contener caracteres especiales');
  } else {
    score += 1;
  }

  // Determinar fortaleza
  let strength: 'weak' | 'medium' | 'strong' | 'very-strong' = 'weak';
  if (score >= 6) strength = 'very-strong';
  else if (score >= 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';

  return {
    isValid: errors.length === 0 && score >= 4,
    strength,
    errors,
  };
};

/**
 * Escape HTML entities
 */
export const escapeHtml = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
};

/**
 * Unescape HTML entities
 */
export const unescapeHtml = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  const htmlUnescapeMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
  };

  return text.replace(
    /&(?:amp|lt|gt|quot|#x27|#x2F);/g,
    (entity) => htmlUnescapeMap[entity] || entity
  );
};

/**
 * Detectar y bloquear intentos de inyección SQL
 */
export const detectSQLInjection = (input: string): boolean => {
  if (!input || typeof input !== 'string') return false;

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(--|\;|\/\*|\*\/)/g,
    /(\bOR\b.*=.*|1=1|'=')/gi,
    /(\bAND\b.*=.*)/gi,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
};

/**
 * Detectar y bloquear intentos de inyección NoSQL
 */
export const detectNoSQLInjection = (input: string): boolean => {
  if (!input || typeof input !== 'string') return false;

  const noSqlPatterns = [
    /\$where/gi,
    /\$ne/gi,
    /\$gt/gi,
    /\$lt/gi,
    /\$regex/gi,
    /\$or/gi,
    /\$and/gi,
  ];

  return noSqlPatterns.some((pattern) => pattern.test(input));
};

/**
 * Rate limiting helper (client-side tracking)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  record.count++;
  return true;
};

/**
 * Formatear tamaño de archivo
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Formatear fecha/hora
 */
export const formatTimestamp = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  // Menos de 1 minuto
  if (diff < 60000) {
    return 'Justo ahora';
  }

  // Menos de 1 hora
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `Hace ${minutes} min`;
  }

  // Mismo día
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  // Diferente día
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Copiar al portapapeles
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback para navegadores antiguos
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch (error) {
    console.error('Error copiando al portapapeles:', error);
    return false;
  }
};

/**
 * Validar archivo
 */
export const validateFile = (
  file: File,
  maxSize: number = 10 * 1024 * 1024, // 10MB
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
): { valid: boolean; error?: string } => {
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `El archivo es demasiado grande. Máximo ${formatFileSize(maxSize)}`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de archivo no permitido',
    };
  }

  return { valid: true };
};

/**
 * Generar color para avatar basado en nickname
 */
export const getAvatarColor = (nickname: string): string => {
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA07A',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E2',
    '#F8B739',
    '#52B788',
    '#E76F51',
    '#2A9D8F',
  ];

  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

/**
 * Generar iniciales para avatar
 */
export const getInitials = (nickname: string): string => {
  const words = nickname.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return nickname.substring(0, 2).toUpperCase();
};
