import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrderStatus } from '@shared/enums';
import { OrderDocument, OrderModel } from '@modules/orders/infrastructure/schemas/order.schema';
import {
  MusicRequestDocument,
  MusicRequestModel,
} from '@modules/music/infrastructure/schemas/music-request.schema';

export interface AnalyticsOverview {
  range: { from: string; to: string };
  sales: { revenue: number; orders: number; averageTicket: number };
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  topSongs: Array<{ title: string; youtubeId: string; requests: number }>;
  avgPreparationMinutes: number;
  busiestTables: Array<{ tableId: string; orders: number }>;
  peakHours: Array<{ hour: number; orders: number }>;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(OrderModel.name) private readonly orders: Model<OrderDocument>,
    @InjectModel(MusicRequestModel.name) private readonly music: Model<MusicRequestDocument>,
  ) {}

  async overview(businessId: string, from: Date, to: Date): Promise<AnalyticsOverview> {
    const bid = new Types.ObjectId(businessId);
    const match = { businessId: bid, createdAt: { $gte: from, $lte: to } };
    const paidMatch = { ...match, status: { $ne: OrderStatus.CANCELLED } };

    const [sales, topProducts, topSongs, prep, tables, hours] = await Promise.all([
      this.sales(paidMatch),
      this.topProducts(paidMatch),
      this.topSongs(bid, from, to),
      this.avgPreparation(bid, from, to),
      this.busiestTables(paidMatch),
      this.peakHours(paidMatch),
    ]);

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      sales,
      topProducts,
      topSongs,
      avgPreparationMinutes: prep,
      busiestTables: tables,
      peakHours: hours,
    };
  }

  private async sales(match: Record<string, unknown>) {
    const [row] = await this.orders.aggregate([
      { $match: match },
      { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    ]);
    const revenue = row?.revenue ?? 0;
    const orders = row?.orders ?? 0;
    return {
      revenue: Math.round(revenue * 100) / 100,
      orders,
      averageTicket: orders ? Math.round((revenue / orders) * 100) / 100 : 0,
    };
  }

  private topProducts(match: Record<string, unknown>) {
    return this.orders.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, name: '$_id', quantity: 1, revenue: 1 } },
    ]);
  }

  private topSongs(businessId: Types.ObjectId, from: Date, to: Date) {
    return this.music.aggregate([
      { $match: { businessId, createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { youtubeId: '$youtubeId', title: '$title' },
          requests: { $sum: 1 },
        },
      },
      { $sort: { requests: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          youtubeId: '$_id.youtubeId',
          title: '$_id.title',
          requests: 1,
        },
      },
    ]);
  }

  /** Tiempo medio de preparación aproximado (createdAt -> updatedAt) de pedidos entregados. */
  private async avgPreparation(businessId: Types.ObjectId, from: Date, to: Date): Promise<number> {
    const [row] = await this.orders.aggregate([
      {
        $match: {
          businessId,
          createdAt: { $gte: from, $lte: to },
          status: { $in: [OrderStatus.READY, OrderStatus.DELIVERED] },
        },
      },
      {
        $project: {
          minutes: {
            $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60],
          },
        },
      },
      { $group: { _id: null, avg: { $avg: '$minutes' } } },
    ]);
    return Math.round((row?.avg ?? 0) * 10) / 10;
  }

  private busiestTables(match: Record<string, unknown>) {
    return this.orders.aggregate([
      { $match: match },
      { $group: { _id: '$tableId', orders: { $sum: 1 } } },
      { $sort: { orders: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, tableId: { $toString: '$_id' }, orders: 1 } },
    ]);
  }

  private peakHours(match: Record<string, unknown>) {
    return this.orders.aggregate([
      { $match: match },
      { $group: { _id: { $hour: '$createdAt' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, hour: '$_id', orders: 1 } },
    ]);
  }
}
