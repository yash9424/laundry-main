import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { App as CapApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import SafeAreaWrapper from './components/SafeAreaWrapper';
import ErrorBoundary from './components/ErrorBoundary';
import { useOrderStatusMonitor } from './hooks/useOrderStatusMonitor';
import { navigationDetector } from './utils/navigationDetection';
import { API_URL } from './config/api';
import Welcome from "./pages/Welcome";
import CheckAvailability from "./pages/CheckAvailability";
import Congrats from "./pages/Congrats";
import NotAvailable from "./pages/NotAvailable";
import Login from "./pages/Login";
import VerifyMobile from "./pages/VerifyMobile";
import Subscriptions from "./pages/Subscriptions";
import MySubscription from "./pages/MySubscription";

import CreateProfile from "./pages/CreateProfile";
import EditProfile from "./pages/EditProfile";
import Home from "./pages/Home";
import Prices from "./pages/Prices";
import Booking from "./pages/Booking";
import ContinueBooking from "./pages/ContinueBooking";
import BookingConfirmation from "./pages/BookingConfirmation";
import BookingHistory from "./pages/BookingHistory";
import OrderDetails from "./pages/OrderDetails";
import Profile from "./pages/Profile";
import AddAddress from "./pages/AddAddress";
import Cart from "./pages/Cart";
import Wallet from "./pages/Wallet";
import ReferEarn from "./pages/ReferEarn";
import RateOrder from "./pages/RateOrder";
import TermsConditions from "./pages/TermsConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const TopupModal = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/subscription-plans`)
      .then(r => r.json())
      .then(d => { if (d.success) setPlans(d.data.filter((p: any) => p.isActive)); })
      .catch(() => {});
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(69,45,155,0.3)' }}>
        <div style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>💳</div>
          <h2 style={{ color: 'white', fontWeight: '800', fontSize: '1.2rem', margin: 0 }}>Top-Up Your Wallet</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>Get more value on every order!</p>
        </div>

        {plans.length > 0 ? (
          <div style={{ display: 'flex', gap: '0.875rem', overflowX: 'auto', padding: '1.25rem', scrollSnapType: 'x mandatory' }}>
            {plans.map((plan) => (
              <div key={plan._id} style={{ minWidth: '200px', background: '#f8fafc', borderRadius: '16px', padding: '1rem', scrollSnapAlign: 'start', border: '1px solid rgba(69,45,155,0.1)', flexShrink: 0 }}>
                <h3 style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b', marginBottom: '0.5rem' }}>{plan.name}</h3>
                <div style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', borderRadius: '8px', padding: '0.4rem 0.75rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                  <span style={{ color: 'white', fontWeight: '700', fontSize: '0.85rem' }}>₹{plan.price} → ₹{plan.walletCredit}</span>
                </div>
                <ul style={{ paddingLeft: 0, marginBottom: 0 }}>
                  {plan.benefits.slice(0, 3).map((b: string, i: number) => (
                    <li key={i} style={{ display: 'flex', gap: '0.3rem', fontSize: '0.78rem', color: '#475569', marginBottom: '0.2rem' }}>
                      <span style={{ color: '#07C8D0', fontWeight: '800' }}>✓</span>{b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading plans...</div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', padding: '0 1.25rem 1.25rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' }}>
            Skip
          </button>
          <button onClick={() => { onClose(); navigate('/subscriptions'); }} style={{ flex: 2, padding: '0.75rem', background: 'linear-gradient(to right, #452D9B, #07C8D0)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}>
            View All Plans
          </button>
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showTopupModal, setShowTopupModal] = useState(false);

  // Initialize order status monitoring
  useOrderStatusMonitor();

  // Check if user is logged in on app start
  useEffect(() => {
    const customerId = localStorage.getItem('customerId');
    const authToken = localStorage.getItem('authToken');

    if (customerId && authToken && location.pathname === '/') {
      navigate('/home', { replace: true });
    }
  }, []);

  useEffect(() => {
    const customerId = localStorage.getItem('customerId');
    const seen = localStorage.getItem('hasSeenTopupModal');
    if (customerId && !seen) {
      setShowTopupModal(true);
    }
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      let backButtonListener: PluginListenerHandle | null = null;
      
      CapApp.addListener('backButton', ({ canGoBack }) => {
        const currentPath = location.pathname;
        
        // Define main pages where back should exit app
        const mainPages = ['/home', '/prices', '/cart', '/booking-history', '/profile'];
        
        if (mainPages.includes(currentPath)) {
          CapApp.exitApp();
        } else if (canGoBack) {
          navigate(-1);
        } else {
          // If can't go back, go to home instead of exiting
          navigate('/home', { replace: true });
        }
      }).then(listener => {
        backButtonListener = listener;
      });

      return () => {
        if (backButtonListener) {
          backButtonListener.remove();
        }
      };
    }
  }, [navigate, location.pathname]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/check-availability" element={<CheckAvailability />} />
        <Route path="/congrats" element={<Congrats />} />
        <Route path="/not-available" element={<NotAvailable />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-mobile" element={<VerifyMobile />} />

        <Route path="/create-profile" element={<CreateProfile />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/home" element={<Home />} />
        <Route path="/prices" element={<Prices />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/continue-booking" element={<ContinueBooking />} />
        <Route path="/booking-confirmation" element={<BookingConfirmation />} />
        <Route path="/booking-history" element={<BookingHistory />} />
        <Route path="/order-details" element={<OrderDetails />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/add-address" element={<AddAddress />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/refer-earn" element={<ReferEarn />} />
        <Route path="/rate-order/:orderId" element={<RateOrder />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/my-subscription" element={<MySubscription />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showTopupModal && (
        <TopupModal onClose={() => { localStorage.setItem('hasSeenTopupModal', '1'); setShowTopupModal(false); }} />
      )}
    </>
  );
};

const App = () => {
  useEffect(() => {
    const initializeApp = async () => {
      // Initialize navigation detection first
      navigationDetector.init();
      
      if (Capacitor.isNativePlatform()) {
        try {
          // Configure StatusBar
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setOverlaysWebView({ overlay: false });
          await StatusBar.setBackgroundColor({ color: '#452D9B' });
          
          // Request ONLY notification permission on app start
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          await LocalNotifications.requestPermissions();
          
          // Initialize notification channel
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
          
          // Clear old notifications
          await LocalNotifications.removeAllDeliveredNotifications();
          
          // Listen for notification taps
          await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
            if (notification.notification.extra?.orderId) {
              window.dispatchEvent(new CustomEvent('notificationTap', {
                detail: { orderId: notification.notification.extra.orderId }
              }));
            }
          });
          
          // Set viewport
          const viewport = document.querySelector('meta[name="viewport"]');
          if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
          }
          
          // Hide splash screen
          setTimeout(async () => {
            await SplashScreen.hide();
          }, 1000);
          
        } catch (error) {
          console.error('Initialization error:', error);
        }
      }
    };
    
    initializeApp();
  }, []);
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SafeAreaWrapper>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </SafeAreaWrapper>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
