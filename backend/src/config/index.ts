import dotenv from 'dotenv';
dotenv.config();

interface Config {
  env: string;
  port: number;
  host: string;
  mongodb: {
    uri: string;
    options: any;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  encryption: {
    key: string;
    iv: string;
  };
  cors: {
    origin: string | string[];
  };
  fileUpload: {
    maxSize: number;
    allowedTypes: string[];
  };
  security: {
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    sessionSecret: string;
  };
  admin: {
    username: string;
    password: string;
    email: string;
  };
  twoFactor: {
    enabled: boolean;
  };
  logging: {
    level: string;
    filePath: string;
  };
  steganography: {
    entropyThreshold: number;
    enabled: boolean;
  };
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_chat',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || '12345678901234567890123456789012',
    iv: process.env.ENCRYPTION_IV || '1234567890123456',
  },
  cors: {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.includes(',') 
        ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
        : process.env.CORS_ORIGIN
      : 'http://localhost:3000',
  },
  fileUpload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(','),
  },
  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    sessionSecret: process.env.SESSION_SECRET || 'change-this-session-secret',
  },
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'Admin123!@#',
    email: process.env.ADMIN_EMAIL || 'admin@securechat.com',
  },
  twoFactor: {
    enabled: process.env.TWO_FACTOR_ENABLED === 'true',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs',
  },
  steganography: {
    entropyThreshold: parseFloat(process.env.ENTROPY_THRESHOLD || '7.5'),
    enabled: process.env.ENABLE_STEGO_DETECTION !== 'false',
  },
};

export default config;
