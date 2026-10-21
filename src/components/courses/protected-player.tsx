import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

interface YTPlayer {
  cueVideoById: (videoId: string) => void;
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  mute: () => void;
  unMute: () => void;
}

// YT.PlayerState values.
const STATE_ENDED = 0;
const STATE_PLAYING = 1;
const STATE_BUFFERING = 3;
const STATE_UNSTARTED = -1;
const STATE_CUED = 5;

interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      host?: string;
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onError?: (event: { data: number }) => void;
        onStateChange?: (event: { data: number }) => void;
      };
    }
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let iframeApiPromise: Promise<YTNamespace> | null = null;

const loadIframeApi = (): Promise<YTNamespace> => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (iframeApiPromise) return iframeApiPromise;

  iframeApiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      iframeApiPromise = null;
      reject(new Error('Failed to load the YouTube player'));
    };
    document.head.appendChild(script);
  });
  return iframeApiPromise;
};

// Watermark stays inside this box (percent of the player) so it never covers
// YouTube's title bar, logo, or control bar.
const SAFE_ZONE = { top: 14, bottom: 68, left: 4, right: 62 };
const MOVE_EVERY_MS = 7000;

const randomPosition = () => ({
  top: SAFE_ZONE.top + Math.random() * (SAFE_ZONE.bottom - SAFE_ZONE.top),
  left: SAFE_ZONE.left + Math.random() * (SAFE_ZONE.right - SAFE_ZONE.left),
});

type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

const canUseElementFullscreen = (element: FullscreenElement | null): boolean =>
  Boolean(element && (element.requestFullscreen || element.webkitRequestFullscreen)) &&
  // iPhone Safari exposes the API on video elements only.
  !/iPhone|iPod/.test(navigator.userAgent);

const formatTime = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

interface ProtectedPlayerProps {
  videoId: string;
  watermark: string;
  title: string;
}

