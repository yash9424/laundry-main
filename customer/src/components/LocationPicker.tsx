import { useEffect, useRef, useState } from 'react';
import { Crosshair, MapPin, Loader2 } from 'lucide-react';

export interface PickedLocation {
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  /** Typed address, used only to centre the map the first time. */
  address: { street?: string; city?: string; state?: string; pincode?: string };
  value?: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
}

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const SCRIPT_ID = 'google-maps-js';

/** Loads the Maps JS API once and resolves when google.maps is ready. */
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=geocoding`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Maps failed to load'));
    document.head.appendChild(script);
  });
}

// Bengaluru, so the map opens somewhere sensible while we work out the real spot
const FALLBACK = { lat: 12.9716, lng: 77.5946 };

const LocationPicker = ({ address, value, onChange }: LocationPickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);

  const publish = (lat: number, lng: number) => {
    onChange({ latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) });
  };

  const moveTo = (lat: number, lng: number, recentre = true) => {
    if (!mapRef.current || !markerRef.current) return;
    const point = { lat, lng };
    markerRef.current.setPosition(point);
    if (recentre) mapRef.current.panTo(point);
    publish(lat, lng);
  };

  // Build the map once the script is in
  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const google = (window as any).google;

        const start = value?.latitude && value?.longitude
          ? { lat: value.latitude, lng: value.longitude }
          : FALLBACK;

        const map = new google.maps.Map(containerRef.current, {
          center: start,
          zoom: value ? 17 : 12,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
        });

        const marker = new google.maps.Marker({
          position: start,
          map,
          draggable: true,
          title: 'Drag to your exact location',
        });

        marker.addListener('dragend', () => {
          const p = marker.getPosition();
          if (p) publish(p.lat(), p.lng());
        });
        map.addListener('click', (e: any) => {
          if (e.latLng) moveTo(e.latLng.lat(), e.latLng.lng(), false);
        });

        mapRef.current = map;
        markerRef.current = marker;
        setReady(true);

        // Nothing pinned yet: centre on the typed address so the pin starts close
        if (!value?.latitude) {
          const parts = [address.street, address.city, address.state, address.pincode, 'India']
            .map((p) => (p || '').trim())
            .filter(Boolean);
          if (parts.length > 1) {
            new google.maps.Geocoder().geocode({ address: parts.join(', ') }, (results: any, status: string) => {
              if (cancelled) return;
              if (status === 'OK' && results?.[0]?.geometry?.location) {
                const loc = results[0].geometry.location;
                map.setZoom(16);
                moveTo(loc.lat(), loc.lng());
              }
            });
          }
        }
      })
      .catch((e) => !cancelled && setError(e.message || 'Could not load the map'));

    return () => { cancelled = true; };
    // Built once; later address edits should not rebuild the map under the pin
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('This device cannot share its location.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        if (mapRef.current) mapRef.current.setZoom(17);
        moveTo(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. Turn it on, or drag the pin instead.'
            : 'Could not get your location. Drag the pin to set it.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg">
      <h3 className="text-base font-bold text-black mb-1 flex items-center gap-2">
        <MapPin className="w-4 h-4" style={{ color: '#452D9B' }} />
        Pin your exact location
      </h3>
      <p className="text-xs text-gray-600 mb-3">
        Drag the pin to your door. This is the point your captain will navigate to.
      </p>

      <div className="relative h-56 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
        <div ref={containerRef} className="w-full h-full" />
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
            Loading map...
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-gray-600">
            {error}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating || !ready}
        className="w-full mt-3 h-11 rounded-2xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
      >
        {locating
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Finding you...</>
          : <><Crosshair className="w-4 h-4" /> Use my current location</>}
      </button>

      {value?.latitude ? (
        <p className="text-[11px] text-green-700 mt-2 text-center">
          Pinned at {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
        </p>
      ) : (
        <p className="text-[11px] text-gray-500 mt-2 text-center">
          No pin set yet — your captain will only have the typed address.
        </p>
      )}
    </div>
  );
};

export default LocationPicker;
