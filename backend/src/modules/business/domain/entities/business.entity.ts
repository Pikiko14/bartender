import { MusicProvider } from '@shared/enums/music-provider.enum';

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
}

export interface BusinessProps {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  cover: string | null;
  description: string | null;
  ownerId: string;
  active: boolean;
  subscriptionStatus: SubscriptionStatus;
  musicProvider: MusicProvider;
  spotifyUserId: string | null;
  spotifyDisplayName: string | null;
  spotifyAccessToken: string | null;
  spotifyRefreshToken: string | null;
  spotifyTokenExpiresAt: Date | null;
  spotifyDeviceId: string | null;
  spotifyConnectedAt: Date | null;
  spotifyLastSyncAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Business {
  constructor(private props: BusinessProps) {}

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get slug(): string {
    return this.props.slug;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get active(): boolean {
    return this.props.active;
  }
  get subscriptionStatus(): SubscriptionStatus {
    return this.props.subscriptionStatus;
  }
  get musicProvider(): MusicProvider {
    return this.props.musicProvider;
  }
  get spotifyUserId(): string | null {
    return this.props.spotifyUserId;
  }
  get spotifyDisplayName(): string | null {
    return this.props.spotifyDisplayName;
  }
  get spotifyAccessToken(): string | null {
    return this.props.spotifyAccessToken;
  }
  get spotifyRefreshToken(): string | null {
    return this.props.spotifyRefreshToken;
  }
  get spotifyTokenExpiresAt(): Date | null {
    return this.props.spotifyTokenExpiresAt;
  }
  get spotifyDeviceId(): string | null {
    return this.props.spotifyDeviceId;
  }
  get spotifyConnectedAt(): Date | null {
    return this.props.spotifyConnectedAt;
  }
  get spotifyLastSyncAt(): Date | null {
    return this.props.spotifyLastSyncAt;
  }

  update(
    partial: Partial<Pick<BusinessProps, 'name' | 'logo' | 'cover' | 'description' | 'active'>>,
  ): void {
    Object.assign(this.props, partial);
  }

  setMusicProvider(provider: MusicProvider): void {
    this.props.musicProvider = provider;
  }

  /** Guarda tokens OAuth (aunque falle después la lectura de /v1/me). */
  applySpotifyOAuthTokens(data: {
    spotifyAccessToken: string;
    spotifyRefreshToken: string;
    spotifyTokenExpiresAt: Date;
  }): void {
    this.props.spotifyAccessToken = data.spotifyAccessToken;
    this.props.spotifyRefreshToken = data.spotifyRefreshToken;
    this.props.spotifyTokenExpiresAt = data.spotifyTokenExpiresAt;
    this.props.spotifyConnectedAt = this.props.spotifyConnectedAt ?? new Date();
    this.props.spotifyLastSyncAt = new Date();
  }

  setSpotifyProfile(spotifyUserId: string, spotifyDisplayName: string | null): void {
    this.props.spotifyUserId = spotifyUserId;
    this.props.spotifyDisplayName = spotifyDisplayName;
    this.props.spotifyLastSyncAt = new Date();
  }

  setSpotifyConnection(data: {
    spotifyUserId: string;
    spotifyDisplayName: string | null;
    spotifyAccessToken: string;
    spotifyRefreshToken: string;
    spotifyTokenExpiresAt: Date;
  }): void {
    this.applySpotifyOAuthTokens({
      spotifyAccessToken: data.spotifyAccessToken,
      spotifyRefreshToken: data.spotifyRefreshToken,
      spotifyTokenExpiresAt: data.spotifyTokenExpiresAt,
    });
    this.setSpotifyProfile(data.spotifyUserId, data.spotifyDisplayName);
  }

  updateSpotifyTokens(data: {
    spotifyAccessToken: string;
    spotifyRefreshToken?: string;
    spotifyTokenExpiresAt: Date;
  }): void {
    this.props.spotifyAccessToken = data.spotifyAccessToken;
    if (data.spotifyRefreshToken) {
      this.props.spotifyRefreshToken = data.spotifyRefreshToken;
    }
    this.props.spotifyTokenExpiresAt = data.spotifyTokenExpiresAt;
    this.props.spotifyLastSyncAt = new Date();
  }

  setSpotifyDevice(deviceId: string | null): void {
    this.props.spotifyDeviceId = deviceId;
    this.props.spotifyLastSyncAt = new Date();
  }

  clearSpotifyConnection(): void {
    this.props.spotifyUserId = null;
    this.props.spotifyDisplayName = null;
    this.props.spotifyAccessToken = null;
    this.props.spotifyRefreshToken = null;
    this.props.spotifyTokenExpiresAt = null;
    this.props.spotifyDeviceId = null;
    this.props.spotifyConnectedAt = null;
    this.props.spotifyLastSyncAt = null;
    if (this.props.musicProvider === MusicProvider.SPOTIFY) {
      this.props.musicProvider = MusicProvider.YOUTUBE;
    }
  }

  isSpotifyConnected(): boolean {
    if (this.props.spotifyRefreshToken) return true;
    const expiresAt = this.props.spotifyTokenExpiresAt?.getTime() ?? 0;
    return !!this.props.spotifyAccessToken && expiresAt > Date.now();
  }

  setSubscription(status: SubscriptionStatus): void {
    this.props.subscriptionStatus = status;
  }

  isOperational(): boolean {
    return (
      this.props.active &&
      [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE].includes(this.props.subscriptionStatus)
    );
  }

  toPrimitives(): BusinessProps {
    return { ...this.props };
  }
}
