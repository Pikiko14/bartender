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
  url?: string;
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

function stripEnvQuotes(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** Upstash: REST URL + token → conexión TCP (mismo token como password). */
function upstashRestToRedisUrl(restUrl: string, token: string): string {
  const host = restUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return `rediss://default:${encodeURIComponent(token)}@${host}:6379`;
}

function buildRedisConfig(): RedisConfig {
  const explicitUrl =
    stripEnvQuotes(process.env.REDIS_URL) ??
    stripEnvQuotes(process.env.REDIS_PRIVATE_URL) ??
    stripEnvQuotes(process.env.UPSTASH_REDIS_URL);

  const upstashRestUrl = stripEnvQuotes(process.env.UPSTASH_REDIS_REST_URL);
  const upstashRestToken = stripEnvQuotes(process.env.UPSTASH_REDIS_REST_TOKEN);
  const upstashUrl =
    !explicitUrl && upstashRestUrl && upstashRestToken
      ? upstashRestToRedisUrl(upstashRestUrl, upstashRestToken)
      : undefined;

  const url = explicitUrl ?? upstashUrl;

  const host = stripEnvQuotes(process.env.REDIS_HOST ?? process.env.REDISHOST);

  // A veces la URL TCP de Upstash se pega en REDIS_HOST por error.
  if (!url && host && /^rediss?:\/\//i.test(host)) {
    return { url: host, host: 'localhost', port: 6379 };
  }

  return {
    url,
    host: host ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? process.env.REDISPORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? process.env.REDISPASSWORD ?? undefined,
  };
}

export default (): Configuration => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    name: process.env.APP_NAME ?? 'Bartender',
    // Railway inyecta PORT; BACKEND_PORT se usa en docker compose local.
    port: parseInt(process.env.PORT ?? process.env.BACKEND_PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api',
  },
  mongo: {
    uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/bartender',
  },
  redis: buildRedisConfig(),
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
