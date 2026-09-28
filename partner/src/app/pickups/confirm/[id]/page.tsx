'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Toast from "@/components/Toast";
import { API_URL } from '@/config/api';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

interface Order {
  _id: string;
  orderId: string;
  customerId: {
    name: string;
    mobile: string;
  };
  pickupAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  totalAmount: number;
  items: any[];
  specialInstructions?: string;
  status: string;
}

interface Hub {
  _id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  contactPerson?: string;
  contactNumber?: string;
}

export default function PickupConfirm() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  
  // Debug: Log modal state changes
  useEffect(() => {
    console.log('Modal state changed:', showPermissionModal);
  }, [showPermissionModal]);

  useEffect(() => {
    fetchOrder();
  }, []);

  const takePhoto = async () => {
    console.log('takePhoto function called');
    try {
      // Always request permission first on mobile
      if (window.Capacitor?.isNativePlatform()) {
        console.log('Requesting camera permission...');
        const { Camera } = await import('@capacitor/camera');
        const permission = await Camera.requestPermissions({ permissions: ['camera'] });
        console.log('Camera permission result:', permission);
        
        if (permission.camera !== 'granted') {
          setToast({ message: 'Camera permission denied. Please enable in settings.', type: 'error' });
          return;
        }
      }

      console.log('Opening camera...');
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      
      if (image.dataUrl) {
        setPhotos([...photos, image.dataUrl]);
        setToast({ message: 'Photo captured successfully!', type: 'success' });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      setToast({ message: 'Failed to take photo', type: 'error' });
    }
  };

  const selectFromGallery = async () => {
    console.log('selectFromGallery function called');
    try {
      // Always request permission first on mobile
      if (window.Capacitor?.isNativePlatform()) {
        console.log('Requesting gallery permission...');
        const { Camera } = await import('@capacitor/camera');
        const permission = await Camera.requestPermissions({ permissions: ['photos'] });
        console.log('Gallery permission result:', permission);
        
        if (permission.photos !== 'granted') {
          setToast({ message: 'Photo access denied. Please enable in settings.', type: 'error' });
          return;
        }
      }

      console.log('Opening gallery...');
      const images = [];
      
      for (let i = 0; i < 5; i++) {
        try {
          const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Photos
          });
          
          if (image.dataUrl) {
            images.push(image.dataUrl);
          }
          
          const selectMore = confirm('Photo selected! Select another photo?');
          if (!selectMore) break;
        } catch (error) {
          console.log('User cancelled or no more photos');
          break;
        }
      }
      
      if (images.length > 0) {
        setPhotos([...photos, ...images]);
        setToast({ message: `${images.length} photo(s) selected successfully!`, type: 'success' });
      }
    } catch (error) {
      console.error('Error selecting photos:', error);
      setToast({ message: 'Failed to select photos', type: 'error' });
    }
  };

  const fetchOrder = async () => {
    try {
      const resolvedParams = await params;
      const response = await fetch(`${API_URL}/api/orders`);
      const data = await response.json();
      
      if (data.success) {
        const foundOrder = data.data.find((o: any) => o._id === resolvedParams.id);
        setOrder(foundOrder);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!order) return <div className="p-8 text-center">Order not found</div>;
  return (
    <div className="pb-6">
      {/* DEBUG: Show modal state */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-0 right-0 bg-red-500 text-white p-2 text-xs z-[10000]">
          Modal: {showPermissionModal ? 'OPEN' : 'CLOSED'}
        </div>
      )}
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="text-2xl leading-none text-black">←</button>
          <h2 className="text-lg font-semibold text-black">Confirm</h2>
          <span className="w-6" />
        </div>
      </header>

      {/* Order summary card */}
      <div className="mt-3 mx-4 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-semibold text-black">Order ID: #{order.orderId}</p>
            <p className="mt-2 text-sm text-black">Customer: {order.customerId?.name || 'Customer'}</p>
            <p className="text-sm text-black">Phone: {order.customerId?.mobile}</p>
            <p className="mt-2 text-sm text-black">📍 {order.pickupAddress.street}, {order.pickupAddress.city}</p>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.pickupAddress.street}, ${order.pickupAddress.city}`)}`} target="_blank" className="mt-3 inline-flex items-center rounded-lg border-2 px-4 py-2 text-sm font-semibold" style={{ borderColor: '#b8a7d9', color: '#452D9B' }}>Open in Maps</a>
          </div>
          <span className="rounded-lg border-2 px-3 py-1 text-sm font-semibold" style={{ borderColor: '#b8a7d9', color: '#452D9B' }}>
            {order.status === 'reached_location' ? 'Reached Location' : order.status === 'picked_up' ? 'Picked Up' : order.status.charAt(0).toUpperCase() + order.status.slice(1).replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Upload section */}
      <div className="mt-4 mx-4">
        <p className="text-base font-semibold text-black">Upload Clothes Photos (Min 2)</p>
        
        {/* Photo Grid - Show selected photos */}
        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            {photos.map((photo, i) => (
              <div key={i} className="aspect-square rounded-xl bg-gray-100 border border-gray-300 flex items-center justify-center relative overflow-hidden">
                <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Single Add Photo Box */}
        <div className="mt-3">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Add Photo button clicked');
              setShowPermissionModal(true);
            }}
            className="w-full aspect-[3/2] rounded-xl border-2 border-dashed border-gray-400 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100"
          >
            <div className="text-4xl text-gray-400 mb-2">📷</div>
            <span className="text-sm font-medium text-gray-600">Add Photo</span>
          </button>
        </div>
        
        {/* Upload Images Button */}
        <button
          onClick={async () => {
            if (photos.length < 2) {
              setToast({ message: 'Please upload at least 2 photos', type: 'warning' });
              return;
            }
            try {
              const response = await fetch(`${API_URL}/api/orders/${order._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pickupPhotos: photos })
              });
              if (response.ok) {
                setToast({ message: 'Images uploaded successfully!', type: 'success' });
              } else {
                setToast({ message: 'Failed to upload images', type: 'error' });
              }
            } catch (error) {
              console.error('Failed to upload images:', error);
              setToast({ message: 'Failed to upload images', type: 'error' });
            }
          }}
          disabled={photos.length < 2}
          className="mt-4 w-full py-3 rounded-xl font-semibold text-white"
          style={{ backgroundColor: photos.length >= 2 ? '#6B7280' : '#9CA3AF' }}
        >
          Upload Images ({photos.length}/2)
        </button>

        <input
          className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-black placeholder:text-gray-500 outline-none"
          onFocus={(e) => { e.target.style.borderColor = '#452D9B'; e.target.style.boxShadow = '0 0 0 2px rgba(69, 45, 155, 0.1)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
          placeholder="Add Notes (optional)..."
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <p className="mt-2 text-xs text-gray-500">Example: Customer gave extra bedsheet.</p>
      </div>

      {/* Checkbox and CTA */}
      <div className="mx-4 mt-3">
        <label className="flex items-center gap-2 text-base text-black">
          <input type="checkbox" className="h-4 w-4" style={{ accentColor: '#452D9B' }} checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          I have collected all items from customer.
        </label>
        <button
          onClick={async () => {
            if (!confirmed) {
              setToast({ message: 'Please confirm you have collected all items', type: 'warning' });
              return;
            }
            try {
              const updateData = { 
                status: 'picked_up',
                pickupNotes: notes,
                pickedUpAt: new Date().toISOString()
              };
              const response = await fetch(`${API_URL}/api/orders/${order._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
              });
              if (response.ok) {
                router.push('/hub/drop');
              }
            } catch (error) {
              console.error('Failed to update order:', error);
            }
          }}
          disabled={!confirmed || order.status !== 'reached_location'}
          className="mt-4 w-full py-3 rounded-xl font-semibold text-white"
          style={{ backgroundColor: confirmed && order.status === 'reached_location' ? '#6B7280' : '#9CA3AF' }}
        >
          {order.status === 'reached_location' ? 'Confirm & Proceed' : 'Already Picked Up'}
        </button>
      </div>

      {/* Photo Selection Modal - ALWAYS RENDER WHEN STATE IS TRUE */}
      {showPermissionModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPermissionModal(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-4xl mb-4">📷</div>
              <h3 className="text-lg font-semibold text-black mb-2">Add Photos</h3>
              <p className="text-gray-600 text-sm mb-6">
                Choose how you want to add photos of the clothes
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    console.log('Camera option selected');
                    setShowPermissionModal(false);
                    setTimeout(() => takePhoto(), 200);
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-gray-100 hover:bg-gray-200 py-4 rounded-xl transition-colors"
                >
                  <span className="text-2xl">📷</span>
                  <div className="text-left">
                    <div className="font-semibold text-black">Take Photo</div>
                    <div className="text-xs text-gray-600">Use camera to capture</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    console.log('Gallery option selected');
                    setShowPermissionModal(false);
                    setTimeout(() => selectFromGallery(), 200);
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-gray-100 hover:bg-gray-200 py-4 rounded-xl transition-colors"
                >
                  <span className="text-2xl">🖼️</span>
                  <div className="text-left">
                    <div className="font-semibold text-black">Choose from Gallery</div>
                    <div className="text-xs text-gray-600">Select multiple photos</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    console.log('Cancel selected');
                    setShowPermissionModal(false);
                  }}
                  className="w-full bg-gray-300 text-gray-700 py-3 rounded-xl font-semibold mt-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}