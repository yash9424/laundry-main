'use client'

import Link from "next/link";
import Image from "next/image";
import BottomNav from "@/components/BottomNav";
import { useState, useEffect } from "react";
import { API_URL } from '@/config/api';

export default function DeliveryHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDeliveryHistory();
  }, []);

  const fetchDeliveryHistory = async () => {
    try {
      const partnerId = localStorage.getItem('partnerId');
      const response = await fetch(`${API_URL}/api/orders`);
      const data = await response.json();
      
      if (data.success) {
        const deliveredOrders = data.data.filter((order: any) => 
          (order.status === 'delivered' || order.status === 'delivery_failed') && order.partnerId?._id === partnerId
        );
        setAllOrders(deliveredOrders);
        filterOrders(deliveredOrders, 'all', '');
      }
    } catch (error) {
      console.error('Failed to fetch delivery history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = (orders: any[], filter: string, search: string, status: string = statusFilter) => {
    let filtered = [...orders];
    const now = new Date();
    
    // Status filter
    if (status === 'delivered') {
      filtered = filtered.filter(order => order.status === 'delivered');
    } else if (status === 'undelivered') {
      filtered = filtered.filter(order => order.status === 'delivery_failed');
    }
    
    // Date filter
    if (filter === 'thisWeek') {
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.deliveredAt || order.deliveryFailedAt);
        return orderDate >= weekStart;
      });
    } else if (filter === 'lastWeek') {
      const lastWeekStart = new Date(now.setDate(now.getDate() - now.getDay() - 7));
      lastWeekStart.setHours(0, 0, 0, 0);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() + 7);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.deliveredAt || order.deliveryFailedAt);
        return orderDate >= lastWeekStart && orderDate < lastWeekEnd;
      });
    } else if (filter === 'thisMonth') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.deliveredAt || order.deliveryFailedAt);
        return orderDate >= monthStart;
      });
    }
    
    // Search filter
    if (search.trim()) {
      filtered = filtered.filter(order => 
        order.orderId?.toLowerCase().includes(search.toLowerCase()) ||
        order.customerId?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    setHistory(filtered);
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    filterOrders(allOrders, filter, searchQuery, statusFilter);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    filterOrders(allOrders, activeFilter, searchQuery, status);
  };

  const handleSearchChange = (search: string) => {
    setSearchQuery(search);
    filterOrders(allOrders, activeFilter, search, statusFilter);
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/delivery/pick" className="text-2xl leading-none text-black">←</Link>
          <h2 className="text-lg font-semibold text-black">Delivery History</h2>
          <span style={{ color: '#452D9B' }}>🔽</span>
        </div>
      </header>

      {/* Status Filter Buttons */}
      <div className="px-4 pt-3 flex gap-3">
        <button
          onClick={() => handleStatusFilterChange('delivered')}
          className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white shadow-md"
          style={{ background: statusFilter === 'delivered' ? 'linear-gradient(to right, #10b981, #059669)' : 'linear-gradient(to right, #9ca3af, #6b7280)' }}
        >
          Delivered
        </button>
        <button
          onClick={() => handleStatusFilterChange('undelivered')}
          className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white shadow-md"
          style={{ background: statusFilter === 'undelivered' ? 'linear-gradient(to right, #ef4444, #dc2626)' : 'linear-gradient(to right, #9ca3af, #6b7280)' }}
        >
          Undelivered
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3">
        <input
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm outline-none"
          style={{ color: '#000' }}
          onFocus={(e) => { e.target.style.borderColor = '#452D9B'; e.target.style.boxShadow = '0 0 0 2px #452D9B'; }}
          onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
          placeholder="Search by Order ID or Customer"
        />
        <div className="mt-3 flex items-center gap-2">
          <button 
            onClick={() => handleFilterChange('all')}
            className="rounded-lg px-3 py-1 text-xs font-semibold"
            style={activeFilter === 'all' ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)', color: 'white' } : { background: '#e5e7eb', color: 'black' }}
          >
            All
          </button>
          <button 
            onClick={() => handleFilterChange('thisWeek')}
            className="rounded-lg px-3 py-1 text-xs font-semibold"
            style={activeFilter === 'thisWeek' ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)', color: 'white' } : { background: '#e5e7eb', color: 'black' }}
          >
            This Week
          </button>
          <button 
            onClick={() => handleFilterChange('lastWeek')}
            className="rounded-lg px-3 py-1 text-xs font-semibold"
            style={activeFilter === 'lastWeek' ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)', color: 'white' } : { background: '#e5e7eb', color: 'black' }}
          >
            Last Week
          </button>
          <button 
            onClick={() => handleFilterChange('thisMonth')}
            className="rounded-lg px-3 py-1 text-xs font-semibold"
            style={activeFilter === 'thisMonth' ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)', color: 'white' } : { background: '#e5e7eb', color: 'black' }}
          >
            This Month
          </button>
        </div>
      </div>

      {/* History cards */}
      {loading ? (
        <div className="mt-4 px-4 text-center text-gray-500">Loading...</div>
      ) : history.length > 0 ? (
        <div className="mt-4 px-4 flex flex-col gap-4">
          {history.map((order) => (
            <div key={order._id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-black">Order #{order.orderId}
                    {order.expressDelivery && <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>Express Delivery</span>}
                  </p>
                  <p className="text-xs text-gray-600 mt-2">{order.customerId?.name || 'Customer'}, <span className="text-black">{order.deliveryAddress?.street || order.pickupAddress?.street}, {order.deliveryAddress?.city || order.pickupAddress?.city}</span></p>
                  <p className="text-xs text-gray-600 mt-2">Delivered on: {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + new Date(order.deliveredAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}</p>
                </div>
                <span className={`rounded-full text-white px-3 py-1 text-xs font-semibold ${order.status === 'delivered' ? 'bg-green-500' : 'bg-red-500'}`}>
                  {order.status === 'delivered' ? 'Delivered' : 'Undelivered'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 300px)' }}>
          <div className="text-center">
            <Image src="/Delivery.svg" alt="Delivery" width={220} height={160} className="mx-auto" />
            <p className="mt-2 text-base font-semibold text-gray-800">No delivery history yet.</p>
            <p className="text-xs text-gray-600">Completed orders will appear here.</p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
