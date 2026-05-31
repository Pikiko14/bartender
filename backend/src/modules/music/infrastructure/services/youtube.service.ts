import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { BusinessRuleViolationException } from '@core/domain/exceptions';

export interface YoutubeVideo {
  youtubeId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  durationSeconds: number | null;
}

interface YoutubeSearchResponse {
  items: Array<{
    id: { videoId: string };
    snippet: { title: string; channelTitle: string; thumbnails: { medium?: { url: string } } };
  }>;
}

interface YoutubeVideosResponse {
  items?: Array<{
    id: string;
    status?: {
      embeddable?: boolean;
      privacyStatus?: string;
    };
    contentDetails?: {
      contentRating?: { ytRating?: string };
    };
  }>;
}

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private readonly base = 'https://www.googleapis.com/youtube/v3';

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string {
    const key = this.config.get<string>('youtube.apiKey');
    if (!key) {
      throw new BusinessRuleViolationException(
        'La integración con YouTube no está configurada (falta YOUTUBE_API_KEY).',
      );
    }
    return key;
  }

  async search(query: string, maxResults = 10): Promise<YoutubeVideo[]> {
    try {
      const { data } = await axios.get<YoutubeSearchResponse>(`${this.base}/search`, {
        params: {
          key: this.apiKey,
          q: query,
          part: 'snippet',
          type: 'video',
          videoCategoryId: '10', // Música
          maxResults,
          safeSearch: 'moderate',
        },
        timeout: 8000,
      });

      return data.items
        .filter((i) => i.id?.videoId)
        .map((i) => ({
          youtubeId: i.id.videoId,
          title: i.snippet.title,
          channelTitle: i.snippet.channelTitle,
          thumbnail: i.snippet.thumbnails?.medium?.url ?? '',
          durationSeconds: null,
        }));
    } catch (error) {
      if (error instanceof BusinessRuleViolationException) throw error;
      this.logger.error(`Error consultando YouTube: ${(error as Error).message}`);
      throw new HttpException('No se pudo consultar YouTube.', 502);
    }
  }

  /** Valida si un video permite reproducción embebida (público, sin restricción de edad). */
  async isEmbeddable(videoId: string): Promise<boolean> {
    const statuses = await this.getVideoPlayability([videoId]);
    return statuses.get(videoId) ?? false;
  }

  /** Devuelve el video original si es embeddable; si no, busca una alternativa del mismo tema. */
  async resolveForPlayback(video: YoutubeVideo): Promise<YoutubeVideo | null> {
    if (await this.isEmbeddable(video.youtubeId)) return video;
    return this.findAlternativeVideo(video.title, video.channelTitle);
  }

  /** Busca una versión alternativa embeddable del mismo tema. */
  async findAlternativeVideo(title: string, artist?: string): Promise<YoutubeVideo | null> {
    const artistName = artist?.trim() ?? '';
    const queries = [
      `${title} ${artistName} lyric`.trim(),
      `${title} ${artistName} audio`.trim(),
      `${title} ${artistName} live`.trim(),
      `${title} ${artistName}`.trim(),
    ].filter((q) => q.length > 0);

    const seen = new Set<string>();

    for (const query of queries) {
      const results = await this.search(query, 8);
      const candidates = results.filter((r) => r.youtubeId && !seen.has(r.youtubeId));
      if (!candidates.length) continue;

      candidates.forEach((c) => seen.add(c.youtubeId));
      const playability = await this.getVideoPlayability(candidates.map((c) => c.youtubeId));

      for (const candidate of candidates) {
        if (playability.get(candidate.youtubeId)) return candidate;
      }
    }

    return null;
  }

  private async getVideoPlayability(videoIds: string[]): Promise<Map<string, boolean>> {
    const map = new Map<string, boolean>();
    const ids = [...new Set(videoIds.filter(Boolean))];
    if (!ids.length) return map;

    try {
      const { data } = await axios.get<YoutubeVideosResponse>(`${this.base}/videos`, {
        params: {
          key: this.apiKey,
          part: 'status,contentDetails',
          id: ids.join(','),
        },
        timeout: 8000,
      });

      for (const item of data.items ?? []) {
        const embeddable = item.status?.embeddable === true;
        const isPublic = item.status?.privacyStatus === 'public';
        const ageRestricted = item.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted';
        map.set(item.id, embeddable && isPublic && !ageRestricted);
      }
    } catch (error) {
      this.logger.warn(`No se pudo validar embeddable: ${(error as Error).message}`);
    }

    return map;
  }
}
