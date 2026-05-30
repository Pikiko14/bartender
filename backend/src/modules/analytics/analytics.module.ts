import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MusicRequestModel,
  MusicRequestSchema,
} from '@modules/music/infrastructure/schemas/music-request.schema';
import { OrderModel, OrderSchema } from '@modules/orders/infrastructure/schemas/order.schema';
import { AnalyticsService } from './application/analytics.service';
import { AnalyticsController } from './infrastructure/controllers/analytics.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrderModel.name, schema: OrderSchema },
      { name: MusicRequestModel.name, schema: MusicRequestSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
