'use client'

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Toast from "@/components/Toast";
import { API_URL } from '@/config/api';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';

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

function PickupConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('id');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [showImageOptions, setShowImageOptions] = useState(false);

  // Request camera permissions on component mount
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      requestCameraPermissions();
    }
  }, []);

  const requestCameraPermissions = async () => {
    try {
      const permissions = await Camera.requestPermissions();
      console.log('Camera permissions:', permissions);
    } catch (error) {
      console.error('Failed to request camera permissions:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      
      if (image.dataUrl) {
        setPhotos([...photos, image.dataUrl]);
        setShowImageOptions(false);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      setToast({ message: 'Failed to take photo', type: 'error' });
    }
  };

  const selectFromGallery = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });
      
      if (image.dataUrl) {
        setPhotos([...photos, image.dataUrl]);
        setShowImageOptions(false);
      }
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      setToast({ message: 'Failed to select image', type: 'error' });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotos(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  useEffect(() => {
    if (orderId) fetchOrder(orderId);
  }, [orderId]);

  const fetchOrder = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/orders`);
      const data = await response.json();
      
      if (data.success) {
        const foundOrder = data.data.find((o: any) => o._id === id);
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
    <div className="min-h-screen overflow-y-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <header className="sticky top-0 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href={`/pickups/start?id=${orderId}`} className="text-2xl leading-none text-black">←</Link>
          <h2 className="text-lg font-semibold text-black">Confirm</h2>
          <span className="w-6" />
        </div>
      </header>

      <div className="mt-3 mx-4 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-semibold text-black">Order ID: #{order.orderId}</p>
            <p className="mt-2 text-sm text-black">Customer: {order.customerId?.name || 'Customer'}</p>
            <p className="text-sm text-black">Phone: {order.customerId?.mobile}</p>
            <p className="mt-2 text-sm text-black">📍 {order.pickupAddress.street}, {order.pickupAddress.city}</p>
          </div>
          <span className="rounded-lg border-2 px-3 py-1 text-sm font-semibold" style={{ borderColor: '#b8a7d9', color: '#452D9B' }}>
            {order.status === 'reached_location' ? 'Reached Location' : order.status === 'picked_up' ? 'Picked Up' : order.status.charAt(0).toUpperCase() + order.status.slice(1).replace(/_/g, ' ')}
          </span>
        </div>

        {/* The captain needs the list in front of them while counting the clothes,
            not only on the screen before this one. */}
        {Array.isArray(order.items) && order.items.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm font-semibold text-black mb-2">
              Items to collect ({order.items.reduce((n: number, it: any) => n + (Number(it.quantity) || 0), 0)})
            </p>
            <div className="space-y-1.5">
              {order.items.map((it: any, i: number) => (
                <div key={i} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-black">
                    <span className="font-semibold">{it.quantity}x</span> {it.name}
                  </span>
                  <span className="text-gray-600 whitespace-nowrap">
                    &#8377;{(Number(it.price) || 0) * (Number(it.quantity) || 0)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-sm font-semibold text-black">
              <span>Order total</span>
              <span>&#8377;{order.totalAmount}</span>
            </div>
            {order.specialInstructions && (
              <p className="mt-2 text-xs text-gray-600">Note: {order.specialInstructions}</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 mx-4">
        <p className="text-base font-semibold text-black mb-3">Upload Clothes Photos (Min 2)</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
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
          <button
            onClick={() => setShowImageOptions(true)}
            className="aspect-square rounded-xl bg-gray-100 border-2 border-dashed flex items-center justify-center cursor-pointer"
            style={{ borderColor: '#452D9B' }}
          >
            <div className="text-center">
              <span className="text-2xl block mb-1" style={{ color: '#452D9B' }}>📷</span>
              <span className="text-xs" style={{ color: '#452D9B' }}>Add Photo</span>
            </div>
          </button>
        </div>

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
          className="w-full inline-flex justify-center items-center rounded-xl py-3 text-base font-semibold mb-4"
          style={photos.length >= 2 ? { background: 'linear-gradient(to right, #16a34a, #15803d)', color: 'white' } : { background: '#9ca3af', color: 'white' }}
        >
          Upload Images ({photos.length}/2)
        </button>

        <input
          className="w-full rounded-xl border border-gray-300 px-3 py-3 text-base text-black placeholder:text-gray-600 outline-none"
          placeholder="Add Notes (optional)…"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="mx-4 mt-3 pb-20">
        <label className="flex items-center gap-2 text-base text-black">
          <input type="checkbox" className="h-4 w-4" style={{ accentColor: '#452D9B' }} checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          I have collected all items from customer.
        </label>
        {order.status === 'reached_location' ? (
          <button
            onClick={async () => {
              if (photos.length < 2) {
                setToast({ message: 'Please upload at least 2 photos before confirming', type: 'warning' });
                return;
              }
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
                } else {
                  setToast({ message: 'Failed to update order', type: 'error' });
                }
              } catch (error) {
                console.error('Failed to update order:', error);
                setToast({ message: 'Failed to update order', type: 'error' });
              }
            }}
            disabled={!confirmed || photos.length < 2}
            className="mt-5 w-full inline-flex justify-center items-center text-white rounded-xl py-3 text-base font-semibold"
            style={confirmed && photos.length >= 2 ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)' } : { background: '#9ca3af' }}
          >
            Confirm & Proceed
          </button>
        ) : (
          <div className="mt-5 w-full inline-flex justify-center items-center rounded-xl py-3 text-base font-semibold" style={{ background: '#16a34a', color: 'white' }}>
            ✅ Pickup Completed
          </div>
        )}
      </div>

      {/* Image Options Modal */}
      {showImageOptions && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-[9999]">
          <div className="bg-white rounded-t-2xl w-full max-w-md p-6 animate-slide-up">
            <h3 className="text-lg font-bold text-black mb-4 text-center">Add Photo</h3>
            <div className="space-y-3">
              {Capacitor.isNativePlatform() ? (
                <>
                  <button
                    onClick={takePhoto}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:bg-gray-50"
                    style={{ borderColor: '#452D9B' }}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
                      <span className="text-2xl">📷</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-black">Take Photo</p>
                      <p className="text-sm text-gray-600">Use camera to take a new photo</p>
                    </div>
                  </button>
                  <button
                    onClick={selectFromGallery}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:bg-gray-50"
                    style={{ borderColor: '#452D9B' }}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
                      <span className="text-2xl">🖼️</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-black">Choose from Gallery</p>
                      <p className="text-sm text-gray-600">Select from existing photos</p>
                    </div>
                  </button>
                </>
              ) : (
                <label className="w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:bg-gray-50 cursor-pointer" style={{ borderColor: '#452D9B' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
                    <span className="text-2xl">🖼️</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-black">Select Images</p>
                    <p className="text-sm text-gray-600">Choose multiple images from device</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </label>
              )}
            </div>
            <button
              onClick={() => setShowImageOptions(false)}
              className="w-full mt-4 py-3 rounded-xl border-2 border-gray-300 font-semibold text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default function PickupConfirm() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <PickupConfirmContent />
    </Suspense>
  );
}