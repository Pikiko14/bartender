import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SearchMusicDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  q!: string;
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

export class SetPriorityDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  priority!: number;
}
