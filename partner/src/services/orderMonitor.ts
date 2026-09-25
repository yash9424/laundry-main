'use client'

import { API_URL } from '@/config/api';
import PartnerNotificationService from './notificationService';

class PartnerOrderMonitor {
  private static instance: PartnerOrderMonitor;
  private intervalId: NodeJS.Timeout | null = null;
  private notificationService = PartnerNotificationService.getInstance();
  private lastCheckedOrders: string[] = [];

  static getInstance(): PartnerOrderMonitor {
    if (!PartnerOrderMonitor.instance) {
      PartnerOrderMonitor.instance = new PartnerOrderMonitor();
    }
    return PartnerOrderMonitor.instance;
  }

  startMonitoring(): void {
    if (this.intervalId) return;
    
    console.log('Starting partner order monitoring...');
    this.checkForNewOrders(); // Check immediately
    this.intervalId = setInterval(() => {
      this.checkForNewOrders();
    }, 30000); // Check every 30 seconds
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Stopped partner order monitoring');
    }
  }

  private async checkForNewOrders(): Promise<void> {
    try {
      const partnerId = localStorage.getItem('partnerId');
      if (!partnerId) return;

      // Get partner's service areas
      const partnerResponse = await fetch(`${API_URL}/api/partners/${partnerId}`);
      if (!partnerResponse.ok) return;
      
      const partnerData = await partnerResponse.json();
      const serviceAreas = partnerData.data?.serviceAreas || [];
      
      if (serviceAreas.length === 0) return;

      // Check for new pickup orders in partner's areas
      await this.checkPickupOrders(serviceAreas);
      
      // Check for delivery-ready orders
      await this.checkDeliveryOrders(partnerId);

    } catch (error) {
      console.log('Order monitoring check failed:', error);
    }
  }

  private async checkPickupOrders(serviceAreas: string[]): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/api/orders?status=pending&areas=${serviceAreas.join(',')}`);
      if (!response.ok) return;

      const data = await response.json();
      if (!data.success) return;

      const newOrders = data.data.filter((order: any) => 
        !this.lastCheckedOrders.includes(order._id) && 
        !order.partnerId // Not assigned to any partner yet
      );

      newOrders.forEach((order: any) => {
        this.sendPickupNotification(order);
        this.lastCheckedOrders.push(order._id);
      });

    } catch (error) {
      console.log('Failed to check pickup orders:', error);
    }
  }

  private async checkDeliveryOrders(partnerId: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/api/orders?partnerId=${partnerId}&status=ready_for_delivery`);
      if (!response.ok) return;

      const data = await response.json();
      if (!data.success) return;

      const readyOrders = data.data.filter((order: any) => 
        !this.lastCheckedOrders.includes(`delivery_${order._id}`)
      );

      readyOrders.forEach((order: any) => {
        this.sendDeliveryNotification(order);
        this.lastCheckedOrders.push(`delivery_${order._id}`);
      });

    } catch (error) {
      console.log('Failed to check delivery orders:', error);
    }
  }

  private sendPickupNotification(order: any): void {
    const notification = {
      id: `pickup_${order._id}_${Date.now()}`,
      title: 'New Pickup Available',
      message: `Order #${order.orderId} needs pickup from ${order.pickupAddress?.area || 'your area'}${order.expressDelivery ? ' (Express Delivery — 12hr)' : ''}. Tap to accept.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'pickup' as const,
      orderId: order._id
    };

    // Add to notification service
    const mockNotifications = this.notificationService.getMockNotifications();
    mockNotifications.unshift(notification);
    
    // Show native notification if permission granted
    this.showNativeNotification(notification.title, notification.message);
  }

  private sendDeliveryNotification(order: any): void {
    const notification = {
      id: `delivery_${order._id}_${Date.now()}`,
      title: 'Ready for Delivery',
      message: `Order #${order.orderId} is processed and ready for delivery to ${order.deliveryAddress?.area || 'customer'}${order.expressDelivery ? ' (Express Delivery — 12hr)' : ''}.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'delivery' as const,
      orderId: order._id
    };

    // Add to notification service
    const mockNotifications = this.notificationService.getMockNotifications();
    mockNotifications.unshift(notification);
    
    // Show native notification if permission granted
    this.showNativeNotification(notification.title, notification.message);
  }

  private async showNativeNotification(title: string, message: string): Promise<void> {
    try {
      if (window.Capacitor?.isNativePlatform()) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.schedule({
          notifications: [{
            title,
            body: message,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 1000) }
          }]
        });
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: message });
      }
    } catch (error) {
      console.log('Failed to show native notification:', error);
    }
  }
}

export default PartnerOrderMonitor;