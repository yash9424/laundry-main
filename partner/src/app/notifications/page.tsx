'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from '@/config/api';
import PartnerNotificationService, { PartnerNotification } from '@/services/notificationService';

export default function Notifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<PartnerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPermissionRequest, setShowPermissionRequest] = useState(false);
  const notificationService = PartnerNotificationService.getInstance();

  useEffect(() => {
    checkNotificationPermission();
    fetchNotifications();
  }, []);

  const checkNotificationPermission = async () => {
    try {
      if (window.Capacitor?.isNativePlatform()) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const permission = await LocalNotifications.checkPermissions();
        
        if (permission.display !== 'granted') {
          setShowPermissionRequest(true);
        }
      } else if ('Notification' in window) {
        if (Notification.permission === 'default') {
          setShowPermissionRequest(true);
        }
      }
    } catch (error) {
      console.error('Error checking notification permission:', error);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      let granted = false;
      
      if (window.Capacitor?.isNativePlatform()) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const permission = await LocalNotifications.requestPermissions();
        granted = permission.display === 'granted';
      } else if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        granted = permission === 'granted';
      }
      
      if (granted) {
        setShowPermissionRequest(false);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const partnerId = localStorage.getItem('partnerId');
      if (!partnerId) {
        router.push('/login');
        return;
      }

      // Try to fetch real notifications from API
      try {
        const response = await fetch(`${API_URL}/api/mobile/notifications?audience=partners&partnerId=${partnerId}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          // Filter notifications using the service
          const filteredNotifications = notificationService.filterNotifications(data.data);
          setNotifications(filteredNotifications);
          return;
        }
      } catch (apiError) {
        console.log('API not available, using mock data');
      }
      
      // Fallback to mock notifications
      const mockNotifications = notificationService.getMockNotifications();
      const filteredNotifications = notificationService.filterNotifications(mockNotifications);
      setNotifications(filteredNotifications);
      
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Final fallback
      const mockNotifications = notificationService.getMockNotifications();
      const filteredNotifications = notificationService.filterNotifications(mockNotifications);
      setNotifications(filteredNotifications);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (id: string) => {
    notificationService.markAsRead(id);
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const deleteNotification = (id: string) => {
    notificationService.deleteNotification(id);
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'pickup': return '📦';
      case 'delivery': return '🚚';
      case 'payment': return '💰';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#452D9B' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 page-content">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="text-2xl leading-none text-black">←</button>
          <h2 className="text-lg font-semibold text-black">Notifications</h2>
          <span className="w-6" />
        </div>
      </header>

      <div className="px-4 py-6 space-y-4">
        {/* Notification Permission Request */}
        {showPermissionRequest && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🔔</div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-800 mb-2">Enable Notifications</h3>
                <p className="text-blue-700 text-sm mb-3">
                  Get instant updates about new orders and when orders are ready for delivery!
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={requestNotificationPermission}
                    className="bg-gradient-to-r from-[#452D9B] to-[#07C8D0] text-white px-4 py-2 rounded-xl text-sm font-semibold"
                  >
                    Allow Notifications
                  </button>
                  <button
                    onClick={() => setShowPermissionRequest(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Notifications</h3>
            <p className="text-gray-500">You're all caught up! New notifications will appear here.</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div 
              key={notification.id}
              className={`bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-shadow ${
                !notification.read ? 'border-l-4' : ''
              }`}
              style={!notification.read ? { borderLeftColor: '#452D9B' } : {}}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`font-semibold text-sm sm:text-base ${
                      !notification.read ? 'text-black' : 'text-gray-700'
                    }`}>
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className={`text-sm mt-1 cursor-pointer ${
                    !notification.read ? 'text-gray-700' : 'text-gray-500'
                  }`}
                    onClick={() => {
                      // Show full message in alert for now - can be replaced with modal
                      alert(`${notification.title}\n\n${notification.message}`);
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    {notification.message.length > 100 ? 
                      `${notification.message.substring(0, 100)}... (tap to read more)` : 
                      notification.message
                    }
                  </p>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: '#452D9B' }}></div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}