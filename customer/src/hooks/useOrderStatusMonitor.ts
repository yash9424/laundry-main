import { useEffect, useRef } from 'react';
import { API_URL } from '@/config/api';
import NotificationService from '@/services/notificationService';
import { useAuthId } from './useAuthId';

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
  // Watched, not read once: this used to start only at app launch, so signing
  // in brought no notifications until the app was restarted, and signing out
  // left it polling under the previous customer's id.
  const customerId = useAuthId('customerId');

  useEffect(() => {
    // Whoever was here before is gone; their statuses must not carry over
    lastOrderStatuses.current = new Map();
    if (!customerId) return;

    notificationService.loadNotifications();
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

    const poll = () => {
      // Nothing to report to someone who is not looking, and polling in the
      // background only costs the customer battery and data.
      if (document.hidden) return;
      checkOrderStatuses();
      notificationService.fetchServerNotifications();
    };

    poll();
    const interval = setInterval(poll, 2000);
    // Catch up the moment they come back to the app
    document.addEventListener('visibilitychange', poll);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [customerId]);

  return {
    // Manually trigger a status check
    checkNow: async () => {
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