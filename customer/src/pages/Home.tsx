import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Minus, Plus, Home as HomeIcon, Tag, ShoppingCart, RotateCcw, User } from "lucide-react";
import homeScreenImage from "@/assets/Home screen.png";
import { API_URL } from '@/config/api';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import BottomNavigation from "@/components/BottomNavigation";

const Home = () => {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [userName, setUserName] = useState('Guest');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [currentVoucher, setCurrentVoucher] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [isVoucherAutoScrolling, setIsVoucherAutoScrolling] = useState(true);
  const [vouchers, setVouchers] = useState([]);
  const [customerAddress, setCustomerAddress] = useState(() => {
    const cached = localStorage.getItem('cachedAddress');
    return cached || 'No address added yet';
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const voucherScrollRef = useRef<HTMLDivElement>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [heroItems, setHeroItems] = useState([]);
  const [currentHero, setCurrentHero] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [voucherTouchStart, setVoucherTouchStart] = useState(0);
  const [voucherTouchEnd, setVoucherTouchEnd] = useState(0);

  // Handle hero swipe
  const handleHeroTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsAutoScrolling(false);
  };

  const handleHeroTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleHeroTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setCurrentHero(prev => (prev + 1) % heroItems.length);
    }
    if (isRightSwipe) {
      setCurrentHero(prev => prev === 0 ? heroItems.length - 1 : prev - 1);
    }
  };

  // Handle voucher swipe
  const handleVoucherTouchStart = (e: React.TouchEvent) => {
    setVoucherTouchStart(e.targetTouches[0].clientX);
    setIsVoucherAutoScrolling(false);
  };

  const handleVoucherTouchMove = (e: React.TouchEvent) => {
    setVoucherTouchEnd(e.targetTouches[0].clientX);
  };

  const handleVoucherTouchEnd = () => {
    if (!voucherTouchStart || !voucherTouchEnd) return;
    const distance = voucherTouchStart - voucherTouchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setCurrentVoucher(prev => (prev + 1) % vouchers.length);
    }
    if (isRightSwipe) {
      setCurrentVoucher(prev => prev === 0 ? vouchers.length - 1 : prev - 1);
    }
  };

  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    setUserName(savedName || 'Guest');

    const handleStorageChange = () => {
      const updatedName = localStorage.getItem('userName');
      if (updatedName) {
        setUserName(updatedName);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userNameChanged', handleStorageChange);

    fetchVouchers();
    fetchCustomerData();
    fetchRecentOrders();
    fetchHeroItems();

    // Handle hardware back button
    if (Capacitor.isNativePlatform()) {
      const handleBackButton = App.addListener('backButton', () => {
        // On home page, minimize app instead of closing
        App.minimizeApp();
      });
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('userNameChanged', handleStorageChange);
        handleBackButton.remove();
      };
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userNameChanged', handleStorageChange);
    };
  }, []);

  const fetchVouchers = async () => {
    try {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) {
        // If no customer ID, fetch all vouchers
        const response = await fetch(`${API_URL}/api/vouchers`);
        const data = await response.json();
        if (data.success) {
          setVouchers(data.data);
        }
        return;
      }
      
      // Fetch only available vouchers for this customer
      const response = await fetch(`${API_URL}/api/vouchers/available?customerId=${customerId}`);
      const data = await response.json();
      if (data.success) {
        setVouchers(data.data);
      }
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    }
  };
  
  const fetchCustomerData = async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    
    try {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) return;
      
      const response = await fetch(`${API_URL}/api/mobile/profile?customerId=${customerId}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId)
      const data = await response.json();
      
      if (data.success && data.data) {
        if (data.data.address?.[0]) {
          const address = data.data.address[0];
          const addressText = `${address.street || ''}, ${address.city || ''}, ${address.state || ''} - ${address.pincode || ''}`;
          const finalAddress = addressText.replace(/^, |, $/, '');
          setCustomerAddress(finalAddress);
          localStorage.setItem('cachedAddress', finalAddress);
        }
        if (data.data.profileImage) {
          setProfileImage(data.data.profileImage);
        }
      }
    } catch (error) {
      clearTimeout(timeoutId)
    }
  };
  
  const fetchRecentOrders = async () => {
    try {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) return;
      
      const response = await fetch(`${API_URL}/api/orders?customerId=${customerId}`);
      const data = await response.json();
      
      if (data.success) {
        // Get only the 3 most recent orders
        setRecentOrders(data.data.slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching recent orders:', error);
    }
  };
  
  const fetchHeroItems = async () => {
    try {
      console.log('Fetching hero items from:', `${API_URL}/api/hero-section`);
      const response = await fetch(`${API_URL}/api/hero-section`);
      console.log('Hero response status:', response.status);
      const data = await response.json();
      console.log('Hero data:', data);
      if (data.success && data.data && data.data.length > 0) {
        // Convert relative URLs to full URLs
        const itemsWithFullUrls = data.data.map((item: any) => ({
          ...item,
          url: item.url.startsWith('http') ? item.url : `${API_URL}${item.url}`
        }));
        console.log('Setting hero items with full URLs:', itemsWithFullUrls);
        setHeroItems(itemsWithFullUrls);
      } else {
        console.log('No hero items found or API returned empty');
      }
    } catch (error) {
      console.error('Error fetching hero items:', error);
    }
  };
  
  // Auto-scroll hero items with pause on interaction
  useEffect(() => {
    if (heroItems.length <= 1 || !isAutoScrolling) return;
    const interval = setInterval(() => {
      setCurrentHero(prev => (prev + 1) % heroItems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroItems.length, isAutoScrolling]);
  
  // Resume hero auto-scroll after 6 seconds of no interaction
  useEffect(() => {
    if (!isAutoScrolling) {
      const timeout = setTimeout(() => {
        setIsAutoScrolling(true);
      }, 6000);
      return () => clearTimeout(timeout);
    }
  }, [isAutoScrolling]);
  
  // Auto-scroll vouchers only if not manually controlled
  useEffect(() => {
    if (!isVoucherAutoScrolling || vouchers.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentVoucher(prev => (prev + 1) % vouchers.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [vouchers.length, isVoucherAutoScrolling]);
  
  // Scroll to current voucher only during auto-scroll
  useEffect(() => {
    if (scrollRef.current && isAutoScrolling) {
      const scrollWidth = scrollRef.current.scrollWidth / vouchers.length;
      scrollRef.current.scrollTo({
        left: currentVoucher * scrollWidth,
        behavior: 'smooth'
      });
    }
  }, [currentVoucher, vouchers.length, isAutoScrolling]);
  
  // Handle manual voucher scroll
  const handleVoucherScroll = () => {
    if (!voucherScrollRef.current || isVoucherAutoScrolling) return;
    
    const scrollLeft = voucherScrollRef.current.scrollLeft;
    const cardWidth = voucherScrollRef.current.scrollWidth / vouchers.length;
    const newIndex = Math.round(scrollLeft / cardWidth);
    
    if (newIndex !== currentVoucher) {
      setCurrentVoucher(newIndex);
    }
  };
  
  // Detect manual voucher interaction
  const handleVoucherInteraction = () => {
    setIsVoucherAutoScrolling(false);
  };
  
  // Resume voucher auto-scroll after 5 seconds of no interaction
  useEffect(() => {
    if (!isVoucherAutoScrolling) {
      const timeout = setTimeout(() => {
        setIsVoucherAutoScrolling(true);
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [isVoucherAutoScrolling]);

  const handleApplyVoucher = (voucherCode: string) => {
    setSelectedVoucherCode(voucherCode);
    setShowVoucherModal(true);
  };

  const copyToClipboard = async () => {
    navigator.clipboard.writeText(selectedVoucherCode);
    setIsCopied(true);
    
    // Mark this specific voucher as used by this customer
    try {
      const customerId = localStorage.getItem('customerId');
      if (customerId) {
        await fetch(`${API_URL}/api/vouchers/use`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: customerId,
            voucherCode: selectedVoucherCode
          })
        });
        
        // Refresh vouchers to remove the used one
        setTimeout(() => {
          fetchVouchers();
        }, 1000);
      }
    } catch (error) {
      console.error('Error marking voucher as used:', error);
    }
  };

  const closeModal = () => {
    setShowVoucherModal(false);
    setSelectedVoucherCode('');
    setIsCopied(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 page-with-bottom-nav">
      {/* Gradient Header Section - SMALLER */}
      <div className="text-white px-4 sm:px-6 pb-4 sm:pb-5 pt-3 shadow-xl" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1">Hi, {userName} 👋</h1>
            <p className="text-white/90 text-sm sm:text-base">Let's schedule your order</p>
          </div>
          <button onClick={() => navigate("/profile")} className="flex-shrink-0">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-white/30 hover:border-white/50 transition-colors" />
            ) : (
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* White Content Section */}
      <div className="px-4 sm:px-6 py-4 sm:py-6">
        {/* Hero Carousel */}
        {heroItems.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <div className="relative rounded-3xl overflow-hidden shadow-xl">
              <div 
                className="flex transition-transform duration-700 ease-in-out" 
                style={{ transform: `translateX(-${currentHero * 100}%)` }}
                onTouchStart={handleHeroTouchStart}
                onTouchMove={handleHeroTouchMove}
                onTouchEnd={handleHeroTouchEnd}
              >
                {heroItems.map((item: any, index) => (
                  <div key={item._id} className="w-full flex-shrink-0 relative">
                    {item.type === 'image' ? (
                      <img
                        src={item.url}
                        alt="Hero"
                        className="w-full h-48 sm:h-64 object-cover"
                      />
                    ) : (
                      <video
                        src={item.url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="auto"
                        className="w-full h-48 sm:h-64 object-cover bg-gray-200"
                      >
                        Your browser does not support video.
                      </video>
                    )}
                    {(item.title || item.description || item.buttonText) && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 sm:p-6">
                        {item.title && <h3 className="text-white text-lg sm:text-xl font-bold mb-1">{item.title}</h3>}
                        {item.description && <p className="text-white/90 text-sm sm:text-base mb-2">{item.description}</p>}
                        {item.buttonText && item.buttonLink && (
                          <button
                            onClick={() => navigate(item.buttonLink)}
                            className="bg-gradient-to-r from-[#452D9B] to-[#07C8D0] text-white px-4 py-2 rounded-xl text-sm font-semibold"
                          >
                            {item.buttonText}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-3">
              {heroItems.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentHero(index);
                    setIsAutoScrolling(false);
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentHero ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-4 sm:mb-6">
          <Button
            onClick={() => navigate("/prices")}
            className="h-12 sm:h-14 bg-gradient-to-r from-[#452D9B] to-[#07C8D0] hover:from-[#3a2682] hover:to-[#06b3bb] text-white rounded-2xl text-sm sm:text-base font-semibold shadow-lg"
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Book Order
          </Button>
          <Button
            onClick={() => navigate("/subscriptions")}
            className="h-12 sm:h-14 bg-gradient-to-br from-amber-400 to-red-500 hover:from-amber-500 hover:to-red-600 text-white rounded-2xl text-sm sm:text-base font-semibold shadow-lg"
          >
            💳 Top-Up
          </Button>
        </div>

        {/* Offer Cards - Full Width Single Card */}
        <div className="mb-4 sm:mb-6">
          {vouchers.length > 0 && (
            <div className="relative">
              <div 
                className="overflow-hidden rounded-2xl"
                onTouchStart={handleVoucherTouchStart}
                onTouchMove={handleVoucherTouchMove}
                onTouchEnd={handleVoucherTouchEnd}
              >
                <div className="flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${currentVoucher * 100}%)` }}>
                  {vouchers.map((voucher: any, index) => (
                    <div key={voucher._id} className="w-full flex-shrink-0 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-5 shadow-lg border border-blue-300">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                            <Tag className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">LIMITED</span>
                        </div>
                        <h3 className="font-bold text-base mb-1 text-blue-900">{voucher.slogan}</h3>
                        <p className="text-blue-700 text-sm mb-3">Limited time offer</p>
                        <Button 
                          onClick={() => handleApplyVoucher(voucher.code)}
                          className="w-full h-9 rounded-xl text-sm font-semibold shadow-md bg-gradient-to-r from-[#452D9B] to-[#07C8D0] hover:from-[#3a2682] hover:to-[#06b3bb] text-white"
                        >
                          Apply Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Dots Indicator */}
              <div className="flex justify-center gap-2 mt-3">
                {vouchers.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentVoucher(index);
                      setIsVoucherAutoScrolling(false);
                    }}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentVoucher ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-600" />
            Recent Orders
          </h3>
          <div className="space-y-3">
            {recentOrders.length > 0 ? (
              recentOrders.map((order: any) => (
                <div key={order._id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors">
                  <span className="font-bold text-blue-600 text-sm sm:text-base">Order #{order.orderId}</span>
                  <Button
                    onClick={() => navigate("/order-details", { state: { orderId: order.orderId } })}
                    className="h-9 sm:h-10 bg-gradient-to-r from-[#452D9B] to-[#07C8D0] hover:from-[#3a2682] hover:to-[#06b3bb] text-white rounded-xl text-xs sm:text-sm font-semibold flex-shrink-0 shadow-md px-4"
                  >
                    <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    View Order
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No recent orders found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNavigation />

      {/* Voucher Code Modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="text-center">
              <h3 className="text-lg font-bold text-black mb-4">Your Voucher Code</h3>
              
              <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-2xl p-4 mb-4">
                <p className="text-2xl font-bold text-blue-600 tracking-wider mb-2">{selectedVoucherCode}</p>
                <button 
                  onClick={copyToClipboard}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    isCopied 
                      ? 'bg-green-500 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {isCopied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
              
              <div className="text-left space-y-2 mb-6">
                <p className="text-sm text-gray-700">• It is one time use, so please copy it</p>
                <p className="text-sm text-gray-700">• Use it while you order</p>
              </div>
              
              <button 
                onClick={closeModal}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-2xl font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;