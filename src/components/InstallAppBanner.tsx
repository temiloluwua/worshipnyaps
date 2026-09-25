import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { X, Smartphone } from 'lucide-react';
import { openAppStore } from '../lib/appStore';
import { T } from './ui/T';

// Recurring nudge for people using the site in a browser: a dismissible bottom
// banner pointing at the App Store. It's not native-only (Apple's Smart App
// Banner covers iOS Safari); this reaches Android/desktop/other browsers too.
// Dismissing hides it for a cooldown so it re-encourages later without nagging.
const DISMISS_KEY = 'wny_install_banner_dismissed_at';
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // reappear 3 days after a dismissal

export const InstallAppBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Inside the native app there is nothing to install.
    if (Capacitor.isNativePlatform()) return;
    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY)) || 0;
    } catch {
      dismissedAt = 0;
    }
    if (Date.now() - dismissedAt < COOLDOWN_MS) return;
    // Small delay so it doesn't fight the splash → first-paint hand-off.
    const t = window.setTimeout(() => setVisible(true), 1500);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Private mode / storage blocked — just hide for this session.
    }
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Get the Worship N Yaps app"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            <T>Get the Worship N Yaps app</T>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            <T>Faster, with notifications for events and messages.</T>
          </p>
        </div>
        <button
          onClick={openAppStore}
          className="shrink-0 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors touch-manipulation"
        >
          <T>Get app</T>
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
