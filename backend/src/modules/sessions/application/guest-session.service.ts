import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { RedisService } from '@infrastructure/redis/redis.service';
import { EntityNotFoundException } from '@core/domain/exceptions';

export interface GuestSession {
  sessionId: string;
  businessId: string;
  tableId: string;
  createdAt: string;
}

@Injectable()
export class GuestSessionService {
  private readonly ttlSeconds = 60 * 60 * 4; // 4 horas

  constructor(private readonly redis: RedisService) {}

  private key(sessionId: string): string {
    return `guest:${sessionId}`;
  }

  async create(businessId: string, tableId: string): Promise<GuestSession> {
    const sessionId = `guest_${uuid().replace(/-/g, '').slice(0, 16)}`;
    const session: GuestSession = {
      sessionId,
      businessId,
      tableId,
      createdAt: new Date().toISOString(),
    };
    await this.redis.set(this.key(sessionId), session, this.ttlSeconds);
    return session;
  }

  async get(sessionId: string): Promise<GuestSession> {
    const session = await this.redis.get<GuestSession>(this.key(sessionId));
    if (!session) {
      throw new EntityNotFoundException('Sesión guest', sessionId);
    }
    return session;
  }

  async exists(sessionId: string): Promise<boolean> {
    return (await this.redis.get<GuestSession>(this.key(sessionId))) !== null;
  }
}
