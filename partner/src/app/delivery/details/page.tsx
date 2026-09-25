'use client'

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import BottomNav from "@/components/BottomNav";
import LeafletMap from "@/components/LeafletMap";
import { API_URL } from '@/config/api';

// Live countdown for Express Delivery orders only (12hr SLA).
function formatCountdown(expectedDeliveryAt: string, now: Date): { text: string; overdue: boolean } {
  const diffMs = new Date(expectedDeliveryAt).getTime() - now.getTime();
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const hours = Math.floor(abs / (1000 * 60 * 60));
  const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
  const text = `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  return { text: overdue ? `Overdue by ${text}` : `${text} left`, overdue };
}

function DeliveryDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('id');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [failureReasons, setFailureReasons] = useState({
    customerUnavailable: false,
    incorrectAddress: false,
    refusalToAccept: false
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [now, setNow] = useState(() => new Date());

  // Re-render every 30s so the Express countdown stays current
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        setOrder(data.data);
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
    <div className="pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.push('/delivery/pick')} className="text-2xl leading-none text-black">←</button>
          <h2 className="text-lg font-semibold text-black">Delivery Details</h2>
          <span style={{ color: '#452D9B' }}>🔔</span>
        </div>
      </header>

      {/* Map with overlay */}
      <div className="mt-3 mx-4 relative rounded-xl overflow-hidden h-48">
        {(order.deliveryAddress || order.pickupAddress) ? (
          <LeafletMap address={order.deliveryAddress || order.pickupAddress} />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-xl">
            <div className="text-center">
              <span className="text-4xl mb-2 block">📍</span>
              <p className="text-gray-500 text-sm">No delivery address</p>
            </div>
          </div>
        )}
        <div className="absolute left-4 bottom-4 bg-white shadow-sm rounded-xl px-4 py-2">
          <p className="text-sm font-semibold text-black">Delivery Location</p>
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.deliveryAddress?.street || order.pickupAddress?.street}, ${order.deliveryAddress?.city || order.pickupAddress?.city}`)}`} target="_blank" className="text-xs" style={{ color: '#452D9B' }}>Open in Google Maps</a>
        </div>
      </div>

      {/* Order summary card */}
      <div className="mt-4 mx-4 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex items-start justify-between">
          <p className="text-sm font-semibold text-black">Order #{order.orderId}</p>
          <span className="rounded-lg text-white px-3 py-1 text-xs font-semibold" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
            {order.status === 'process_completed' ? 'Ready for Delivery' : order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
          </span>
        </div>
        {order.expressDelivery && !['delivered', 'cancelled'].includes(order.status) && (
          <p className="mt-2 text-xs font-bold" style={{ color: order.expectedDeliveryAt && formatCountdown(order.expectedDeliveryAt, now).overdue ? '#dc2626' : '#d97706' }}>
            Express Delivery · ⏳ {order.expectedDeliveryAt ? formatCountdown(order.expectedDeliveryAt, now).text : 'Timer starts at pickup'}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-black">{order.customerId?.name || 'Customer'}</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-black">{order.customerId?.mobile}</p>
            <a href={`tel:${order.customerId?.mobile}`} className="h-8 w-8 rounded-lg text-white flex items-center justify-center" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>📞</a>
          </div>
        </div>
        <p className="mt-2 text-sm text-black">📍 {order.deliveryAddress?.street || order.pickupAddress?.street}, {order.deliveryAddress?.city || order.pickupAddress?.city}</p>
      </div>

      {/* Items card */}
      <div className="mt-4 mx-4 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <p className="text-base font-semibold text-black">Order Items</p>
        <div className="mt-2 text-sm">
          {order.items?.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between mt-1">
              <p className="text-black">{item.quantity} {item.name}</p>
              <p className="text-black">₹{item.price * item.quantity}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm font-semibold" style={{ color: '#452D9B' }}>Total Price: ₹{order.totalAmount}</p>
      </div>

      {/* CTA */}
      <div className="mx-4 mb-6">
        {order.status === 'process_completed' ? (
          <div className="mt-5 flex gap-3">
            <button
              onClick={async () => {
                const partnerId = localStorage.getItem('partnerId');
                const updateData: any = {
                  status: 'out_for_delivery',
                  partnerId: partnerId
                };
                
                if (order.redeliveryScheduled) {
                  updateData.outForRedeliveryAt = new Date().toISOString();
                } else {
                  updateData.outForDeliveryAt = new Date().toISOString();
                }
                
                const response = await fetch(`${API_URL}/api/orders/${order._id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updateData)
                });
                if (response.ok) {
                  fetchOrder();
                } else {
                  setToast({ message: 'Failed to start delivery', type: 'error' });
                }
              }}
              className="flex-1 inline-flex justify-center items-center text-white rounded-xl py-3 text-base font-semibold"
              style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
            >
              {order.redeliveryScheduled ? 'Start Redelivery' : 'Start Delivery'}
            </button>
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="flex-1 inline-flex justify-center items-center rounded-xl py-3 text-base font-semibold border-2"
              style={{ borderColor: '#dc2626', color: '#dc2626', backgroundColor: 'white' }}
            >
              Cancel Delivery
            </button>
          </div>
        ) : order.status === 'out_for_delivery' ? (
          <div className="mt-5 flex gap-3">
            <button
              onClick={async () => {
                const response = await fetch(`${API_URL}/api/orders/${order._id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    status: 'delivered',
                    deliveredAt: new Date().toISOString()
                  })
                });
                if (response.ok) {
                  const message = order.redeliveryScheduled ? 'Order redelivered successfully!' : 'Order delivered successfully!';
                  setToast({ message, type: 'success' });
                  setTimeout(() => router.push('/delivery/pick'), 1500);
                } else {
                  setToast({ message: 'Failed to mark as delivered', type: 'error' });
                }
              }}
              className="flex-1 inline-flex justify-center items-center bg-green-600 text-white rounded-xl py-3 text-base font-semibold"
            >
              Order Delivered
            </button>
            <button
              onClick={() => setShowFailureModal(true)}
              className="flex-1 inline-flex justify-center items-center bg-red-600 text-white rounded-xl py-3 text-base font-semibold"
            >
              Not Delivered
            </button>
          </div>
        ) : (
          <div className="mt-5 w-full inline-flex justify-center items-center bg-gray-400 text-white rounded-xl py-3 text-base font-semibold">
            {order.status === 'delivered' ? 'Delivered' : 'Completed'}
          </div>
        )}
      </div>

      <BottomNav />

      <ConfirmModal
        isOpen={showCancelConfirm}
        title="Cancel Delivery"
        message="Are you sure you want to cancel this delivery? The order will be available for other partners."
        onConfirm={async () => {
          setShowCancelConfirm(false);
          const response = await fetch(`${API_URL}/api/orders/${order._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              status: 'process_completed',
              partnerId: null,
              outForDeliveryAt: null
            })
          });
          if (response.ok) {
            setToast({ message: 'Delivery cancelled successfully', type: 'success' });
            setTimeout(() => router.push('/delivery/pick'), 1500);
          } else {
            setToast({ message: 'Failed to cancel delivery', type: 'error' });
          }
        }}
        onCancel={() => setShowCancelConfirm(false)}
        confirmText="Cancel Delivery"
        cancelText="Go Back"
      />

      {/* Failure Modal */}
      {showFailureModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-bold text-black">Delivery Failure Reason</h3>
            </div>
            <div className="p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={failureReasons.customerUnavailable}
                  onChange={(e) => setFailureReasons({...failureReasons, customerUnavailable: e.target.checked})}
                  className="mt-1 w-5 h-5"
                />
                <div>
                  <p className="font-semibold text-black">Customer Unavailable</p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={failureReasons.incorrectAddress}
                  onChange={(e) => setFailureReasons({...failureReasons, incorrectAddress: e.target.checked})}
                  className="mt-1 w-5 h-5"
                />
                <div>
                  <p className="font-semibold text-black">Incorrect Address</p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={failureReasons.refusalToAccept}
                  onChange={(e) => setFailureReasons({...failureReasons, refusalToAccept: e.target.checked})}
                  className="mt-1 w-5 h-5"
                />
                <div>
                  <p className="font-semibold text-black">Refusal to Accept</p>
                </div>
              </label>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => setShowFailureModal(false)}
                className="flex-1 py-2.5 rounded-lg border-2 border-gray-300 font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const selectedReasons = [];
                  if (failureReasons.customerUnavailable) selectedReasons.push('Customer Unavailable');
                  if (failureReasons.incorrectAddress) selectedReasons.push('Incorrect Address');
                  if (failureReasons.refusalToAccept) selectedReasons.push('Refusal to Accept');

                  if (selectedReasons.length === 0) {
                    setToast({ message: 'Please select at least one reason', type: 'warning' });
                    return;
                  }

                  const response = await fetch(`${API_URL}/api/orders/${order._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      status: 'delivery_failed',
                      deliveryFailureReason: selectedReasons.join(', '),
                      deliveryFailedAt: new Date().toISOString()
                    })
                  });

                  if (response.ok) {
                    setShowFailureModal(false);
                    setToast({ message: 'Order marked as delivery failed', type: 'success' });
                    setTimeout(() => router.push('/delivery/pick'), 2000);
                  } else {
                    setToast({ message: 'Failed to update order', type: 'error' });
                  }
                }}
                className="flex-1 py-2.5 rounded-lg font-semibold text-white"
                style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeliveryDetails() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <DeliveryDetailsContent />
    </Suspense>
  );
}