export function ProtectedPlayer({ videoId, watermark, title }: ProtectedPlayerProps) {
  const { t, language } = useLanguage();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [position, setPosition] = useState(randomPosition);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isCssFullscreen, setIsCssFullscreen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [playerState, setPlayerState] = useState(STATE_UNSTARTED);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const isPlaying = playerState === STATE_PLAYING || playerState === STATE_BUFFERING;
  const notStarted = playerState === STATE_UNSTARTED || playerState === STATE_CUED;

  const stamp = `${watermark} · ${new Date().toLocaleDateString(language === 'en' ? 'en' : 'pt-BR')}`;

  // Create the player once; later lessons are cued into the same iframe.
  useEffect(() => {
    let cancelled = false;
    if (playerRef.current) {
      playerRef.current.cueVideoById(videoId);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    loadIframeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return;
        const target = document.createElement('div');
        mountRef.current.appendChild(target);
        playerRef.current = new YT.Player(target, {
          host: 'https://www.youtube-nocookie.com',
          videoId,
          width: '100%',
          height: '100%',
          // YouTube's own controls include "copy link" / share and title links,
          // so they are disabled and replaced by our controls below.
          playerVars: {
            controls: 0,
            rel: 0,
            fs: 0,
            disablekb: 1,
            iv_load_policy: 3,
            playsinline: 1,
            modestbranding: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => setIsReady(true),
            onStateChange: (event) => {
              setPlayerState(event.data);
              const player = playerRef.current;
              if (!player) return;
              setDuration(player.getDuration() || 0);
              setCurrentTime(event.data === STATE_ENDED ? player.getDuration() || 0 : player.getCurrentTime() || 0);
            },
            onError: () => setLoadError(t('courses.player.error', 'This lesson could not be played. Please try again later.')),
          },
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError(t('courses.player.error', 'This lesson could not be played. Please try again later.'));
      });

    return () => {
      cancelled = true;
    };
    // videoId changes are handled by the cue branch above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(
    () => () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    },
    []
  );

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      setCurrentTime(player.getCurrentTime() || 0);
      setDuration(player.getDuration() || 0);
    }, 500);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player || !isReady) return;
    if (isPlaying) {
      player.pauseVideo();
    } else {
      if (playerState === STATE_ENDED) player.seekTo(0, true);
      player.playVideo();
    }
  }, [isPlaying, isReady, playerState]);

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player || !isReady) return;
    if (isMuted) player.unMute();
    else player.mute();
    setIsMuted(!isMuted);
  }, [isMuted, isReady]);

  const seek = useCallback(
    (seconds: number) => {
      const player = playerRef.current;
      if (!player || !isReady) return;
      player.seekTo(seconds, true);
      setCurrentTime(seconds);
    },
    [isReady]
  );

  useEffect(() => {
    const timer = window.setInterval(() => setPosition(randomPosition()), MOVE_EVERY_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const doc = document as FullscreenDocument;
    const onChange = () =>
      setIsNativeFullscreen(Boolean((doc.fullscreenElement || doc.webkitFullscreenElement) === wrapperRef.current));
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  useEffect(() => {
    if (!isCssFullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCssFullscreen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isCssFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    const wrapper = wrapperRef.current as FullscreenElement | null;
    const doc = document as FullscreenDocument;
    if (isCssFullscreen) {
      setIsCssFullscreen(false);
      return;
    }
    if (isNativeFullscreen) {
      await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
      return;
    }
    if (wrapper && canUseElementFullscreen(wrapper)) {
      try {
        await (wrapper.requestFullscreen?.() ?? wrapper.webkitRequestFullscreen?.());
        return;
      } catch {
        // Fall through to the CSS mode.
      }
    }
    setIsCssFullscreen(true);
  }, [isCssFullscreen, isNativeFullscreen]);

  const expanded = isNativeFullscreen || isCssFullscreen;

  return (
    <div
      ref={wrapperRef}
      className={
        isCssFullscreen
          ? 'fixed inset-0 z-[100] flex flex-col bg-black'
          : expanded
            ? 'flex flex-col bg-black'
            : 'relative flex w-full flex-col overflow-hidden rounded-lg bg-black'
      }
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className={expanded ? 'relative w-full flex-1 min-h-0' : 'relative w-full aspect-video'}>
        <div ref={mountRef} className="absolute inset-0 [&>iframe]:w-full [&>iframe]:h-full" title={title} />

        {/* Sits over the whole iframe so nothing inside YouTube's player
            (copy link, title link, logo, end-screen videos) can be clicked. */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? t('courses.player.pause', 'Pause') : t('courses.player.play', 'Play')}
          className={`absolute inset-0 flex items-center justify-center bg-cover bg-center focus:outline-none ${
            isPlaying ? 'cursor-default bg-transparent' : notStarted || playerState === STATE_ENDED ? 'bg-black' : 'bg-black/70'
          }`}
          style={
            notStarted || playerState === STATE_ENDED
              ? { backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)` }
              : undefined
          }
        >
          {!isPlaying && (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/30">
              <Play className="ml-1 h-8 w-8" fill="currentColor" />
            </span>
          )}
        </button>

        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center text-sm text-white">
            {loadError}
          </div>
        )}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute select-none whitespace-nowrap rounded px-2 py-1 text-[11px] sm:text-sm font-medium text-white/60 bg-black/20 transition-all duration-[1500ms] ease-in-out"
          style={{ top: `${position.top}%`, left: `${position.left}%` }}
        >
          {stamp}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 bg-black px-3 pt-2">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => seek(Number(event.target.value))}
          disabled={!isReady || !duration}
          aria-label={t('courses.player.seek', 'Video position')}
          className="h-1 w-full cursor-pointer accent-white disabled:cursor-default"
        />
      </div>

      <div className="flex h-10 shrink-0 items-center justify-between gap-3 bg-black px-3 text-xs text-white/70">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!isReady}
            aria-label={isPlaying ? t('courses.player.pause', 'Pause') : t('courses.player.play', 'Play')}
            className="shrink-0 rounded-md p-1.5 text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            disabled={!isReady}
            aria-label={isMuted ? t('courses.player.unmute', 'Unmute') : t('courses.player.mute', 'Mute')}
            className="shrink-0 rounded-md p-1.5 text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <span className="shrink-0 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <span className="ml-2 hidden truncate sm:inline">{title}</span>
        </div>
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {expanded ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          <span>{expanded ? t('courses.player.exitFullscreen', 'Exit full screen') : t('courses.player.fullscreen', 'Full screen')}</span>
        </button>
      </div>
    </div>
  );
}
