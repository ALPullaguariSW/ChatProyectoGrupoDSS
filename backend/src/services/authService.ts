import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import config from '../config';
import User, { IUser } from '../models/User';
import { setSession, deleteSession } from '../config/redis';
import logger, { auditLog } from '../utils/logger';
import { generateDeviceFingerprint } from '../utils/crypto';

interface TokenPayload {
  userId: string;
  username: string;
  role: string;
}

interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: Partial<IUser>;
  message?: string;
  require2FA?: boolean;
  qrCode?: string;
}

/**
 * Generar JWT token
 */
export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwt.secret as jwt.Secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
};

/**
 * Generar Refresh Token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwt.refreshSecret as jwt.Secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
};

/**
 * Verificar JWT token
 */
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, config.jwt.secret) as TokenPayload;
  } catch (error) {
    return null;
  }
};

/**
 * Verificar Refresh Token
 */
export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
  } catch (error) {
    return null;
  }
};

/**
 * Registrar admin (solo se ejecuta una vez)
 */
export const registerAdmin = async (): Promise<void> => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      logger.info('Admin ya existe');
      return;
    }

    const admin = new User({
      username: config.admin.username,
      email: config.admin.email,
      password: config.admin.password,
      role: 'admin',
    });

    await admin.save();
    logger.info('✅ Admin creado exitosamente');
  } catch (error) {
    logger.error('Error creando admin:', error);
  }
};

/**
 * Registrar nuevo usuario
 */
export const register = async (
  username: string,
  email: string,
  password: string,
  ip: string,
  userAgent: string = ''
): Promise<AuthResponse> => {
  try {
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return { success: false, message: 'El nombre de usuario ya está en uso' };
      }
      return { success: false, message: 'El email ya está registrado' };
    }

    // Crear nuevo usuario
    const user = new User({
      username,
      email,
      password, // Se hasheará automáticamente por el middleware del modelo
      role: 'user',
    });

    await user.save();

    // Generar tokens
    const deviceId = generateDeviceFingerprint(ip, userAgent);
    logger.info(`[REGISTER DEBUG] IP: ${ip}, UserAgent: ${userAgent}, DeviceID: ${deviceId}`);
    
    const payload: TokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Guardar sesión
    await setSession(`session:${user._id}:${deviceId}`, {
      userId: user._id.toString(),
      username: user.username,
      deviceId,
      ip,
      createdAt: Date.now(),
    });
    
    logger.info(`[REGISTER DEBUG] Sesión guardada: session:${user._id}:${deviceId}`);

    // Registrar en audit log
    auditLog('USER_REGISTERED', username, ip, { email });

    logger.info(`✅ Usuario registrado: ${username}`);

    return {
      success: true,
      message: 'Usuario registrado exitosamente',
      token,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    logger.error('Error en registro:', error);
    return {
      success: false,
      message: 'Error al registrar usuario',
    };
  }
};

/**
 * Login de usuario
 */
export const login = async (
  username: string,
  password: string,
  ip: string,
  userAgent: string,
  twoFactorCode?: string
): Promise<AuthResponse> => {
  try {
    // Buscar usuario
    const user = await User.findOne({ username }).select('+twoFactorSecret');
    if (!user) {
      auditLog('LOGIN_FAILED', 'unknown', ip, { username, reason: 'user_not_found' });
      return { success: false, message: 'Credenciales inválidas' };
    }

    // Verificar contraseña
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      auditLog('LOGIN_FAILED', user._id.toString(), ip, { reason: 'invalid_password' });
      return { success: false, message: 'Credenciales inválidas' };
    }

    // Verificar 2FA si está habilitado
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return { success: false, require2FA: true, message: 'Se requiere código 2FA' };
      }

      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret!,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2,
      });

      if (!isValid) {
        auditLog('LOGIN_FAILED', user._id.toString(), ip, { reason: 'invalid_2fa' });
        return { success: false, message: 'Código 2FA inválido' };
      }
    }

    // Generar tokens
    const payload: TokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Guardar sesión en Redis
    const deviceId = generateDeviceFingerprint(ip, userAgent);
    await setSession(`session:${user._id}:${deviceId}`, {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      ip,
      deviceId,
      loginAt: new Date(),
    }, 604800); // 7 días

    // Actualizar última conexión
    user.lastLogin = new Date();
    await user.save();

    auditLog('LOGIN_SUCCESS', user._id.toString(), ip, { username: user.username });

    return {
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  } catch (error) {
    logger.error('Error en login:', error);
    return { success: false, message: 'Error en el servidor' };
  }
};

/**
 * Logout de usuario
 */
export const logout = async (userId: string, deviceId: string, ip: string): Promise<void> => {
  try {
    await deleteSession(`session:${userId}:${deviceId}`);
    auditLog('LOGOUT', userId, ip);
  } catch (error) {
    logger.error('Error en logout:', error);
  }
};

/**
 * Refrescar token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<AuthResponse> => {
  try {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return { success: false, message: 'Refresh token inválido' };
    }

    // Crear nuevo payload sin propiedades reservadas (exp, iat, nbf, aud, iss, sub)
    const newPayload: TokenPayload = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
    };

    const newToken = generateToken(newPayload);
    return { success: true, token: newToken };
  } catch (error) {
    logger.error('Error refrescando token:', error);
    return { success: false, message: 'Error refrescando token' };
  }
};

/**
 * Habilitar 2FA
 */
export const enable2FA = async (userId: string): Promise<{ secret: string; qrCode: string }> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const secret = speakeasy.generateSecret({
    name: `SecureChat (${user.username})`,
    length: 32,
  });

  user.twoFactorSecret = secret.base32;
  await user.save();

  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

  return {
    secret: secret.base32,
    qrCode,
  };
};

/**
 * Verificar y activar 2FA
 */
export const verify2FA = async (userId: string, token: string, ip: string): Promise<boolean> => {
  const user = await User.findById(userId).select('+twoFactorSecret');
  if (!user || !user.twoFactorSecret) {
    return false;
  }

  const isValid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 2,
  });

  if (isValid) {
    user.twoFactorEnabled = true;
    await user.save();
    auditLog('2FA_ENABLED', userId, ip);
  }

  return isValid;
};

/**
 * Deshabilitar 2FA
 */
export const disable2FA = async (userId: string, ip: string): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  await user.save();

  auditLog('2FA_DISABLED', userId, ip);
};
