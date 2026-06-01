import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from '@config/configuration';
import { validateEnv } from '@config/env.validation';
import { AllExceptionsFilter } from '@shared/filters/all-exceptions.filter';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from '@shared/guards';
import { LoggingInterceptor, TransformInterceptor } from '@shared/interceptors';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { RealtimeModule } from '@infrastructure/realtime/realtime.module';
import { SecurityModule } from '@infrastructure/security/security.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { BusinessModule } from '@modules/business/business.module';
import { TablesModule } from '@modules/tables/tables.module';
import { SessionsModule } from '@modules/sessions/sessions.module';
import { MenuModule } from '@modules/menu/menu.module';
import { OrdersModule } from '@modules/orders/orders.module';
import { MusicModule } from '@modules/music/music.module';
import { AnalyticsModule } from '@modules/analytics/analytics.module';
import { SubscriptionsModule } from '@modules/subscriptions/subscriptions.module';
import { SpotifyModule } from '@modules/spotify/spotify.module';
import { CustomersModule } from '@modules/customers/customers.module';
import { UploadsModule } from '@infrastructure/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: (config.get<number>('security.rateLimitTtl') ?? 60) * 1000,
            limit: config.get<number>('security.rateLimitMax') ?? 120,
          },
        ],
      }),
    }),
    DatabaseModule,
    RedisModule,
    RealtimeModule,
    SecurityModule,
    AuthModule,
    UsersModule,
    BusinessModule,
    TablesModule,
    SessionsModule,
    MenuModule,
    OrdersModule,
    CustomersModule,
    MusicModule,
    SpotifyModule,
    AnalyticsModule,
    SubscriptionsModule,
    UploadsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
