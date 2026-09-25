'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Toast from "@/components/Toast";
import BottomNav from "@/components/BottomNav";
import LeafletMap from "@/components/LeafletMap";
import { API_URL } from '@/config/api';
import { Capacitor } from '@capacitor/core';

// Live countdown for Express Delivery orders only (12hr SLA). Standard orders
// keep the plain static date/time display — this formatter is not used for them.
function formatCountdown(expectedDeliveryAt: string, now: Date): { text: string; overdue: boolean } {
  const diffMs = new Date(expectedDeliveryAt).getTime() - now.getTime();
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const hours = Math.floor(abs / (1000 * 60 * 60));
  const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
  const text = `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  return { text: overdue ? `Overdue by ${text}` : `${text} left`, overdue };
}

export default function DropToHub() {
  const router = useRouter();
  const [hub, setHub] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [now, setNow] = useState(() => new Date());

  // Live tick for the Express Delivery countdown timer (Section 5 SLA requirement)
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      checkKYCStatus();
      setupPullToRefresh();
    }
  }, []);

  const setupPullToRefresh = () => {
    let startY = 0;
    let currentY = 0;
    let pulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pulling) return;
      currentY = e.touches[0].clientY;
      const pullDistance = currentY - startY;
      
      if (pullDistance > 80 && !refreshing) {
        setRefreshing(true);
        handleRefresh();
        pulling = false;
      }
    };

    const handleTouchEnd = () => {
      pulling = false;
      startY = 0;
      currentY = 0;
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  };

  const handleRefresh = async () => {
    await fetchHubAndOrders();
    setRefreshing(false);
  };

  const checkKYCStatus = async () => {
    try {
      const partnerId = localStorage.getItem('partnerId');
      if (!partnerId) {
        router.push('/login');
        return;
      }
      
      const response = await fetch(`${API_URL}/api/mobile/partners/${partnerId}`);
      const data = await response.json();
      
      if (data.success) {
        const kycStatus = data.data.kycStatus;
        
        if (kycStatus === 'rejected') {
          router.push('/profile/kyc');
          return;
        }
        
        if (kycStatus === 'pending') {
          router.push('/profile/kyc-details');
          return;
        }
        
        if (kycStatus === 'approved') {
          fetchHubAndOrders();
        }
      }
    } catch (error) {
      console.error('Failed to check KYC status:', error);
    }
  };

  const fetchHubAndOrders = async () => {
    setLoading(true);
    const partnerId = localStorage.getItem('partnerId');
    const partnerRes = await fetch(`${API_URL}/api/mobile/partners/${partnerId}`);
    const partnerData = await partnerRes.json();
    
    console.log('Partner data:', partnerData);
    console.log('Partner pincode:', partnerData.data?.address?.pincode);
    
    // Try to fetch hub by pincode first
    if (partnerData.success && partnerData.data.address?.pincode) {
      const hubRes = await fetch(`${API_URL}/api/hubs?pincode=${partnerData.data.address.pincode}`);
      const hubData = await hubRes.json();
      console.log('Hub API response:', hubData);
      console.log('Hubs found:', hubData.data?.length || 0);
      if (hubData.success && hubData.data.length > 0) {
        console.log('Setting hub:', hubData.data[0]);
        setHub(hubData.data[0]);
      } else {
        console.log('No hub found for pincode:', partnerData.data.address.pincode);
        // Fallback: fetch any active hub
        const fallbackRes = await fetch(`${API_URL}/api/hubs`);
        const fallbackData = await fallbackRes.json();
        if (fallbackData.success && fallbackData.data.length > 0) {
          console.log('Using fallback hub:', fallbackData.data[0]);
          setHub(fallbackData.data[0]);
        }
      }
    } else {
      console.log('Partner has no pincode set, fetching any hub');
      // Fetch any active hub
      const hubRes = await fetch(`${API_URL}/api/hubs`);
      const hubData = await hubRes.json();
      if (hubData.success && hubData.data.length > 0) {
        setHub(hubData.data[0]);
      }
    }

    const ordersRes = await fetch(`${API_URL}/api/orders`);
    const ordersData = await ordersRes.json();
    if (ordersData.success) {
      console.log('Partner ID:', partnerId);
      console.log('All orders:', ordersData.data.length);
      
      const deliveryFailedOrders = ordersData.data.filter((o: any) => o.status === 'delivery_failed');
      console.log('Delivery failed orders:', deliveryFailedOrders);
      deliveryFailedOrders.forEach((o: any) => {
        console.log(`Order ${o.orderId}:`, {
          status: o.status,
          partnerId: o.partnerId?._id,
          redeliveryScheduled: o.redeliveryScheduled,
          returnToHubApproved: o.returnToHubApproved,
          returnToHubRequested: o.returnToHubRequested
        });
      });
      
      const filtered = ordersData.data.filter((o: any) => {
        const isPartnerMatch = o.partnerId?._id === partnerId;
        const isPickedUp = o.status === 'picked_up';
        const isDeliveryFailed = o.status === 'delivery_failed' && !o.redeliveryScheduled && !o.returnToHubApproved;
        const isRedeliveryFailed = o.status === 'delivery_failed' && o.redeliveryScheduled && !o.redeliveryReturnApproved;
        
        return isPartnerMatch && (isPickedUp || isDeliveryFailed || isRedeliveryFailed);
      });
      
      // Check for delivered orders
      const delivered = ordersData.data.filter((o: any) => {
        const isPartnerMatch = o.partnerId?._id === partnerId;
        const isDeliveredToHub = o.status === 'delivered_to_hub';
        return isPartnerMatch && isDeliveredToHub;
      });
      
      console.log('Filtered orders:', filtered);
      setOrders(filtered);
      setDeliveredOrders(delivered);
    }
    setLoading(false);
  };

  return (
    <div className="page-content">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {/* Refresh Indicator */}
      {refreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4">
          <div className="bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#452D9B', borderTopColor: 'transparent' }}></div>
            <span className="text-sm font-medium" style={{ color: '#452D9B' }}>Refreshing...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-semibold text-black">Drop To Hub</h2>
          <span className="w-6" />
        </div>
      </header>

      {/* Delivered Orders Alert */}
      <button
        onClick={() => router.push('/hub/delivered')}
        className="w-full text-white py-2.5 px-4 flex items-center justify-between"
        style={{ 
          background: 'linear-gradient(to right, #10b981, #059669)',
          transition: 'opacity 0.2s'
        }}
        onTouchStart={(e) => e.currentTarget.style.opacity = '0.9'}
        onTouchEnd={(e) => e.currentTarget.style.opacity = '1'}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 rounded-full bg-white bg-opacity-25 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">✅</span>
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-bold">Orders Delivered to Hub</p>
            <p className="text-xs opacity-90">{deliveredOrders.length > 0 ? `${deliveredOrders.length} order(s) • ` : ''}Tap to view details</p>
          </div>
        </div>
      </button>

      {/* Map */}
      {hub && (
        <div className="mt-3 mx-4 relative rounded-xl overflow-hidden h-48">
          <LeafletMap address={hub.address} />
          <div className="absolute left-4 bottom-4 bg-white shadow-sm rounded-xl px-4 py-2">
            <p className="text-sm font-semibold text-black">{hub.name}</p>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hub.address.street}, ${hub.address.city}`)}`} target="_blank" className="text-xs" style={{ color: '#452D9B' }}>Open in Google Maps</a>
          </div>
        </div>
      )}

      {/* Orders to Drop */}
      <div className="mt-4 mx-4">
        <p className="text-base font-semibold text-black">Orders to Drop ({orders.length})</p>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="mb-4" style={{
              width: '48px',
              height: '48px',
              border: '4px solid #f3f4f6',
              borderTop: '4px solid #10b981',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p className="text-gray-600">Loading orders...</p>
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : orders.length > 0 ? (
          orders.map((order) => (
            <div key={order._id} className="mt-3 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedOrders.includes(order._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrders([...selectedOrders, order._id]);
                      } else {
                        setSelectedOrders(selectedOrders.filter(id => id !== order._id));
                      }
                    }}
                    className="mt-1 w-4 h-4"
                    style={{ accentColor: '#452D9B' }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-black">Order ID: #{order.orderId}
                      {order.expressDelivery && <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>Express Delivery</span>}
                    </p>
                    <p className="text-xs text-black mt-1">{order.items?.length || 0} items</p>
                    {order.expectedDeliveryAt && (
                      order.expressDelivery ? (
                        <p className="text-xs mt-1 font-bold" style={{ color: formatCountdown(order.expectedDeliveryAt, now).overdue ? '#dc2626' : '#d97706' }}>
                          ⏳ {formatCountdown(order.expectedDeliveryAt, now).text}
                        </p>
                      ) : (
                        <p className="text-xs mt-1 font-medium" style={{ color: '#d97706' }}>
                          ⏳ Deliver by: {new Date(order.expectedDeliveryAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}
                        </p>
                      )
                    )}
                    <span className="mt-1 text-xs" style={{ color: order.status === 'delivery_failed' || (order.status === 'out_for_delivery' && order.redeliveryScheduled) ? '#dc2626' : '#452D9B' }}>
                      {order.status === 'delivery_failed' ? (order.redeliveryScheduled ? '⚠ Redelivery Failed' : '⚠ Delivery Failed') : 
                       order.status === 'out_for_delivery' && order.redeliveryScheduled ? '🔄 Redelivery Order' : 
                       'Picked Up'}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-black">{order.customerId?.name}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="mt-12 text-center px-6">
            <div className="mx-auto w-32 h-32 rounded-full flex items-center justify-center mb-6" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <span className="text-6xl">📦</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">All Clear!</h3>
            <p className="text-gray-600 text-sm">No orders ready to drop at the hub right now. Orders will appear here after you complete pickups.</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-4">
        <button
          onClick={async () => {
            try {
              const ordersToUpdate = selectedOrders.length > 0 ? selectedOrders : orders.map(o => o._id);
              console.log('Orders to update:', ordersToUpdate);
              console.log('Hub to assign:', hub?._id);
              
              let hasFailedOrders = false;
              
              for (const orderId of ordersToUpdate) {
                const order = orders.find(o => o._id === orderId);
                console.log('Processing order:', order?.orderId, 'Status:', order?.status);
                
                if (order?.status === 'delivery_failed') {
                  hasFailedOrders = true;
                  console.log('Sending return request for failed delivery order:', orderId);
                  
                  // Check if it's a redelivery failure
                  const isRedeliveryFailure = order.redeliveryScheduled === true;
                  
                  // Fetch delivery failure fee if not already set
                  let deliveryFailureFee = order.deliveryFailureFee || 0;
                  if (deliveryFailureFee === 0) {
                    try {
                      const chargesRes = await fetch(`${API_URL}/api/order-charges`);
                      const chargesData = await chargesRes.json();
                      if (chargesData.success && chargesData.data) {
                        deliveryFailureFee = chargesData.data.deliveryFailureFee || 0;
                      }
                    } catch (error) {
                      console.error('Failed to fetch delivery failure fee:', error);
                    }
                  }
                  
                  const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      returnToHubRequested: true,
                      returnToHubRequestedAt: new Date().toISOString(),
                      deliveryFailureFee: deliveryFailureFee,
                      hub: hub?._id,
                      ...(isRedeliveryFailure && { 
                        redeliveryReturnRequested: true,
                        redeliveryReturnRequestedAt: new Date().toISOString()
                      })
                    })
                  });
                  const result = await response.json();
                  console.log('Return request response:', result);
                } else {
                  console.log('Sending normal hub delivery for order:', orderId);
                  const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      status: 'delivered_to_hub',
                      deliveredToHubAt: new Date().toISOString(),
                      hub: hub?._id
                    })
                  });
                  const result = await response.json();
                  console.log('Hub delivery response:', result);
                }
              }
              
              if (hasFailedOrders) {
                const hasRedeliveryFailures = ordersToUpdate.some(id => {
                  const order = orders.find(o => o._id === id);
                  return order?.redeliveryScheduled === true;
                });
                
                if (hasRedeliveryFailures) {
                  setToast({ message: 'Redelivery return request sent to admin', type: 'success' });
                } else {
                  setToast({ message: 'Return request sent to admin for approval', type: 'success' });
                }
              } else {
                setToast({ message: 'Orders delivered to hub successfully', type: 'success' });
              }
              
              setTimeout(() => router.push('/hub/delivered'), 1500);
            } catch (error) {
              console.error('Error dropping orders:', error);
              setToast({ message: 'Failed to drop orders. Please try again.', type: 'error' });
            }
          }}
          disabled={orders.length === 0}
          className="mt-5 w-full inline-flex justify-center items-center text-white rounded-xl py-3 text-base font-semibold"
          style={orders.length > 0 ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)' } : { background: '#9ca3af' }}
        >
          Drop to Hub ({selectedOrders.length > 0 ? selectedOrders.length : orders.length})
        </button>
      </div>
      <BottomNav />
    </div>
  );
}