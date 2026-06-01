import { Types } from 'mongoose';
import { MusicProvider } from '@shared/enums/music-provider.enum';
import { Business } from '../../domain/entities/business.entity';
import { BusinessDocument } from '../schemas/business.schema';

export class BusinessMapper {
  static toDomain(doc: BusinessDocument): Business {
    return new Business({
      id: doc._id.toString(),
      name: doc.name,
      slug: doc.slug,
      logo: doc.logo,
      cover: doc.cover,
      description: doc.description,
      ownerId: doc.ownerId.toString(),
      active: doc.active,
      subscriptionStatus: doc.subscriptionStatus,
      musicProvider: doc.musicProvider ?? MusicProvider.YOUTUBE,
      spotifyUserId: doc.spotifyUserId ?? null,
      spotifyDisplayName: doc.spotifyDisplayName ?? null,
      spotifyAccessToken: doc.spotifyAccessToken ?? null,
      spotifyRefreshToken: doc.spotifyRefreshToken ?? null,
      spotifyTokenExpiresAt: doc.spotifyTokenExpiresAt ?? null,
      spotifyDeviceId: doc.spotifyDeviceId ?? null,
      spotifyConnectedAt: doc.spotifyConnectedAt ?? null,
      spotifyLastSyncAt: doc.spotifyLastSyncAt ?? null,
      createdAt: (doc as unknown as { createdAt?: Date }).createdAt,
      updatedAt: (doc as unknown as { updatedAt?: Date }).updatedAt,
    });
  }

  static toPersistence(business: Business): Record<string, unknown> {
    const p = business.toPrimitives();
    return {
      name: p.name,
      slug: p.slug,
      logo: p.logo,
      cover: p.cover,
      description: p.description,
      ownerId: new Types.ObjectId(p.ownerId),
      active: p.active,
      subscriptionStatus: p.subscriptionStatus,
      musicProvider: p.musicProvider,
      spotifyUserId: p.spotifyUserId,
      spotifyDisplayName: p.spotifyDisplayName,
      spotifyAccessToken: p.spotifyAccessToken,
      spotifyRefreshToken: p.spotifyRefreshToken,
      spotifyTokenExpiresAt: p.spotifyTokenExpiresAt,
      spotifyDeviceId: p.spotifyDeviceId,
      spotifyConnectedAt: p.spotifyConnectedAt,
      spotifyLastSyncAt: p.spotifyLastSyncAt,
    };
  }
}
