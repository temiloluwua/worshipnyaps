import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

type DeepLinkHandler = (data: Record<string, unknown>) => void;

interface UseDevicePushOptions {
  onNotificationOpened?: DeepLinkHandler;
}

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev';

export function useDevicePush(options: UseDevicePushOptions = {}) {
  const { user } = useAuth();
  const registered = useRef(false);
  const handlerRef = useRef<DeepLinkHandler | undefined>(options.onNotificationOpened);

  useEffect(() => {
    handlerRef.current = options.onNotificationOpened;
  }, [options.onNotificationOpened]);

  useEffect(() => {
    if (!user || registered.current) return;
    if (!Capacitor.isNativePlatform()) return;

    registered.current = true;
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== 'granted') return;

        await PushNotifications.register();

        const tokenListener = await PushNotifications.addListener('registration', async (token: Token) => {
          const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : Capacitor.getPlatform() === 'android' ? 'android' : 'web';
          try {
            const { error } = await supabase
              .from('user_devices')
              .upsert(
                {
                  user_id: user.id,
                  token: token.value,
                  platform,
                  app_version: APP_VERSION,
                  notifications_enabled: true,
                  last_seen_at: new Date().toISOString(),
                },
                { onConflict: 'token' }
              );
            if (error) console.warn('Failed to save device token:', error);
          } catch (err) {
            console.warn('Device token upsert threw:', err);
          }
        });

        const errorListener = await PushNotifications.addListener('registrationError', (err) => {
          console.warn('Push registration error:', err);
        });

        // Foreground notification — surface as a toast or in-app banner via handler.
        const receivedListener = await PushNotifications.addListener(
          'pushNotificationReceived',
          (n: PushNotificationSchema) => {
            // For now we just log; UI handling is per-feature.
            console.log('Push received (foreground):', n);
          }
        );

        // User tapped a notification — route to relevant screen via callback.
        const actionListener = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action: ActionPerformed) => {
            const data = action.notification.data ?? {};
            handlerRef.current?.(data);
          }
        );

        cleanup = () => {
          tokenListener.remove();
          errorListener.remove();
          receivedListener.remove();
          actionListener.remove();
        };
      } catch (err) {
        console.warn('useDevicePush init failed:', err);
      }
    })();

    return () => {
      cleanup?.();
      registered.current = false;
    };
  }, [user]);
}
