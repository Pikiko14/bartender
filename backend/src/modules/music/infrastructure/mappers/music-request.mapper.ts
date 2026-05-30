import { Types } from 'mongoose';
import { MusicRequest } from '../../domain/entities/music-request.entity';
import { MusicRequestDocument } from '../schemas/music-request.schema';

export class MusicRequestMapper {
  static toDomain(doc: MusicRequestDocument): MusicRequest {
    return new MusicRequest({
      id: doc._id.toString(),
      businessId: doc.businessId.toString(),
      title: doc.title,
      youtubeId: doc.youtubeId,
      thumbnail: doc.thumbnail,
      channelTitle: doc.channelTitle,
      durationSeconds: doc.durationSeconds,
      requestedBy: doc.requestedBy,
      status: doc.status,
      priority: doc.priority,
      votes: doc.votes,
      voters: doc.voters ?? [],
      playedAt: doc.playedAt,
      createdAt: (doc as unknown as { createdAt?: Date }).createdAt,
    });
  }

  static toPersistence(request: MusicRequest): Record<string, unknown> {
    const p = request.toPrimitives();
    return {
      businessId: new Types.ObjectId(p.businessId),
      title: p.title,
      youtubeId: p.youtubeId,
      thumbnail: p.thumbnail,
      channelTitle: p.channelTitle,
      durationSeconds: p.durationSeconds,
      requestedBy: p.requestedBy,
      status: p.status,
      priority: p.priority,
      votes: p.votes,
      voters: p.voters,
      playedAt: p.playedAt,
    };
  }
}
