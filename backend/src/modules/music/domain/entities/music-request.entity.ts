export enum MusicRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PLAYING = 'playing',
  PLAYED = 'played',
  SKIPPED = 'skipped',
}

export interface MusicRequestProps {
  id: string;
  businessId: string;
  title: string;
  youtubeId: string;
  thumbnail: string | null;
  channelTitle: string | null;
  durationSeconds: number | null;
  requestedBy: string;
  status: MusicRequestStatus;
  priority: number;
  votes: number;
  voters: string[];
  playedAt: Date | null;
  createdAt?: Date;
}

export class MusicRequest {
  constructor(private props: MusicRequestProps) {}

  get id(): string {
    return this.props.id;
  }
  get businessId(): string {
    return this.props.businessId;
  }
  get status(): MusicRequestStatus {
    return this.props.status;
  }
  get youtubeId(): string {
    return this.props.youtubeId;
  }
  get priority(): number {
    return this.props.priority;
  }
  get votes(): number {
    return this.props.votes;
  }

  approve(): void {
    this.props.status = MusicRequestStatus.APPROVED;
  }
  reject(): void {
    this.props.status = MusicRequestStatus.REJECTED;
  }
  markPlaying(): void {
    this.props.status = MusicRequestStatus.PLAYING;
    this.props.playedAt = new Date();
  }
  markPlayed(): void {
    this.props.status = MusicRequestStatus.PLAYED;
  }
  skip(): void {
    this.props.status = MusicRequestStatus.SKIPPED;
  }
  setPriority(priority: number): void {
    this.props.priority = priority;
  }

  addVote(voter: string): boolean {
    if (this.props.voters.includes(voter)) return false;
    this.props.voters.push(voter);
    this.props.votes += 1;
    return true;
  }

  toPrimitives(): MusicRequestProps {
    return { ...this.props };
  }
}
