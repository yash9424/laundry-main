'use client'

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Toast from "@/components/Toast";
import LeafletMap from "@/components/LeafletMap";
import { API_URL } from '@/config/api';
import { directionsUrl, locationAccuracyLabel } from '@/utils/mapLinks';
import LiveNavigationMap from '@/components/LiveNavigationMap';

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

function StartPickupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('id');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

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
    <div className="min-h-screen overflow-y-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <header className="sticky top-0 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/pickups" className="text-2xl leading-none text-black">←</Link>
          <h2 className="text-lg font-semibold text-black">Pickup in Progress</h2>
          <span className="w-6" />
        </div>
      </header>

      <div className="mt-3 mx-4">
        <LiveNavigationMap
          destination={order.pickupAddress}
          label="Pickup location"
          customerName={order.customerId?.name}
        />
      </div>

      <div className="mt-4 mx-4 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <p className="text-base font-semibold text-black">{order.customerId?.name || 'Customer'}</p>
        <p className="text-xs text-black mt-1">{order.customerId?.mobile}</p>
        <p className="text-xs text-black mt-1">📍 {order.pickupAddress.street}, {order.pickupAddress.city}</p>
        {/* Only when there is a number to call. The WhatsApp link used to read
            customerId?.mobile.replace(...), which guards the customer being
            missing but not the number: on an order without one it threw and
            took the whole screen down, so the captain could not get past
            "I have reached" at all. */}
        {order.customerId?.mobile ? (
          <div className="mt-3 flex items-center gap-3">
            <a href={`tel:${order.customerId.mobile}`} className="inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-semibold" style={{ borderColor: '#b8a7d9', color: '#452D9B' }}>
              <span>📞</span>
              Call Customer
            </a>
            <a href={`https://wa.me/${String(order.customerId.mobile).replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-semibold" style={{ borderColor: '#b8a7d9', color: '#452D9B' }}>
              <span>💬</span>
              Message
            </a>
          </div>
        ) : (
          <p className="mt-3 text-xs text-gray-500">No contact number on this order.</p>
        )}
      </div>

      <div className="mt-4 mx-4 rounded-xl border-2 bg-white p-4" style={{ borderColor: '#452D9B' }}>
        <p className="text-base font-semibold text-black">Order Details</p>
        <div className="mt-2 text-sm text-black">
          <p>Order ID: {order.orderId}</p>
          <div className="mt-3">
            {/* Laid out like a cart receipt so the captain can tick garments off
                against it while counting. */}
            <p className="font-medium mb-1.5">
              Items{order.items?.length ? ` (${order.items.reduce((n: number, it: any) => n + (Number(it.quantity) || 0), 0)} pieces)` : ''}:
            </p>
            {order.items && order.items.length > 0 ? (
              <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="flex items-start justify-between gap-3 px-3 py-2">
                    <span className="text-sm text-black">
                      <span className="font-semibold">{item.quantity}x</span> {item.name}
                    </span>
                    <span className="text-sm text-gray-600 whitespace-nowrap">
                      ₹{(Number(item.price) || 0) * (Number(item.quantity) || 0)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600 ml-2">No items found</p>
            )}
          </div>
          <p className="mt-2">Total Price: ₹{order.totalAmount}</p>
          <p>Special Instructions: {order.specialInstructions || 'None'}</p>
          {order.specialInstructions && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs font-medium text-yellow-800">Customer Notes:</p>
              <p className="text-xs text-yellow-700 mt-1">{order.specialInstructions}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mx-4 pb-20">
        <button
          onClick={async () => {
            const partnerId = localStorage.getItem('partnerId');
            const updateData = { 
              status: 'reached_location',
              reachedLocationAt: new Date().toISOString(),
              partnerId: partnerId
            };
            const response = await fetch(`${API_URL}/api/orders/${order._id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData)
            });
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
          onClick={async () => {
            if (confirm('Are you sure you want to stop this pickup? The order will be unassigned and available for other partners.')) {
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
            }
          }}
          className="mt-3 w-full inline-flex justify-center items-center rounded-xl py-3 text-base font-semibold border-2"
          style={{ borderColor: '#dc2626', color: '#dc2626', backgroundColor: 'white' }}
        >
          Stop Pickup
        </button>
      </div>
    </div>
  );
}

export default function StartPickup() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <StartPickupContent />
    </Suspense>
  );
}