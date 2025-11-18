import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import config from '../config';

/**
 * Encriptación AES-256-GCM para datos en reposo
 */
export const encrypt = (text: string): string => {
  try {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(config.encryption.key);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Retornar: iv + authTag + encrypted (separados por :)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    throw new Error('Error en encriptación');
  }
};

/**
 * Desencriptación AES-256-GCM
 */
export const decrypt = (encryptedText: string): string => {
  try {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(config.encryption.key);
    
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato de texto encriptado inválido');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Error en desencriptación');
  }
};

/**
 * Generar hash SHA-256 para integridad
 */
export const generateHash = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Verificar integridad de datos
 */
export const verifyHash = (data: string, hash: string): boolean => {
  return generateHash(data) === hash;
};

/**
 * Generar PIN único para salas
 */
export const generateRoomPin = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generar ID único seguro
 */
export const generateSecureId = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Encriptación cliente-servidor (para mensajes end-to-end)
 * Usando claves efímeras por sala
 */
export const generateEphemeralKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Encriptar mensaje con clave efímera
 */
export const encryptMessage = (message: string, key: string): string => {
  return CryptoJS.AES.encrypt(message, key).toString();
};

/**
 * Desencriptar mensaje con clave efímera
 */
export const decryptMessage = (encryptedMessage: string, key: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Generar device fingerprint
 */
export const generateDeviceFingerprint = (ip: string, userAgent: string): string => {
  const data = `${ip}-${userAgent}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Firmar datos digitalmente
 */
export const signData = (data: string): string => {
  const hmac = crypto.createHmac('sha256', config.jwt.secret);
  hmac.update(data);
  return hmac.digest('hex');
};

/**
 * Verificar firma digital
 */
export const verifySignature = (data: string, signature: string): boolean => {
  return signData(data) === signature;
};
