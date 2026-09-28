'use client'

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { API_URL } from '@/config/api';

export default function DeliveredToHub() {
  const [delivered, setDelivered] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveredOrders();
  }, []);

  const fetchDeliveredOrders = async () => {
    try {
      const partnerId = localStorage.getItem('partnerId');
      const response = await fetch(`${API_URL}/api/orders`);
      const data = await response.json();
      
      if (data.success) {
        const filteredOrders = data.data.filter((order: any) => {
          const isMyOrder = order.partnerId?._id === partnerId || order.partnerId === partnerId;
          const hasDeliveredToHub = order.deliveredToHubAt;
          return isMyOrder && hasDeliveredToHub;
        });
        setDelivered(filteredOrders);
        setFilteredOrders(filteredOrders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredOrders(delivered);
      return;
    }
    const filtered = delivered.filter((order: any) => 
      order.orderId?.toLowerCase().includes(query.toLowerCase()) ||
      order.customerId?.name?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredOrders(filtered);
  };

  return (
    <div className="pb-10">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/hub/drop" className="text-2xl leading-none text-black">←</Link>
          <h2 className="text-lg font-semibold text-black">Delivered to Hub</h2>
          <span style={{ color: '#452D9B' }}>🔽</span>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2">
          <input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 rounded-xl border border-gray-300 px-3 py-3 text-sm outline-none"
            style={{ color: '#000' }}
            onFocus={(e) => { e.target.style.borderColor = '#452D9B'; e.target.style.boxShadow = '0 0 0 2px #452D9B'; }}
            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
            placeholder="Search by Order ID / Customer"
          />
          <button className="h-10 w-10 rounded-xl border border-gray-300 flex items-center justify-center" style={{ color: '#452D9B' }}>🔽</button>
        </div>
      </div>

      {/* Delivered cards */}
      {loading ? (
        <div className="mt-4 px-4 text-center text-gray-500">Loading...</div>
      ) : filteredOrders.length > 0 ? (
        <div className="mt-4 px-4 flex flex-col gap-4">
          {filteredOrders.map((order: any) => (
            <div key={order._id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-base font-semibold text-black">#{order.orderId}
                    {order.expressDelivery
                      ? <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>Express Delivery</span>
                      : <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}>Standard Delivery</span>}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">{order.customerId?.name || 'Customer'}</p>
                  <p className="text-xs text-black mt-1">{order.items?.length || 0} items • ₹{order.totalAmount || 0}</p>
                  <p className="text-xs text-gray-600 mt-2">
                    Delivered: {order.deliveredToHubAt ? new Date(order.deliveredToHubAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + new Date(order.deliveredToHubAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
                  </p>
                  <p className="text-xs font-semibold mt-2" style={{ color: '#452D9B' }}>
                    Status: {order.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </p>
                </div>
                <span className={`rounded-full text-white px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                  order.status === 'delivered' ? 'bg-green-500' : 
                  order.status === 'ready' ? 'bg-blue-500' :
                  order.status === 'out_for_delivery' ? 'bg-purple-500' :
                  order.status === 'delivered_to_hub' ? 'bg-orange-500' :
                  order.status === 'delivery_failed' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}>
                  {order.status === 'delivered' ? 'Delivered' : 
                   order.status === 'ready' ? 'Ready' :
                   order.status === 'out_for_delivery' ? 'Out for Delivery' :
                   order.status === 'delivered_to_hub' ? 'At Hub' :
                   order.status === 'delivery_failed' ? 'Failed' :
                   order.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 px-4 text-center">
          <Image src="/Delivery.svg" alt="Hub Building" width={260} height={180} className="mx-auto" />
          <p className="mt-2 text-base font-semibold">No delivered orders found.</p>
          <p className="text-xs text-black">Orders you deliver to hub will appear here.</p>
        </div>
      )}
    </div>
  );
}
