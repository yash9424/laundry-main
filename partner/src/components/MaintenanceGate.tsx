'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { API_URL } from '@/config/api';

/**
 * The whole Captain app, behind the same switch as the customer app.
 *
 * Admin → Settings → App availability writes `appMaintenanceMode` onto the
 * order-charges document, which both apps already read. When it is on, a
 * Captain sees this one screen rather than a pickup list they cannot act on.
 *
 * It fails open: a failed or slow request leaves the app working, so a weak
 * signal on the road never looks like a shutdown.
 */
const POLL_MS = 60000;

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  const [title, setTitle] = useState("We'll be right back");
  const [message, setMessage] = useState(
    'Urban Steam is briefly unavailable while we carry out scheduled maintenance. Please try again shortly.'
  );

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(`${API_URL}/api/order-charges`, { signal: controller.signal });
        clearTimeout(timeout);
        const data = await response.json();
        if (cancelled || !data?.success || !data.data) return;
        setOn(data.data.appMaintenanceMode === true);
        if (data.data.appMaintenanceTitle) setTitle(data.data.appMaintenanceTitle);
        if (data.data.appMaintenanceMessage) setMessage(data.data.appMaintenanceMessage);
      } catch {
        // Fail open.
      }
    };

    check();
    const interval = setInterval(check, POLL_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  if (!on) return <>{children}</>;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
      >
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" strokeLinecap="round" />
        </svg>
      </div>

      <h1
        className="text-2xl font-bold mb-3"
        style={{
          background: 'linear-gradient(to right, #452D9B, #07C8D0)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {title}
      </h1>

      <p className="text-sm text-gray-600 max-w-xs leading-relaxed mb-8">{message}</p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="h-12 px-8 rounded-2xl text-white text-sm font-semibold shadow-lg"
        style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
      >
        Try again
      </button>

      <p className="text-xs text-gray-400 mt-6">Your assigned orders are safe.</p>
    </div>
  );
}
