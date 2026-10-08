import { useEffect, useState } from 'react';

/** Fired by sign-out so the monitors stop at once rather than on the next poll. */
export const AUTH_CHANGED = 'authChanged';

/**
 * The id of whoever is signed in, kept in step with localStorage.
 *
 * The order monitor used to read this once, when the app started. Nothing ever
 * re-read it, so notifications never began for someone who signed in afterwards
 * -- they had to close the app and open it again -- and after a sign-out the
 * polling carried on under the previous customer's id until the app was killed.
 *
 * This watches the value instead of reading it once. It does not depend on
 * every sign-in site remembering to announce itself: it re-reads on focus, on
 * the window becoming visible, on a storage event from another tab, and on a
 * slow timer as a backstop. Sign-out dispatches AUTH_CHANGED so it is immediate.
 */
export const useAuthId = (key = 'customerId'): string | null => {
  const [id, setId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const read = () => {
      let next: string | null = null;
      try {
        next = localStorage.getItem(key);
      } catch {
        next = null;
      }
      setId((prev) => (prev === next ? prev : next));
    };

    read();
    window.addEventListener(AUTH_CHANGED, read);
    window.addEventListener('storage', read);
    window.addEventListener('focus', read);
    document.addEventListener('visibilitychange', read);
    const timer = setInterval(read, 3000);

    return () => {
      window.removeEventListener(AUTH_CHANGED, read);
      window.removeEventListener('storage', read);
      window.removeEventListener('focus', read);
      document.removeEventListener('visibilitychange', read);
      clearInterval(timer);
    };
  }, [key]);

  return id;
};
