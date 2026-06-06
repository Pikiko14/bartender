import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SearchMusicDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  q!: string;

  /** Si se indica, la búsqueda usa Spotify o YouTube según el proveedor del negocio. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  businessSlug?: string;
}

export class RequestSongDto {
  @IsString()
  sessionId!: string;

  @IsString()
  @MaxLength(20)
  youtubeId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsString()
  channelTitle?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSeconds?: number;
}

export class VoteSongDto {
  @IsString()
  sessionId!: string;
}

export class FindAlternativeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  artist?: string;
}

export class SetPriorityDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  priority!: number;
}

export class EnqueueSongDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  youtubeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  spotifyId?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsString()
  channelTitle?: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  album?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSeconds?: number;
}

export class EnqueuePlaylistDto {
  @IsString()
  @MaxLength(200)
  playlistId!: string;

  @IsOptional()
  @IsBoolean()
  playNow?: boolean;
}

export class UpdatePlaybackSourceDto {
  @IsString()
  @MaxLength(20)
  youtubeId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  thumbnail?: string | null;

  @IsOptional()
  @IsString()
  channelTitle?: string | null;
}
