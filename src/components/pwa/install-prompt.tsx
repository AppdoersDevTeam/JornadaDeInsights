import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/language-context';

const DISMISSED_KEY = 'pwa-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isAndroid() {
  return /android/i.test(window.navigator.userAgent);
}

// Restrict the install prompt to phones/tablets — desktop Chrome/Edge also
// fire beforeinstallprompt, but an install nudge isn't useful on laptops.
function isMobileOrTablet() {
  return isIos() || isAndroid();
}

export function InstallPrompt() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (
      isStandalone() ||
      localStorage.getItem(DISMISSED_KEY) === 'true' ||
      !isMobileOrTablet()
    ) {
      return;
    }

    if (isIos()) {
      setShowIosBanner(true);
      return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosBanner(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(DISMISSED_KEY, 'true');
    }
    setDeferredPrompt(null);
  };

  if (dismissed || (!deferredPrompt && !showIosBanner)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border bg-background p-4 shadow-lg sm:left-auto sm:right-4">
      {showIosBanner ? (
        <>
          <Share className="h-6 w-6 shrink-0 text-primary" />
          <p className="flex-1 text-sm">
            {t(
              'pwa.installIos',
              'Instale este app: toque em Compartilhar e depois em "Adicionar à Tela de Início".'
            )}
          </p>
        </>
      ) : (
        <>
          <Download className="h-6 w-6 shrink-0 text-primary" />
          <p className="flex-1 text-sm">
            {t('pwa.installPrompt', 'Instale o app Jornada de Insights no seu dispositivo.')}
          </p>
          <Button size="sm" onClick={handleInstall}>
            {t('pwa.install', 'Instalar')}
          </Button>
        </>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('pwa.dismiss', 'Fechar')}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
