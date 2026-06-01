import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterSpotifySongDto {
  @IsString()
  sessionId!: string;

  @IsString()
  @MaxLength(80)
  spotifyId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  artist?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  album?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  durationSeconds?: number;
}

export class SpotifySearchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  q!: string;
}

export class RegisterSpotifyDeviceDto {
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  deviceId!: string;
}

export class UpdateMusicProviderDto {
  @IsString()
  musicProvider!: 'YOUTUBE' | 'SPOTIFY';
}
