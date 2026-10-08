'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePartnerOrderMonitor } from '@/hooks/usePartnerOrderMonitor';

export default function OrderMonitor() {
  usePartnerOrderMonitor();
  const router = useRouter();

  // Tapping a notification opens the screen it is about. Nothing listened for
  // the tap before, so a captain who tapped "New Order Available" landed on
  // whatever screen the app happened to be on.
  useEffect(() => {
    let remove: (() => void) | undefined;
    (async () => {
      if (!(window as any).Capacitor?.isNativePlatform()) return;
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const handle = await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (action) => {
          const screen = action.notification?.extra?.screen;
          if (screen) router.push(screen);
        }
      );
      remove = () => handle.remove();
    })();
    return () => remove?.();
  }, [router]);

  return null;
}
