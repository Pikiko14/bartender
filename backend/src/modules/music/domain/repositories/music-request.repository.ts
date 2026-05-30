import { MusicRequest, MusicRequestStatus } from '../entities/music-request.entity';

export abstract class MusicRequestRepository {
  abstract create(request: MusicRequest): Promise<MusicRequest>;
  abstract findById(id: string): Promise<MusicRequest | null>;
  abstract findByBusinessAndStatuses(
    businessId: string,
    statuses: MusicRequestStatus[],
  ): Promise<MusicRequest[]>;
  abstract findNowPlaying(businessId: string): Promise<MusicRequest | null>;
  abstract update(request: MusicRequest): Promise<MusicRequest>;
  abstract countRecentBySession(
    businessId: string,
    requestedBy: string,
    since: Date,
  ): Promise<number>;
}

export const MUSIC_REQUEST_REPOSITORY = Symbol('MUSIC_REQUEST_REPOSITORY');
