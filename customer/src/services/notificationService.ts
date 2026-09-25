import { API_URL } from '@/config/api';

export interface OrderNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'order_status' | 'promotion' | 'system';
  orderId?: string;
  orderStatus?: string;
}

// Order status notification templates
const statusNotifications = {
  'pending': {
    title: '📋 Order Confirmed',
    message: 'Your order has been confirmed and is being prepared for pickup.'
  },
  'reached_location': {
    title: '🚗 Partner Reached Location',
    message: 'Our delivery partner has reached your pickup location.'
  },
  'picked_up': {
    title: '📦 Order Picked Up',
    message: 'Your order has been picked up and is on the way to our processing hub.'
  },
  'delivered_to_hub': {
    title: '🏭 Order at Processing Hub',
    message: 'Your order has been delivered to our processing hub and will be processed soon.'
  },
  'process_completed': {
    title: '✨ Processing Complete',
    message: 'Your order has been processed and is ready for delivery.'
  },
  'out_for_delivery': {
    title: '🚚 Out for Delivery',
    message: 'Great news! Your order is out for delivery and will reach you soon.'
  },
  'delivered': {
    title: '🎉 Order Delivered Successfully',
    message: 'Your order has been successfully delivered. Thank you for choosing Urban Steam!'
  },
  'cancelled': {
    title: '❌ Order Cancelled',
    message: 'Your order has been cancelled. If you have any questions, please contact support.'
  },
  'delivery_failed': {
    title: '⚠️ Delivery Failed',
    message: 'We were unable to deliver your order. Our team will contact you to reschedule delivery.'
  },
  'suspended': {
    title: '🚫 Order Suspended',
    message: 'Your order has been suspended due to multiple delivery failures. Please contact support.'
  }
};

class NotificationService {
  private static instance: NotificationService;
  private notifications: OrderNotification[] = [];
  private listeners: ((notifications: OrderNotification[]) => void)[] = [];

  private constructor() {
    this.loadNotifications();
    this.init();
  }

