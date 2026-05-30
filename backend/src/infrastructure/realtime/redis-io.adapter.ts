import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { ServerOptions } from 'socket.io';
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from '../redis/redis.constants';

/**
 * Adaptador de Socket.io respaldado por Redis pub/sub para permitir
 * escalado horizontal (múltiples instancias del backend comparten rooms).
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const pubClient = this.app.get<Redis>(REDIS_CLIENT);
    const subClient = this.app.get<Redis>(REDIS_SUBSCRIBER);
    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Adaptador Redis para Socket.io inicializado.');
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
