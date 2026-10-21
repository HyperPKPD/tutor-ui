import { useCallback, useEffect, useState } from 'react';

/** Chrome / Edge / Samsung Internet fire this when the app can be installed. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState =
  | { kind: 'installed' }                      // already running as an installed app
  | { kind: 'prompt'; install: () => Promise<void> } // browser can install it with one click
  | { kind: 'manual'; hint: string }           // Safari etc.: no prompt API, show instructions
  | { kind: 'unavailable' };

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: window-controls-overlay)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Instructions for browsers that cannot show an install prompt themselves. */
function manualHint(): string | null {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
  if (iOS) return 'Tap the Share button, then “Add to Home Screen”.';
  if (safari && /Macintosh/.test(ua)) return 'In the Safari menu bar choose File → Add to Dock.';
  return null;
}

export function useInstallPrompt(): InstallState {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => typeof window !== 'undefined' && isStandalone());

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setEvent(null); };
    const mq = window.matchMedia('(display-mode: standalone)');
    const onMode = () => setInstalled(isStandalone());
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    mq.addEventListener('change', onMode);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      mq.removeEventListener('change', onMode);
    };
  }, []);

  const install = useCallback(async () => {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setEvent(null); // a prompt event can only be used once
  }, [event]);

  if (installed) return { kind: 'installed' };
  if (event) return { kind: 'prompt', install };
  const hint = manualHint();
  return hint ? { kind: 'manual', hint } : { kind: 'unavailable' };
}
