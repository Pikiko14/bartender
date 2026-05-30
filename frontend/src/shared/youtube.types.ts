/** Tipos mínimos para YouTube Iframe API. */
export interface YoutubePlayerTrack {
  id: string;
  youtubeId: string;
  title: string;
}

export interface YoutubePlayerInstance {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  mute(): void;
  unMute(): void;
  cueVideoById(videoId: string, startSeconds?: number): void;
  loadVideoById(videoId: string, startSeconds?: number): void;
  getPlayerState(): number;
  getCurrentTime(): number;
  getDuration(): number;
  getVideoData(): { video_id: string };
  setSize?(width: number, height: number): void;
  getIframe?(): HTMLIFrameElement;
  destroy(): void;
}

export interface YoutubePlayerOptions {
  videoId?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YoutubePlayerInstance }) => void;
    onStateChange?: (event: { data: number; target: YoutubePlayerInstance }) => void;
    onError?: (event: { data: number; target: YoutubePlayerInstance }) => void;
  };
}

export interface YoutubePlayerConstructor {
  new (elementId: string, options: YoutubePlayerOptions): YoutubePlayerInstance;
}

export const YT_PLAYER_STATE = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

declare global {
  interface Window {
    YT?: {
      Player: YoutubePlayerConstructor;
      loaded?: number;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export {};
