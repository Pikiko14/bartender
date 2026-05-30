export interface AppConfig {
  env: string;
  name: string;
  port: number;
  apiPrefix: string;
}

export interface MongoConfig {
  uri: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface JwtConfig {
  accessSecret: string;
  accessTtl: string;
  refreshSecret: string;
  refreshTtl: string;
}

export interface SecurityConfig {
  corsOrigins: string[];
  rateLimitTtl: number;
  rateLimitMax: number;
}

export interface QrConfig {
  baseUrl: string;
}

export interface YoutubeConfig {
  apiKey: string;
}

export interface UploadsConfig {
  dir: string;
  maxFileSize: number;
}

export interface MercadoPagoConfig {
  accessToken: string;
  publicAppUrl: string;
  webhookBaseUrl: string;
}

export interface Configuration {
  app: AppConfig;
  mongo: MongoConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  security: SecurityConfig;
  qr: QrConfig;
  youtube: YoutubeConfig;
  uploads: UploadsConfig;
  mercadoPago: MercadoPagoConfig;
}

export default (): Configuration => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    name: process.env.APP_NAME ?? 'Bartender',
    port: parseInt(process.env.BACKEND_PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api',
  },
  mongo: {
    uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/bartender',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'access_secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'refresh_secret',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  security: {
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL ?? '60', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? '120', 10),
  },
  qr: {
    baseUrl: process.env.QR_BASE_URL ?? 'http://localhost:5173',
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY ?? '',
  },
  uploads: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE ?? String(5 * 1024 * 1024), 10),
  },
  mercadoPago: {
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? '',
    publicAppUrl: process.env.PUBLIC_APP_URL ?? 'http://localhost:5173',
    webhookBaseUrl: process.env.PUBLIC_API_URL ?? 'http://localhost:3000',
  },
});
