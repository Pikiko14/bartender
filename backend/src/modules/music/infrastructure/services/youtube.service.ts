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
}
