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

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;
  const showCover = notStarted || playerState === STATE_ENDED;
  const controlButton =
    'flex shrink-0 items-center justify-center rounded-full p-2 text-background transition-colors hover:bg-background/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40';

  return (
    <div
      ref={wrapperRef}
      className={
        isCssFullscreen
          ? 'fixed inset-0 z-[100] flex flex-col bg-black'
          : expanded
            ? 'flex flex-col bg-black'
            : 'relative flex w-full flex-col overflow-hidden rounded-2xl bg-foreground shadow-xl ring-1 ring-foreground/10'
      }
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className={expanded ? 'flex min-h-0 w-full flex-1 items-center justify-center' : 'w-full'}>
        <div
          className="relative aspect-video w-full overflow-hidden bg-black"
          style={expanded ? { width: 'min(100%, calc((100dvh - 4.5rem) * 16 / 9))' } : undefined}
        >
          {/* The iframe is three times taller than the visible frame. YouTube
              letterboxes the video in the middle third and draws its own
              chrome (title, copy link, "More videos", logo) at the iframe's
              top and bottom edges, which stay clipped out of view. */}
          <div
            ref={mountRef}
            className="pointer-events-none absolute inset-x-0 top-[-100%] h-[300%] [&>iframe]:h-full [&>iframe]:w-full"
            title={title}
          />

          {/* Covers the whole iframe so nothing inside YouTube's player can be
              clicked or right-clicked. */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? t('courses.player.pause', 'Pause') : t('courses.player.play', 'Play')}
            className={`group absolute inset-0 flex items-center justify-center bg-cover bg-center transition-colors duration-300 focus:outline-none ${
              isPlaying ? 'cursor-default bg-transparent' : showCover ? 'bg-foreground' : 'bg-foreground/60'
            }`}
            style={showCover ? { backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)` } : undefined}
          >
            {showCover && <span className="absolute inset-0 bg-foreground/40" />}
            {!isPlaying && (
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background/20 transition-transform duration-200 group-hover:scale-105 group-focus-visible:ring-background sm:h-20 sm:w-20">
                <Play className="ml-1 h-6 w-6 sm:h-8 sm:w-8" fill="currentColor" />
              </span>
            )}
          </button>

          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/90 p-6 text-center text-sm text-background">
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
      </div>

      <div className="shrink-0 bg-foreground px-3 pb-1.5 pt-3 sm:px-4">
        <div className="relative flex h-3 items-center">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/20">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full bg-background shadow"
            style={{ left: `${progress}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seek(Number(event.target.value))}
            disabled={!isReady || !duration}
            aria-label={t('courses.player.seek', 'Video position')}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
          />
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={togglePlay}
              disabled={!isReady}
              aria-label={isPlaying ? t('courses.player.pause', 'Pause') : t('courses.player.play', 'Play')}
              className={controlButton}
            >
              {isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              disabled={!isReady}
              aria-label={isMuted ? t('courses.player.unmute', 'Unmute') : t('courses.player.mute', 'Mute')}
              className={controlButton}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <span className="ml-1 shrink-0 text-xs tabular-nums text-background/80 sm:text-sm">
              {formatTime(currentTime)} <span className="text-background/40">/</span> {formatTime(duration)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            aria-label={expanded ? t('courses.player.exitFullscreen', 'Exit full screen') : t('courses.player.fullscreen', 'Full screen')}
            className={`${controlButton} gap-2 text-sm sm:px-3`}
          >
            {expanded ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            <span className="hidden sm:inline">
              {expanded ? t('courses.player.exitFullscreen', 'Exit full screen') : t('courses.player.fullscreen', 'Full screen')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
