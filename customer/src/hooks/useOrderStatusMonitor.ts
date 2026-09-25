import { useEffect, useRef } from 'react';
import { API_URL } from '@/config/api';
import NotificationService from '@/services/notificationService';

interface Order {
  _id: string;
  orderId: string;
  status: string;
  customerId: string;
  expressDelivery?: boolean;
}

// Statuses that should trigger notifications
const NOTIFICATION_STATUSES = [
  'pending',
  'reached_location',
  'picked_up',
  'delivered_to_hub',
  'process_completed',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'delivery_failed',
  'suspended'
];

export const useOrderStatusMonitor = () => {
  const lastOrderStatuses = useRef<Map<string, string>>(new Map());
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    const customerId = localStorage.getItem('customerId');
    if (!customerId) return;

    // Request notification permission on first load
    notificationService.requestPermission();

    const checkOrderStatuses = async () => {
      try {
        const response = await fetch(`${API_URL}/api/orders?customerId=${customerId}`);
        const data = await response.json();
        
        if (data.success && data.data && Array.isArray(data.data)) {
          const orders: Order[] = data.data;
          
          orders.forEach((order) => {
            const lastStatus = lastOrderStatuses.current.get(order.orderId);
            const currentStatus = order.status;
            
            // Create notification for ALL notification-worthy statuses
            if (NOTIFICATION_STATUSES.includes(currentStatus)) {
              if (!lastStatus || (lastStatus !== currentStatus)) {
                console.log(`Creating notification: ${order.orderId} -> ${currentStatus}`);
                notificationService.createOrderStatusNotification(order.orderId, currentStatus, order.expressDelivery);
              }
            }
            
            // Update the last known status
            lastOrderStatuses.current.set(order.orderId, currentStatus);
          });
        }
      } catch (error) {
        console.error('Failed to check order statuses:', error);
      }
    };

    // Initial check
    checkOrderStatuses();
    // Also check server notifications immediately
    notificationService.fetchServerNotifications();

    // Set up polling every 2 seconds for faster updates
    const interval = setInterval(() => {
      checkOrderStatuses();
      notificationService.fetchServerNotifications();
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return {
    // Manually trigger a status check
    checkNow: async () => {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) return;

      try {
        const response = await fetch(`${API_URL}/api/orders?customerId=${customerId}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          const orders: Order[] = data.data;
          
          orders.forEach((order) => {
            const lastStatus = lastOrderStatuses.current.get(order.orderId);
            const currentStatus = order.status;
            
            if (lastStatus && lastStatus !== currentStatus && NOTIFICATION_STATUSES.includes(currentStatus)) {
              notificationService.createOrderStatusNotification(order.orderId, currentStatus, order.expressDelivery);
            }
            
            lastOrderStatuses.current.set(order.orderId, currentStatus);
          });
        }
      } catch (error) {
        console.error('Failed to check order statuses:', error);
      }
    }
  };
};