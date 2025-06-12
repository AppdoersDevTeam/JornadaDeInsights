// Device detection utilities for better cross-platform compatibility

export const isIOSDevice = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isSafariBrowser = (): boolean => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Check if device needs iOS-specific video handling
export const needsIOSVideoFix = (): boolean => {
  return isIOSDevice() || isSafariBrowser();
};

// Get YouTube embed URL with device-specific parameters
export const getYouTubeEmbedUrl = (videoId: string, options: {
  autoplay?: boolean;
  controls?: boolean;
  modestbranding?: boolean;
  rel?: boolean;
  language?: string;
} = {}): string => {
  const baseUrl = `https://www.youtube.com/embed/${videoId}`;
  const params = new URLSearchParams();
  
  // Default parameters
  if (options.language) params.set('hl', options.language);
  if (options.controls !== false) params.set('controls', '1');
  if (options.modestbranding !== false) params.set('modestbranding', '1');
  if (options.rel !== true) params.set('rel', '0');
  
  // iOS-specific parameters
  if (needsIOSVideoFix()) {
    params.set('playsinline', '1');
    // Don't set autoplay for iOS as it's blocked by default
    if (options.autoplay && !isIOSDevice()) {
      params.set('autoplay', '1');
    }
  } else {
    if (options.autoplay) params.set('autoplay', '1');
  }
  
  return `${baseUrl}?${params.toString()}`;
};

// Enhanced iframe load handler for iOS
export const handleIframeLoad = (iframe: HTMLIFrameElement): void => {
  if (needsIOSVideoFix() && iframe.contentWindow) {
    // Try to trigger play after iframe loads on iOS
    setTimeout(() => {
      try {
        iframe.contentWindow?.postMessage(
          '{"event":"command","func":"playVideo","args":""}', 
          '*'
        );
      } catch (err) {
        console.debug('YouTube API interaction error:', err);
      }
    }, 1000);
  }
};

// Force reload iframe for iOS compatibility
export const reloadIframeForIOS = (delay = 500): void => {
  if (needsIOSVideoFix()) {
    setTimeout(() => {
      const iframes = document.querySelectorAll('iframe[src*="youtube.com/embed"]');
      iframes.forEach(iframe => {
        if (iframe instanceof HTMLIFrameElement) {
          const src = iframe.src;
          iframe.src = '';
          setTimeout(() => {
            iframe.src = src;
          }, 100);
        }
      });
    }, delay);
  }
}; 