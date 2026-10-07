'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import { API_URL } from '@/config/api';
import { Capacitor } from '@capacitor/core';
import { directionsUrl, locationAccuracyLabel } from '@/utils/mapLinks';

interface Order {
  _id: string;
  orderId: string;
  status: string;
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
}

export default function StartPickup() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  useEffect(() => {
    // Force hide splash screen for Capacitor
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/splash-screen').then(({ SplashScreen }) => {
        SplashScreen.hide();
      }).catch(() => {});
    }
    fetchOrder();
  }, []);

  const fetchOrder = async () => {
    try {
      const resolvedParams = await params;
      const response = await fetch(`${API_URL}/api/orders`);
      const data = await response.json();
      
      if (data.success) {
        const foundOrder = data.data.find((o: any) => o._id === resolvedParams.id);
        if (foundOrder) {
          setOrder(foundOrder);
        } else {
          console.error('Order not found with ID:', resolvedParams.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!order) return <div className="p-8 text-center">Order not found</div>;
  
  // Check if order is cancelled
  if (order.status === 'cancelled') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md w-full">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(to right, #ef4444, #dc2626)' }}>
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Cancelled</h2>
          <p className="text-gray-600 mb-4">This order has been cancelled by the customer.</p>
          <p className="text-sm text-gray-500 mb-6">Order ID: {order.orderId}</p>
          <Link 
            href="/pickups" 
            className="inline-block w-full text-center text-white rounded-xl py-3 text-base font-semibold"
            style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
          >
            Back to Pickups
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="pb-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/pickups" className="text-2xl leading-none text-black">←</Link>
          <h2 className="text-lg font-semibold text-black">Pickup in Progress</h2>
          <span className="w-6" />
        </div>
      </header>

      {/* Map with overlay */}
      <div className="mt-3 mx-4 relative rounded-xl overflow-hidden h-48">
        <iframe
          src={`https://maps.google.com/maps?q=${encodeURIComponent(`${order.pickupAddress.street}, ${order.pickupAddress.city}, ${order.pickupAddress.state}`)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="absolute left-4 bottom-4 bg-white shadow-sm rounded-xl px-4 py-2">
          <p className="text-sm font-semibold text-black">Pickup Location</p>
          <a href={directionsUrl(order.pickupAddress)} target="_blank" className="text-xs" style={{ color: '#452D9B' }}>Open in Google Maps</a>
        </div>
      </div>

      {/* Customer card */}
      <div className="mt-4 mx-4 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <p className="text-base font-semibold text-black">{order.customerId?.name || 'Customer'}</p>
        <p className="text-xs text-black mt-1">{order.customerId?.mobile}</p>
        <p className="text-xs text-black mt-1">📍 {order.pickupAddress.street}, {order.pickupAddress.city}</p>
        <div className="mt-3 flex items-center gap-3">
          <a href={`tel:${order.customerId?.mobile}`} className="inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-semibold" style={{ borderColor: '#b8a7d9', color: '#452D9B' }}>
            <span>📞</span>
            Call Customer
          </a>
          <a href={`https://wa.me/${order.customerId?.mobile.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-semibold" style={{ borderColor: '#b8a7d9', color: '#452D9B' }}>
            <span>💬</span>
            Message
          </a>
        </div>
      </div>

      {/* Order Details */}
      <div className="mt-4 mx-4 rounded-xl border-2 bg-white p-4" style={{ borderColor: '#452D9B' }}>
        <p className="text-base font-semibold text-black">Order Details</p>
        <div className="mt-2 text-sm text-black">
          <p>Order ID: {order.orderId}</p>
          <p>Items: {order.items?.length || 0}</p>
          <p>Total Price: ₹{order.totalAmount}</p>
          <p>Delivery Instructions: {order.specialInstructions || 'None'}</p>
        </div>
      </div>

      {/* CTA */}
      <div className="mx-4">
        <button
          onClick={async () => {
            const partnerId = localStorage.getItem('partnerId');
            console.log('Partner ID from localStorage:', partnerId);
            const updateData = { 
              status: 'reached_location',
              reachedLocationAt: new Date().toISOString(),
              partnerId: partnerId
            };
            console.log('Updating order with:', updateData);
            const response = await fetch(`${API_URL}/api/orders/${order._id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData)
            });
            const result = await response.json();
            console.log('Update response:', result);
            if (response.ok) {
              router.push(`/pickups/confirm?id=${order._id}`);
            } else {
              setToast({ message: 'Failed to update order', type: 'error' });
            }
          }}
          className="mt-5 w-full inline-flex justify-center items-center text-white rounded-xl py-3 text-base font-semibold"
          style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
        >
          Reached Location
        </button>
        <button
          onClick={() => setShowStopConfirm(true)}
          className="mt-3 w-full inline-flex justify-center items-center rounded-xl py-3 text-base font-semibold border-2"
          style={{ borderColor: '#dc2626', color: '#dc2626', backgroundColor: 'white' }}
        >
          Stop Pickup
        </button>
      </div>

      <ConfirmModal
        isOpen={showStopConfirm}
        title="Stop Pickup"
        message="Are you sure you want to stop this pickup? The order will be unassigned and available for other partners."
        onConfirm={async () => {
          setShowStopConfirm(false);
          const response = await fetch(`${API_URL}/api/orders/${order._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ partnerId: null })
          });
          if (response.ok) {
            setToast({ message: 'Pickup stopped. Order unassigned.', type: 'success' });
            setTimeout(() => router.push('/pickups'), 1000);
          } else {
            setToast({ message: 'Failed to stop pickup', type: 'error' });
          }
        }}
        onCancel={() => setShowStopConfirm(false)}
        confirmText="Stop Pickup"
        cancelText="Cancel"
      />
    </div>
  );
}