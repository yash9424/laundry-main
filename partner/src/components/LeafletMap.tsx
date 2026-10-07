import { useEffect, useState } from 'react';
import { embedUrl } from '@/utils/mapLinks';

interface LeafletMapProps {
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    // Present once the customer has pinned their door
    latitude?: number;
    longitude?: number;
  };
}

const LeafletMap = ({ address }: LeafletMapProps) => {
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    // Centres on the customer's pin when there is one, and only falls back to
    // searching the address text when there is not.
    setMapUrl(embedUrl(address));
  }, [address]);

  if (!mapUrl) {
    return (
      <div className="w-full h-full rounded-xl bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  return (
    <iframe
      src={mapUrl}
      width="100%"
      height="100%"
      style={{ border: 0 }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className="w-full h-full rounded-xl"
      title="Address Location Map"
    />
  );
};

export default LeafletMap;