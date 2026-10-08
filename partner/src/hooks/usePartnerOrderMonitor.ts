'use client'

import { useEffect, useRef } from 'react';
import { useAuthId } from './useAuthId';
import { API_URL } from '@/config/api';

interface Order {
  _id: string;
  orderId: string;
  status: string;
  partnerId?: string | { _id?: string } | null;
  expressDelivery?: boolean;
  pickupAddress?: { pincode?: string };
}

// Send mobile push notification
const sendPartnerNotification = async (title: string, message: string, orderId: string, screen = '/pickups') => {
  try {
    if (window.Capacitor?.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      const permission = await LocalNotifications.requestPermissions();
      
      if (permission.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [{
            id: Math.floor(Math.random() * 100000),
            title,
            body: message,
            largeBody: message,
            summaryText: 'Urban Steam Partner',
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default',
            attachments: [],
            actionTypeId: 'PARTNER_ORDER_NOTIFICATION',
            extra: { orderId, screen },
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#452D9B',
            ongoing: false,
            autoCancel: true,
            channelId: 'partner-orders'
          }]
        });
        
        console.log('Partner notification sent:', title);
      }
    }
  } catch (error) {
    console.error('Failed to send partner notification:', error);
  }
};

export const usePartnerOrderMonitor = () => {
  const lastOrderStatuses = useRef<Map<string, { status: string, partnerId?: string }>>(new Map());
  const lastCheckedOrders = useRef<Set<string>>(new Set());
  const myPincodes = useRef<string[]>([]);

  // Watched, not read once: this used to start only at app launch, so a captain
  // who signed in afterwards got no notifications until the app was restarted,
  // and signing out left it polling under the previous captain's id.
  const partnerId = useAuthId('partnerId');

  useEffect(() => {
    // Whoever was here before is gone; nothing of theirs should carry over
    lastOrderStatuses.current = new Map();
    lastCheckedOrders.current = new Set();
    myPincodes.current = [];
    if (!partnerId) return;

    const loadMyPincodes = async () => {
      try {
        const response = await fetch(`${API_URL}/api/mobile/partners/${partnerId}`);
        const data = await response.json();
        if (data.success && data.data?.pincodes) {
          myPincodes.current = data.data.pincodes;
        }
      } catch (error) {
        console.error('Failed to load partner pincodes:', error);
      }
    };

    const checkPartnerOrders = async () => {
      try {
        // partnerScope asks the server for just this partner's orders plus the
        // unclaimed ones in their pincodes, instead of every order in the database.
        const response = await fetch(`${API_URL}/api/orders?partnerScope=${partnerId}`);
        const data = await response.json();

        if (data.success && data.data) {
          const orders: Order[] = data.data;

          orders.forEach((order) => {
            const lastOrderData = lastOrderStatuses.current.get(order.orderId);
            const currentStatus = order.status;
            // /api/orders populates partnerId as an object, so compare on its id, not the object
            const currentPartnerId = typeof order.partnerId === 'string' ? order.partnerId : order.partnerId?._id;
            const deliveryTag = order.expressDelivery ? ' (Express Delivery — 12hr)' : '';
            const isInMyArea = !!order.pickupAddress?.pincode && myPincodes.current.includes(order.pickupAddress.pincode);

            // New order placed in THIS partner's own service area (no partner assigned yet)
            if (currentStatus === 'pending' && !currentPartnerId && isInMyArea && !lastCheckedOrders.current.has(order._id)) {
              sendPartnerNotification(
                '🆕 New Order Available',
                `New pickup order #${order.orderId} available in your area${deliveryTag}. Tap to accept.`,
                order.orderId,
                '/pickups'
              );
              lastCheckedOrders.current.add(order._id);
            }

            // Order assigned to this partner
            if (!lastOrderData?.partnerId && currentPartnerId === partnerId) {
              sendPartnerNotification(
                '📦 Order Assigned',
                `Order #${order.orderId} assigned to you for pickup${deliveryTag}.`,
                order.orderId,
                '/pickups'
              );
            }

            // Order completed and ready for delivery
            if (lastOrderData?.status !== 'process_completed' &&
                currentStatus === 'process_completed' &&
                currentPartnerId === partnerId) {
              sendPartnerNotification(
                '✅ Ready for Delivery',
                `Order #${order.orderId} is processed and ready for delivery${deliveryTag}.`,
                order.orderId,
                '/delivery/pick'
              );
            }
            
            lastOrderStatuses.current.set(order.orderId, {
              status: currentStatus,
              partnerId: currentPartnerId
            });
          });
        }
      } catch (error) {
        console.error('Failed to check partner orders:', error);
      }
    };

    const poll = () => {
      // No point polling for a captain who is not looking; it only costs them
      // battery and data.
      if (document.hidden) return;
      checkPartnerOrders();
    };

    loadMyPincodes().then(poll);
    const interval = setInterval(poll, 10000);
    // Catch up as soon as they come back to the app
    document.addEventListener('visibilitychange', poll);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [partnerId]);
};