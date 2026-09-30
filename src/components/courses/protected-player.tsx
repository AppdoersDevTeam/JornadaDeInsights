import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

interface YTPlayer {
  cueVideoById: (videoId: string) => void;
  destroy: () => void;
}

interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      host?: string;
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: { onReady?: () => void; onError?: (event: { data: number }) => void };
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

  const stamp = `${watermark} · ${new Date().toLocaleDateString(language === 'en' ? 'en' : 'pt-BR')}`;

  // Create the player once; later lessons are cued into the same iframe.
  useEffect(() => {
    let cancelled = false;
    if (playerRef.current) {
      playerRef.current.cueVideoById(videoId);
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
          playerVars: {
            rel: 0,
            fs: 0,
            disablekb: 1,
            iv_load_policy: 3,
            playsinline: 1,
            modestbranding: 1,
            origin: window.location.origin,
          },
          events: {
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

      <div className="flex h-10 shrink-0 items-center justify-between gap-3 bg-black px-3 text-xs text-white/70">
        <span className="truncate">{title}</span>
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
