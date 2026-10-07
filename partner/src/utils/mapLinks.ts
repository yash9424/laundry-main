/**
 * Links into Google Maps for the captain.
 *
 * Searching by address text is what produced the "partial match" pins: Google
 * guesses, and on a long road it often guesses the wrong end. When the customer
 * has dropped a pin we navigate to those coordinates instead, which is exact.
 */

type Addressish = {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
} | null | undefined;

export function hasCoordinates(address: Addressish): boolean {
  return (
    !!address &&
    typeof address.latitude === 'number' &&
    typeof address.longitude === 'number' &&
    Number.isFinite(address.latitude) &&
    Number.isFinite(address.longitude)
  );
}

function addressText(address: Addressish): string {
  return [address?.street, address?.city, address?.state, address?.pincode]
    .map((part) => (part || '').toString().trim())
    .filter(Boolean)
    .join(', ');
}

/** Turn-by-turn directions to the address — the pin when we have one. */
export function directionsUrl(address: Addressish): string {
  if (hasCoordinates(address)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${address!.latitude},${address!.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText(address))}`;
}

/** An embeddable map centred on the address, for the preview panes. */
export function embedUrl(address: Addressish): string {
  const query = hasCoordinates(address)
    ? `${address!.latitude},${address!.longitude}`
    : `${addressText(address)}, India`;
  const zoom = hasCoordinates(address) ? 18 : 14;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`;
}

/** Shown next to the map so the captain knows how precise the location is. */
export function locationAccuracyLabel(address: Addressish): string {
  return hasCoordinates(address)
    ? 'Exact location pinned by the customer'
    : 'Approximate — matched from the address';
}