  // Initialize notifications (permissions & channel)
  async init() {
    try {
      if (window.Capacitor?.isNativePlatform()) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        
        // Create channel immediately
        await LocalNotifications.createChannel({
          id: 'order-updates',
          name: 'Order Updates',
          description: 'Notifications for order status updates',
          sound: 'default',
          importance: 5,
          visibility: 1,
          lights: true,
          lightColor: '#452D9B',
          vibration: true
        });

        // Request permissions immediately
        await LocalNotifications.requestPermissions();
      } else if ('Notification' in window) {
        // Request browser permission
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          await Notification.requestPermission();
        }
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Subscribe to notification updates
  subscribe(callback: (notifications: OrderNotification[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  // Load notifications from localStorage
  loadNotifications() {
    try {
      const stored = localStorage.getItem('customer_notifications');
      if (stored) {
        const allNotifications = JSON.parse(stored);
        const clearedIds = this.getClearedNotificationIds();
        const deletedIds = this.getDeletedNotificationIds();
        
        // Filter out cleared and deleted notifications
        this.notifications = allNotifications.filter((notif: OrderNotification) => {
          const clearedKey = `${notif.orderId}_${notif.orderStatus}`;
          return !clearedIds.includes(clearedKey) && !deletedIds.includes(notif.id);
        });
        
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  // Save notifications to localStorage
  private saveNotifications() {
    try {
      localStorage.setItem('customer_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }

  // Add a new notification
  private addNotification(notification: OrderNotification) {
    // Check if notification already exists
    const exists = this.notifications.find(n => 
      n.orderId === notification.orderId && 
      n.orderStatus === notification.orderStatus
    );
    
    if (exists) return;

    // Check if cleared
    const clearedIds = this.getClearedNotificationIds();
    const clearedKey = `${notification.orderId}_${notification.orderStatus}`;
    if (clearedIds.includes(clearedKey)) return;

    this.notifications.unshift(notification);
    
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.saveNotifications();
    this.notifyListeners();
    
    // Send to mobile drawer immediately
    this.sendMobilePushNotification(notification);

    // Show in-app toast for "Live" feel
    toast(notification.title, {
      description: notification.message,
      duration: 4000,
      action: notification.orderId ? {
        label: "View",
        onClick: () => {
           const event = new CustomEvent('notificationClick', {
            detail: { orderId: notification.orderId }
          });
          window.dispatchEvent(event);
        }
      } : undefined,
    });
  }

  // Create order status notification
  createOrderStatusNotification(orderId: string, status: string, isExpressDelivery?: boolean) {
    const template = statusNotifications[status as keyof typeof statusNotifications];
    if (!template) return;

    const notificationId = `order_${orderId}_${status}_${Date.now()}`;
    const deliveryTag = isExpressDelivery ? ' — Express Delivery' : '';

    const notification: OrderNotification = {
      id: notificationId,
      title: template.title,
      message: `${template.message} (Order #${orderId}${deliveryTag})`,
      type: 'order_status',
      orderId,
      orderStatus: status,
      timestamp: new Date().toISOString(),
      read: false
    };

    // Add to notifications (will auto-send to mobile drawer)
    this.addNotification(notification);
    
    // Send browser notification
    this.showBrowserNotification(notification);
  }

  // Public method to create and send notification immediately
  async sendImmediateNotification(title: string, message: string, orderId?: string, status?: string) {
    const notification: OrderNotification = {
      id: `immediate_${Date.now()}`,
      title,
      message,
      type: 'order_status',
      orderId,
      orderStatus: status,
      timestamp: new Date().toISOString(),
      read: false
    };

    this.addNotification(notification);
    await this.sendMobilePushNotification(notification);
    this.showBrowserNotification(notification);
  }

  // Create promotion notification
  createPromotionNotification(title: string, message: string) {
    const notification: OrderNotification = {
      id: `promotion_${Date.now()}`,
      title: `🎉 ${title}`,
      message,
      type: 'promotion',
      timestamp: new Date().toISOString(),
      read: false
    };

    this.addNotification(notification);
    this.sendMobilePushNotification(notification);
    this.showBrowserNotification(notification);
  }

  // Create system notification
  createSystemNotification(title: string, message: string) {
    const notification: OrderNotification = {
      id: `system_${Date.now()}`,
      title: `⚙️ ${title}`,
      message,
      type: 'system',
      timestamp: new Date().toISOString(),
      read: false
    };

    this.addNotification(notification);
    this.sendMobilePushNotification(notification);
    this.showBrowserNotification(notification);
  }

  // Mark all notifications as read
  markAllAsRead() {
    // Mark all as read
    this.notifications = this.notifications.map(notif => ({ ...notif, read: true }));
    
    // Also save them as cleared to prevent re-showing
    this.notifications.forEach(notif => {
      if (notif.orderId && notif.orderStatus) {
        this.saveClearedNotificationId(`${notif.orderId}_${notif.orderStatus}`);
      }
      this.saveDeletedNotificationId(notif.id);
    });
    
    this.saveNotifications();
    this.notifyListeners();
  }

  // Clear all notifications permanently
  clearAllNotifications() {
    // Save ALL notification keys to prevent showing again
    this.notifications.forEach(notif => {
      // Save the notification ID itself
      this.saveDeletedNotificationId(notif.id);
      
      // If it's an order notification, also save the order+status combo
      if (notif.orderId && notif.orderStatus) {
        this.saveClearedNotificationId(`${notif.orderId}_${notif.orderStatus}`);
        // Clear from mobile system drawer
        this.clearMobileNotification(notif.orderId, notif.orderStatus);
      }
    });
    
    // Clear all notifications from app
    this.notifications = [];
    this.saveNotifications();
    this.notifyListeners();
    
    // Clear all from mobile system drawer
    this.clearAllMobileNotifications();
  }

  // Mark notification as read
  markAsRead(id: string) {
    this.notifications = this.notifications.map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    );
    this.saveNotifications();
    this.notifyListeners();
  }

  // Get cleared notification IDs
  private getClearedNotificationIds(): string[] {
    try {
      const cleared = localStorage.getItem('cleared_notifications');
      return cleared ? JSON.parse(cleared) : [];
    } catch (error) {
      return [];
    }
  }

  // Save cleared notification ID
  private saveClearedNotificationId(key: string) {
    try {
      const clearedIds = this.getClearedNotificationIds();
      if (!clearedIds.includes(key)) {
        clearedIds.push(key);
        localStorage.setItem('cleared_notifications', JSON.stringify(clearedIds));
      }
    } catch (error) {
      console.error('Failed to save cleared notification ID:', error);
    }
  }

  // Delete notification permanently
  deleteNotification(id: string) {
    // Find the notification to get its details
    const notification = this.notifications.find(n => n.id === id);
    
    // Save to deleted list so it won't show again
    this.saveDeletedNotificationId(id);
    
    // If it's an order notification, also save the order+status combo
    if (notification?.orderId && notification?.orderStatus) {
      this.saveClearedNotificationId(`${notification.orderId}_${notification.orderStatus}`);
      // Clear from mobile system drawer
      this.clearMobileNotification(notification.orderId, notification.orderStatus);
    }
    
    // Remove from current notifications
    this.notifications = this.notifications.filter(notif => notif.id !== id);
    
    this.saveNotifications();
    this.notifyListeners();
  }

  // Get all notifications
  getNotifications(): OrderNotification[] {
    return this.notifications;
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter(notif => !notif.read).length;
  }

  // Get pushed notification keys
  private getPushedNotificationKeys(): string[] {
    try {
      const pushed = localStorage.getItem('pushed_notifications');
      return pushed ? JSON.parse(pushed) : [];
    } catch (error) {
      return [];
    }
  }

  // Save pushed notification key
  private savePushedNotificationKey(key: string) {
    try {
      const pushedKeys = this.getPushedNotificationKeys();
      if (!pushedKeys.includes(key)) {
        pushedKeys.push(key);
        localStorage.setItem('pushed_notifications', JSON.stringify(pushedKeys));
      }
    } catch (error) {
      console.error('Failed to save pushed notification key:', error);
    }
  }

  // Send mobile push notification using Capacitor
  private async sendMobilePushNotification(notification: OrderNotification) {
    try {
      if (window.Capacitor?.isNativePlatform()) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        
        let permission = await LocalNotifications.checkPermissions();
        
        // Request permission if not granted
        if (permission.display !== 'granted') {
            permission = await LocalNotifications.requestPermissions();
        }
        
        if (permission.display === 'granted') {
          const pushedKeys = this.getPushedNotificationKeys();
          const deletedIds = this.getDeletedNotificationIds();
          
          // 1. Check if deleted
          if (deletedIds.includes(notification.id)) return;
          
          // 2. Check if already pushed (by ID) - Global Check
          if (pushedKeys.includes(notification.id)) return;

          // 3. Check Order Status Logic
          if (notification.orderId && notification.orderStatus) {
            const clearedIds = this.getClearedNotificationIds();
            const notificationKey = `${notification.orderId}_${notification.orderStatus}`;
            
            if (clearedIds.includes(notificationKey) || pushedKeys.includes(notificationKey)) {
              return;
            }
            
            // Mark logic key as pushed
            this.savePushedNotificationKey(notificationKey);
          }
          
          // Mark ID as pushed
          this.savePushedNotificationKey(notification.id);
          
          // Ensure channel exists before scheduling
          await LocalNotifications.createChannel({
            id: 'order-updates',
            name: 'Order Updates',
            description: 'Notifications for order status updates',
            sound: 'default',
            importance: 5,
            visibility: 1,
            lights: true,
            lightColor: '#452D9B',
            vibration: true
          });
          
          const notificationId = Math.floor(Math.random() * 2147483647);
          
          await LocalNotifications.schedule({
            notifications: [{
              id: notificationId,
              title: notification.title,
              body: notification.message,
              summaryText: 'Urban Steam',
              schedule: { at: new Date(Date.now() + 100) }, // Reduced delay
              sound: 'default',
              smallIcon: 'ic_notification_custom',
              largeIcon: 'ic_notification_custom',
              iconColor: '#452D9B',
              channelId: 'order-updates',
              extra: {
                orderId: notification.orderId,
                notificationId: notification.id,
                orderStatus: notification.orderStatus
              },
              actionTypeId: 'ORDER_ACTION',
              ongoing: false,
              autoCancel: true
            }]
          });
          
          console.log('Mobile notification sent:', notificationId);
        }
      }
    } catch (error) {
      console.error('Mobile notification failed:', error);
    }
  }

  // Show browser notification
  private showBrowserNotification(notification: OrderNotification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotif = new Notification(notification.title, {
        body: notification.message,
        icon: '/APP ICON.png',
        badge: '/APP ICON.png',
        tag: notification.id,
        requireInteraction: true
      });
      
      // Auto close after 5 seconds
      setTimeout(() => browserNotif.close(), 5000);
      
      // Handle click to navigate to order details
      browserNotif.onclick = () => {
        if (notification.orderId) {
          window.focus();
          // Navigate to order details if possible
          const event = new CustomEvent('notificationClick', {
            detail: { orderId: notification.orderId }
          });
          window.dispatchEvent(event);
        }
        browserNotif.close();
      };
    }
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    try {
      // For mobile apps using Capacitor
      if (window.Capacitor?.isNativePlatform()) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const permission = await LocalNotifications.requestPermissions();
        return permission.display === 'granted';
      }
      
      // For web browsers
      if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return false;
      }

      if (Notification.permission === 'granted') {
        return true;
      }

      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }

      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Fetch notifications from server (for future server-side notifications)
  async fetchServerNotifications() {
    try {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) return;

      const response = await fetch(`${API_URL}/api/mobile/notifications?audience=customers&customerId=${customerId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        // Get list of deleted notification IDs for this user
        const deletedIds = this.getDeletedNotificationIds();
        // Get list of cleared notification keys (orderId_status)
        const clearedIds = this.getClearedNotificationIds();
        
        // Filter out deleted and cleared notifications
        const serverNotifications = data.data
          .filter((notif: any) => {
            // 1. Check if globally deleted
            if (deletedIds.includes(notif.id)) return false;
            
            // 2. Check if cleared (for order notifications)
            if (notif.orderId && notif.orderStatus) {
              const key = `${notif.orderId}_${notif.orderStatus}`;
              if (clearedIds.includes(key)) return false;
            }
            
            return true;
          })
          .map((notif: any) => ({
            id: notif.id,
            title: notif.title,
            message: notif.message,
            timestamp: notif.timestamp,
            read: false,
            type: notif.type || 'system',
            orderId: notif.orderId,
            orderStatus: notif.orderStatus
          }));

        // Add server notifications that don't exist locally
        serverNotifications.forEach((serverNotif: OrderNotification) => {
          if (!this.notifications.find(local => local.id === serverNotif.id)) {
            this.notifications.unshift(serverNotif);
            // Trigger push for new server notifications
            this.sendMobilePushNotification(serverNotif);
          }
        });

        this.saveNotifications();
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to fetch server notifications:', error);
    }
  }

  // Get deleted notification IDs for this user
  private getDeletedNotificationIds(): string[] {
    try {
      const deleted = localStorage.getItem('deleted_notifications');
      return deleted ? JSON.parse(deleted) : [];
    } catch (error) {
      return [];
    }
  }

  // Save deleted notification ID
  private saveDeletedNotificationId(id: string) {
    try {
      const deletedIds = this.getDeletedNotificationIds();
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('deleted_notifications', JSON.stringify(deletedIds));
      }
    } catch (error) {
      console.error('Failed to save deleted notification ID:', error);
    }
  }

  // Clear specific mobile notification from system drawer
  private async clearMobileNotification(orderId: string, orderStatus: string) {
    try {
      if (window.Capacitor?.isNativePlatform()) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        // Get all delivered notifications and remove matching ones
        const delivered = await LocalNotifications.getDeliveredNotifications();
        const toRemove = delivered.notifications.filter(n => 
          n.extra?.orderId === orderId && n.body?.includes(orderStatus)
        );
        
        if (toRemove.length > 0) {
          await LocalNotifications.removeDeliveredNotifications({
            notifications: toRemove.map(n => ({ id: n.id }))
          });
        }
      }
    } catch (error) {
      console.error('Failed to clear mobile notification:', error);
    }
  }

  // Clear all mobile notifications from system drawer
  private async clearAllMobileNotifications() {
    try {
      if (window.Capacitor?.isNativePlatform()) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.removeAllDeliveredNotifications();
      }
    } catch (error) {
      console.error('Failed to clear all mobile notifications:', error);
    }
  }
}

export default NotificationService;