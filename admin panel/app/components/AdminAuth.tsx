'use client';

import { useEffect } from 'react';

/**
 * Attaches the administrator's token to every call the panel makes.
 *
 * Each of the twenty-one screens writes its own fetch inline, so adding a
 * header at every call site would mean editing all of them and would quietly
 * miss whichever one was added next. Patching fetch once covers every call,
 * including ones written after this.
 *
 * It only touches calls to this site's own /api routes. Anything else -- a
 * map tile, a font, an upload to somewhere else -- goes out untouched, so the
 * token cannot leak to a third party.
 *
 * A 401 means the session has ended: the stored token is cleared and the
 * panel returns to the sign-in screen rather than leaving someone clicking
 * buttons that silently do nothing.
 */
export default function AdminAuth() {
  useEffect(() => {
    const original = window.fetch;
    if ((window as unknown as { __adminAuthPatched?: boolean }).__adminAuthPatched) return;
    (window as unknown as { __adminAuthPatched?: boolean }).__adminAuthPatched = true;

    const ourApi = (input: RequestInfo | URL): boolean => {
      try {
        const url = new URL(
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
          window.location.origin
        );
        return url.origin === window.location.origin && url.pathname.startsWith('/api/');
      } catch {
        return false;
      }
    };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!ourApi(input)) return original(input, init);

      let token = '';
      try {
        token = localStorage.getItem('adminToken') || '';
      } catch {
        // storage blocked; fall through without a token
      }

      const next: RequestInit = { ...(init || {}) };
      if (token) {
        const headers = new Headers(next.headers || (input instanceof Request ? input.headers : undefined));
        if (!headers.has('authorization')) headers.set('Authorization', `Bearer ${token}`);
        next.headers = headers;
      }

      const response = await original(input, next);

      if (response.status === 401 && !window.location.pathname.startsWith('/admin/login')) {
        try {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
        } catch {
          // nothing to clear
        }
        window.location.href = '/admin/login';
      }

      return response;
    };

    return () => {
      window.fetch = original;
      (window as unknown as { __adminAuthPatched?: boolean }).__adminAuthPatched = false;
    };
  }, []);

  return null;
}
