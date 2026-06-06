import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { RedisIoAdapter } from '@infrastructure/realtime/redis-io.adapter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const apiPrefix = config.get<string>('app.apiPrefix') ?? 'api';
  const port = config.get<number>('app.port') ?? 3000;
  const corsOrigins = config.get<string[]>('security.corsOrigins') ?? ['http://localhost:5173'];
  const uploadDirConfig = config.get<string>('uploads.dir') ?? 'uploads';
  const uploadDir = uploadDirConfig.startsWith('/') || /^[A-Za-z]:\\/.test(uploadDirConfig)
    ? uploadDirConfig
    : join(process.cwd(), uploadDirConfig);

  app.setGlobalPrefix(apiPrefix);

  app.useStaticAssets(uploadDir, {
    prefix: `/${apiPrefix}/uploads/`,
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.enableCors({
    origin: corsOrigins.includes('*') ? true : corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Adaptador Socket.io con Redis para escalado horizontal.
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.enableShutdownHooks();

  await app.listen(port);
  const mongoUri = config.get<string>('mongo.uri') ?? '';
  const redisHost = config.get<string>('redis.host') ?? 'localhost';
  const youtubeKey = config.get<string>('youtube.apiKey') ?? '';
  logger.log(`🍸 Bartender API escuchando en http://localhost:${port}/${apiPrefix}`);
  logger.log(
    `📋 Config: mongo=${mongoUri.replace(/\/\/.*@/, '//***@')} · redis=${redisHost} · youtube=${youtubeKey ? 'ok' : 'sin clave'}`,
  );
}

void bootstrap();
