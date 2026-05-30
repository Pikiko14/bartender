import { Body, Controller, INestApplication, Post, ValidationPipe } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { IsEmail } from 'class-validator';
import * as request from 'supertest';
import { TransformInterceptor } from '../src/shared/interceptors/transform.interceptor';

class PingDto {
  @IsEmail()
  email!: string;
}

@Controller('ping')
class PingController {
  @Post()
  ping(@Body() dto: PingDto) {
    return { email: dto.email };
  }
}

/**
 * E2E básico del pipeline transversal (ValidationPipe + TransformInterceptor)
 * sin dependencias de infraestructura (Mongo/Redis).
 */
describe('Pipeline transversal (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PingController],
      providers: [{ provide: APP_INTERCEPTOR, useClass: TransformInterceptor }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('envuelve respuestas correctas con { success, data }', () => {
    return request(app.getHttpServer())
      .post('/ping')
      .send({ email: 'demo@bartender.app' })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.email).toBe('demo@bartender.app');
      });
  });

  it('rechaza payloads inválidos con 400', () => {
    return request(app.getHttpServer()).post('/ping').send({ email: 'no-es-email' }).expect(400);
  });
});
