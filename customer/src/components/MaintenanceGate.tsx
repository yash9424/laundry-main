import { useEffect, useState, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { API_URL } from "@/config/api";
import logo from "@/assets/LOGO MARK GRADIENT.png";

/**
 * The whole app, behind one switch.
 *
 * Admin → Settings → App availability writes `appMaintenanceMode` onto the
 * order-charges document, which is the one piece of configuration both apps
 * already read. When it is on, every customer sees this single screen instead
 * of the app: nobody can start a booking that the server is in no state to
 * take, and nobody is left halfway through one.
 *
 * It fails open on purpose. If the request errors, times out or the phone is
 * simply offline, the app carries on as normal — a flaky connection must never
 * look like a shutdown.
 */
const POLL_MS = 60000;

/** Which build this is, so it can find its own switch.
 *
 * The build mode is fixed when the bundle is built -- `build:debug` runs Vite
 * in development mode -- so it says which command produced the bundle, not
 * whether the APK wrapping it is natively debuggable. Anything that is not
 * explicitly a development build is treated as release: a build that took some
 * other route must not exempt itself from the switch real users are under.
 */
const PLATFORM = Capacitor.getPlatform();
const IS_DEBUG_BUILD = import.meta.env.MODE === "development";

/** True when this particular build is the one being taken offline. */
const blockedByA = (c: Record<string, unknown>): boolean => {
  if (c.appMaintenanceMode === true) return true;
  if (PLATFORM === "ios") return c.maintenanceCustomerIos === true;
  if (PLATFORM === "android") {
    return IS_DEBUG_BUILD
      ? c.maintenanceCustomerAndroidDebug === true
      : c.maintenanceCustomerAndroidRelease === true;
  }
  return false;
};

interface Maintenance {
  on: boolean;
  title: string;
  message: string;
}

const MaintenanceGate = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<Maintenance>({ on: false, title: "", message: "" });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      // Nothing to check while the app is in the background.
      if (document.hidden) return;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(`${API_URL}/api/order-charges`, { signal: controller.signal });
        clearTimeout(timeout);
        const data = await response.json();
        if (cancelled || !data?.success || !data.data) return;
        setState({
          on: blockedByA(data.data),
          title: data.data.appMaintenanceTitle || "We'll be right back",
          message:
            data.data.appMaintenanceMessage ||
            "Urban Steam is briefly unavailable while we carry out scheduled maintenance. Please try again shortly.",
        });
      } catch {
        // Fail open: a failed check never takes the app down.
      }
    };

    check();
    const interval = setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  if (!state.on) return <>{children}</>;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10 text-center safe-top">
      <img src={logo} alt="Urban Steam" className="w-28 h-28 object-contain mb-8" />

      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: "linear-gradient(to right, #452D9B, #07C8D0)" }}
      >
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" strokeLinecap="round" />
        </svg>
      </div>

      <h1
        className="text-2xl font-bold mb-3"
        style={{
          background: "linear-gradient(to right, #452D9B, #07C8D0)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {state.title}
      </h1>

      <p className="text-sm text-gray-600 max-w-xs leading-relaxed mb-8">{state.message}</p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="h-12 px-8 rounded-2xl text-white text-sm font-semibold shadow-lg"
        style={{ background: "linear-gradient(to right, #452D9B, #07C8D0)" }}
      >
        Try again
      </button>

      <p className="text-xs text-gray-400 mt-6">Your cart and your orders are safe.</p>
    </div>
  );
};

export default MaintenanceGate;
