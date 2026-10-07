'use client';

import { useEffect, useRef, useState } from 'react';
import { hasCoordinates, directionsUrl } from '@/utils/mapLinks';

type Destination = {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
} | null | undefined;

interface Props {
  destination: Destination;
  label?: string;
  customerName?: string;
}

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const SCRIPT_ID = 'google-maps-js';

// Re-asking Google for the route on every GPS tick would burn quota for nothing.
// A new route is only worth fetching once the captain has actually moved on.
const REROUTE_AFTER_METRES = 120;
const REROUTE_AFTER_MS = 20000;

function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if ((window as any).google?.maps) return Promise.resolve();
  if (!MAPS_KEY) return Promise.reject(new Error('Maps key missing'));

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Maps failed to load')));
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=geometry`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Maps failed to load'));
    document.head.appendChild(script);
  });
}

function metresBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const readableDistance = (m: number) =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

/** Strips the HTML Google wraps around each turn instruction. */
const plainText = (html: string) =>
  html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Live navigation for the captain: the customer's pin, the captain's own position
 * as it moves, and the route along the roads between them with the distance, the
 * time and the next turn.
 *
 * The captain previously got nothing but a link out to Google Maps, so there was
 * no sense of how far the stop was or which way to set off.
 */
const LiveNavigationMap = ({ destination, label = 'Customer location', customerName }: Props) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const meRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const serviceRef = useRef<any>(null);
  const fallbackLineRef = useRef<any>(null);
  const watchRef = useRef<number | null>(null);
  const lastRouteFrom = useRef<{ lat: number; lng: number } | null>(null);
  const lastRouteAt = useRef(0);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState(false);
  const [route, setRoute] = useState<{ distance: string; duration: string; step: string } | null>(null);
  const [straightLine, setStraightLine] = useState<number | null>(null);

  const pinned = hasCoordinates(destination);
  const target = pinned
    ? { lat: destination!.latitude as number, lng: destination!.longitude as number }
    : null;

  useEffect(() => {
    let cancelled = false;
    if (!target) { setError('This order has no pinned location.'); return; }

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !boxRef.current) return;
        const google = (window as any).google;

        const map = new google.maps.Map(boxRef.current, {
          center: target,
          zoom: 16,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
        });

        new google.maps.Marker({
          position: target,
          map,
          title: customerName ? `${customerName} is here` : 'Customer',
        });

        serviceRef.current = new google.maps.DirectionsService();
        rendererRef.current = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,          // our own markers are clearer
          preserveViewport: false,
          polylineOptions: { strokeColor: '#452D9B', strokeOpacity: 0.9, strokeWeight: 6 },
        });

        mapRef.current = map;
        setReady(true);
      })
      .catch((e) => !cancelled && setError(e.message || 'Could not load the map'));

    return () => {
      cancelled = true;
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  /** Asks Google for the road route and draws it. Falls back to a direct line. */
  const drawRoute = (from: { lat: number; lng: number }) => {
    const google = (window as any).google;
    if (!google || !serviceRef.current || !target) return;

    serviceRef.current.route(
      {
        origin: from,
        destination: target,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result: any, status: string) => {
        if (status === 'OK' && result?.routes?.[0]?.legs?.[0]) {
          const leg = result.routes[0].legs[0];
          rendererRef.current.setDirections(result);
          fallbackLineRef.current?.setMap(null);
          setRoute({
            distance: leg.distance?.text || '',
            duration: leg.duration?.text || '',
            step: leg.steps?.[0]?.instructions ? plainText(leg.steps[0].instructions) : '',
          });
        } else {
          // Directions unavailable (API not enabled, or no road route). Show a
          // direct line so the captain still sees which way the stop lies.
          setRoute(null);
          if (!fallbackLineRef.current) {
            fallbackLineRef.current = new google.maps.Polyline({
              map: mapRef.current,
              strokeColor: '#452D9B',
              strokeOpacity: 0.7,
              strokeWeight: 4,
            });
          }
          fallbackLineRef.current.setMap(mapRef.current);
          fallbackLineRef.current.setPath([from, target]);
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(from); bounds.extend(target);
          mapRef.current.fitBounds(bounds, 60);
        }
      }
    );
  };

  const startTracking = () => {
    if (!navigator.geolocation || !mapRef.current || !target) return;
    const google = (window as any).google;
    setTracking(true);
    setError('');

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setError('');   // a reading came through, so clear any weak-signal note

        if (!meRef.current) {
          meRef.current = new google.maps.Marker({
            position: me,
            map: mapRef.current,
            title: 'You',
            zIndex: 999,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#07C8D0',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            },
          });
        } else {
          meRef.current.setPosition(me);
        }

        setStraightLine(metresBetween(me, target));

        const movedFar =
          !lastRouteFrom.current || metresBetween(lastRouteFrom.current, me) > REROUTE_AFTER_METRES;
        const longEnough = Date.now() - lastRouteAt.current > REROUTE_AFTER_MS;
        if (movedFar || longEnough) {
          lastRouteFrom.current = me;
          lastRouteAt.current = Date.now();
          drawRoute(me);
        }
      },
      (err) => {
        // Only a refusal is worth giving up on. A captain riding through a
        // tunnel or a lift throws the odd timeout, and stopping the watch there
        // left them with a dead map until they noticed and tapped it again.
        if (err.code === err.PERMISSION_DENIED) {
          setTracking(false);
          setError('Location permission denied. Allow it to see the route.');
          return;
        }
        setError('Weak GPS signal - still trying.');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  };

  const stopTracking = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setTracking(false);
  };

  if (!pinned) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm font-semibold text-amber-800">{label}</p>
        <p className="text-xs text-amber-700 mt-1">
          This customer has not pinned their location, so live navigation is not available.
          Use the address and open it in Google Maps.
        </p>
        <a href={directionsUrl(destination)} target="_blank" rel="noreferrer"
           className="inline-block mt-2 text-xs font-semibold" style={{ color: '#452D9B' }}>
          Open in Google Maps
        </a>
      </div>
    );
  }

  const headline = route
    ? `${route.distance} · ${route.duration} by road`
    : straightLine !== null
      ? `${readableDistance(straightLine)} away`
      : 'Exact location pinned by the customer';

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-black">{label}</p>
          <p className="text-[11px] text-gray-500 truncate">{headline}</p>
        </div>
        {tracking && (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold flex-shrink-0" style={{ color: '#07C8D0' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#07C8D0' }} />
            LIVE
          </span>
        )}
      </div>

      {route?.step && (
        <div className="px-3 py-2 border-b border-gray-100" style={{ background: '#f5f3ff' }}>
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Next</p>
          <p className="text-xs font-semibold text-black leading-snug">{route.step}</p>
        </div>
      )}

      <div className="relative h-56 bg-gray-100">
        <div ref={boxRef} className="w-full h-full" />
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
            Loading map...
          </div>
        )}
      </div>

      {error && <p className="px-3 py-2 text-[11px] text-red-600">{error}</p>}

      <div className="flex gap-2 p-3">
        <button
          type="button"
          onClick={tracking ? stopTracking : startTracking}
          disabled={!ready}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: tracking ? '#6b7280' : 'linear-gradient(to right, #452D9B, #07C8D0)' }}
        >
          {tracking ? 'Stop live tracking' : 'Start live tracking'}
        </button>
        <a
          href={directionsUrl(destination)}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-center border-2"
          style={{ borderColor: '#452D9B', color: '#452D9B' }}
        >
          Navigate
        </a>
      </div>
    </div>
  );
};

export default LiveNavigationMap;
