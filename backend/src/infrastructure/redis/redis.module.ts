import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import Redis from 'ioredis';
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from './redis.constants';
import { RedisService } from './redis.service';

const buildClient = (config: ConfigService, label: string): Redis => {
  const logger = new Logger(`Redis:${label}`);
  const url = config.get<string>('redis.url');
  const client = url
    ? new Redis(url, { maxRetriesPerRequest: null, lazyConnect: false })
    : new Redis({
        host: config.get<string>('redis.host'),
        port: config.get<number>('redis.port'),
        password: config.get<string>('redis.password') || undefined,
        maxRetriesPerRequest: null,
        lazyConnect: false,
      });
  client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
  client.on('connect', () => logger.log(`Conectado (${label}).`));
  return client;
};

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildClient(config, 'client'),
    },
    {
      provide: REDIS_SUBSCRIBER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildClient(config, 'subscriber'),
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, REDIS_SUBSCRIBER, RedisService],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationShutdown(): Promise<void> {
    const client = this.moduleRef.get<Redis>(REDIS_CLIENT, { strict: false });
    const sub = this.moduleRef.get<Redis>(REDIS_SUBSCRIBER, { strict: false });
    await Promise.allSettled([client?.quit(), sub?.quit()]);
  }
}
