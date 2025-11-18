import Redis from 'ioredis';
import config from './index';
import logger from '../utils/logger';

const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('connect', () => {
  logger.info('✅ Redis conectado exitosamente');
});

redisClient.on('error', (err) => {
  logger.error('❌ Error en Redis:', err);
});

// Helper functions
export const setSession = async (key: string, value: any, expiresIn: number = 3600): Promise<void> => {
  await redisClient.setex(key, expiresIn, JSON.stringify(value));
};

export const getSession = async (key: string): Promise<any> => {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

export const deleteSession = async (key: string): Promise<void> => {
  await redisClient.del(key);
};

export const setUserDevice = async (userId: string, deviceId: string, ip: string): Promise<void> => {
  await redisClient.hset(`user:${userId}:devices`, deviceId, ip);
};

export const getUserDevices = async (userId: string): Promise<Record<string, string>> => {
  return await redisClient.hgetall(`user:${userId}:devices`);
};

export const deleteUserDevice = async (userId: string, deviceId: string): Promise<void> => {
  await redisClient.hdel(`user:${userId}:devices`, deviceId);
};

export default redisClient;
