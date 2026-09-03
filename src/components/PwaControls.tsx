import { useEffect, useMemo, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandaloneMode() {
  return window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function PwaControls() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandaloneMode());
  const statusLabel = online ? 'オンライン' : 'オフライン';
  const statusClass = online ? 'online' : 'offline';
  const installable = useMemo(() => !installed && installPrompt !== null, [installed, installPrompt]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const requestInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === 'accepted') setInstalled(true);
  };

  return (
    <div className="pwa-controls" aria-label="PWA状態">
      <span
        className={`connection-badge ${statusClass}`}
        aria-label={`接続状態: ${statusLabel}`}
        aria-live="polite"
      >
        {statusLabel}
      </span>
      {installable && (
        <button type="button" className="install-button" onClick={() => void requestInstall()}>
          アプリをインストール
        </button>
      )}
      {installed && <span className="installed-badge">インストール済み</span>}
    </div>
  );
}
