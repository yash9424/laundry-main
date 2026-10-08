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
import { applyBrandFonts } from './utils/brandFonts';
import { API_URL } from './config/api';
import VideoSplash from "./pages/VideoSplash";
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

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize order status monitoring
  useOrderStatusMonitor();

  // Open every screen at the top. React Router keeps the previous page's scroll
  // position, so arriving from a scrolled page — the long booking screen into the
  // order confirmation, for instance — dropped people into the middle of it.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    // #root is what actually scrolls: index.css gives it height 100dvh and
    // overflow-y auto, so the window itself never scrolls and scrolling it did
    // nothing at all. Nothing in the app carries data-scroll-container either,
    // which is why arriving at the order confirmation from the bottom of the
    // booking screen landed you at the bottom of the confirmation too.
    const root = document.getElementById('root');
    if (root) root.scrollTop = 0;
    document.querySelectorAll('[data-scroll-container]').forEach((el) => { el.scrollTop = 0; });
  }, [location.pathname]);

  // Check if user is logged in on app start
  useEffect(() => {
    const customerId = localStorage.getItem('customerId');
    const authToken = localStorage.getItem('authToken');

    if (customerId && authToken && (location.pathname === '/' || location.pathname === '/welcome')) {
      navigate('/home', { replace: true });
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
        <Route path="/" element={<VideoSplash />} />
        <Route path="/welcome" element={<Welcome />} />
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
    </>
  );
};

const App = () => {
  useEffect(() => {
    const initializeApp = async () => {
      // Initialize navigation detection first
      navigationDetector.init();
      applyBrandFonts();
      
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
          
          // Splash screen is hidden by VideoSplash when video is ready
          
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
