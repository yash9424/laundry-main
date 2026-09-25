'use client'

import Link from "next/link";
import Image from "next/image";
import BottomNav from "@/components/BottomNav";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Toast from "@/components/Toast";
import { API_URL } from '@/config/api';

export default function DeliveryDetails() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureReasons, setFailureReasons] = useState({
    customerUnavailable: false,
    incorrectAddress: false,
    refusalToAccept: false
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  useEffect(() => {
    fetchOrder();
  }, []);

  const fetchOrder = async () => {
    try {
      const resolvedParams = await params;
      const response = await fetch(`${API_URL}/api/orders/${resolvedParams.id}`);
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
          <Link href="/delivery/pick" className="text-2xl leading-none text-black">←</Link>
          <h2 className="text-lg font-semibold text-black">Delivery Details</h2>
          <span className="w-6" />
        </div>
      </header>

      {/* Order summary card */}
      <div className="mt-3 mx-4 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex items-start justify-between">
          <p className="text-sm font-semibold text-black">Order #{order.orderId}
            {order.expressDelivery && <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>Express Delivery</span>}
          </p>
          <span className="rounded-lg text-white px-3 py-1 text-xs font-semibold" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
            {order.status === 'process_completed' ? 'Ready for Delivery' : order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-black">{order.customerId?.name || 'Customer'}</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-black">{order.customerId?.mobile}</p>
            <a href={`tel:${order.customerId?.mobile}`} className="h-8 w-8 rounded-lg text-white flex items-center justify-center" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>📞</a>
          </div>
        </div>
        <p className="mt-2 text-sm text-black">📍 {order.deliveryAddress?.street || order.pickupAddress?.street}, {order.deliveryAddress?.city || order.pickupAddress?.city}</p>
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.deliveryAddress?.street || order.pickupAddress?.street}, ${order.deliveryAddress?.city || order.pickupAddress?.city}`)}`} 
          target="_blank" 
          className="mt-2 text-sm"
          style={{ color: '#452D9B' }}
        >
          Open in Maps
        </a>
      </div>

      {/* Map banner */}
      <div className="mt-3 mx-4 relative rounded-xl overflow-hidden border border-gray-200 h-48">
        <iframe
          src={`https://maps.google.com/maps?q=${encodeURIComponent(`${order.deliveryAddress?.street || order.pickupAddress?.street}, ${order.deliveryAddress?.city || order.pickupAddress?.city}`)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
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
            className="mt-5 w-full inline-flex justify-center items-center text-white rounded-xl py-3 text-base font-semibold"
            style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
          >
            {order.redeliveryScheduled ? 'Start Redelivery' : 'Start Delivery'}
          </button>
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

      {/* Failure Reason Modal */}
      {showFailureModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-bold text-black">Delivery Failure Reason</h3>
              <p className="text-sm text-gray-600 mt-1">Select reason(s) for failed delivery</p>
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
                  <p className="text-sm text-gray-600">Customer not present at delivery location</p>
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
                  <p className="text-sm text-gray-600">Address details are wrong or incomplete</p>
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
                  <p className="text-sm text-gray-600">Customer refused to accept the order</p>
                </div>
              </label>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> Customer will be charged ₹100-₹250 delivery fee for failed delivery attempts.
                </p>
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => {
                  setShowFailureModal(false);
                  setFailureReasons({ customerUnavailable: false, incorrectAddress: false, refusalToAccept: false });
                }}
                className="flex-1 py-2.5 rounded-lg border-2 border-gray-300 font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const selectedReasons = [];
                  const fees = [];
                  
                  // Fetch charge settings
                  const chargesRes = await fetch(`${API_URL}/api/order-charges`);
                  const chargesData = await chargesRes.json();
                  const charges = chargesData.data;
                  
                  if (failureReasons.customerUnavailable) {
                    selectedReasons.push('/Customer Unavailable');
                    fees.push(charges.customerUnavailable);
                  }
                  if (failureReasons.incorrectAddress) {
                    selectedReasons.push('/Incorrect Address');
                    fees.push(charges.incorrectAddress);
                  }
                  if (failureReasons.refusalToAccept) {
                    selectedReasons.push('/Refusal to Accept');
                    fees.push(charges.refusalToAccept);
                  }

                  if (selectedReasons.length === 0) {
                    setToast({ message: 'Please select at least one reason', type: 'warning' });
                    return;
                  }

                  const deliveryFee = Math.max(...fees); // Highest charge
                  const failureReason = selectedReasons.join(', ');

                  const response = await fetch(`${API_URL}/api/orders/${order._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      status: 'delivery_failed',
                      deliveryFailureReason: failureReason,
                      deliveryFailureFee: deliveryFee,
                      deliveryFailedAt: new Date().toISOString(),
                      returnToHubRequested: false,
                      returnToHubApproved: false,
                      returnToHubRequestedAt: null,
                      returnToHubApprovedAt: null
                    })
                  });

                  if (response.ok) {
                    setShowFailureModal(false);
                    setToast({ message: `Order marked as delivery failed. Customer will be charged ₹${deliveryFee}`, type: 'success' });
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
