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
  const [topupPlans, setTopupPlans] = useState<any[]>([]);
  const [currentPlan, setCurrentPlan] = useState(0);
  const [isPlanAutoScrolling, setIsPlanAutoScrolling] = useState(true);
  const [planTouchStart, setPlanTouchStart] = useState(0);
  const [planTouchEnd, setPlanTouchEnd] = useState(0);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseToast, setPurchaseToast] = useState('');
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
    fetchTopupPlans();

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
  
  const fetchTopupPlans = async () => {
    try {
      const res = await fetch(`${API_URL}/api/subscription-plans`);
      const data = await res.json();
      if (data.success) setTopupPlans(data.data.filter((p: any) => p.isActive));
    } catch {}
  };

  // Plan carousel auto-scroll
  useEffect(() => {
    if (!isPlanAutoScrolling || topupPlans.length <= 1) return;
    const t = setInterval(() => setCurrentPlan(p => (p + 1) % topupPlans.length), 3500);
    return () => clearInterval(t);
  }, [topupPlans.length, isPlanAutoScrolling]);

  useEffect(() => {
    if (!isPlanAutoScrolling) {
      const t = setTimeout(() => setIsPlanAutoScrolling(true), 5000);
      return () => clearTimeout(t);
    }
  }, [isPlanAutoScrolling]);

  const handlePlanTouchStart = (e: React.TouchEvent) => { setPlanTouchStart(e.targetTouches[0].clientX); setIsPlanAutoScrolling(false); };
  const handlePlanTouchMove = (e: React.TouchEvent) => setPlanTouchEnd(e.targetTouches[0].clientX);
  const handlePlanTouchEnd = () => {
    if (!planTouchStart || !planTouchEnd) return;
    const d = planTouchStart - planTouchEnd;
    if (d > 50) setCurrentPlan(p => (p + 1) % topupPlans.length);
    if (d < -50) setCurrentPlan(p => p === 0 ? topupPlans.length - 1 : p - 1);
  };

  const handleBuyPlan = async (plan: any) => {
    const customerId = localStorage.getItem('customerId');
    if (!customerId) { navigate('/login'); return; }
    setIsPurchasing(true);
    try {
      if (!document.getElementById('rzp-home')) {
        const s = document.createElement('script'); s.id = 'rzp-home';
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        document.body.appendChild(s);
        await new Promise(r => s.onload = r);
      }
      const orderRes = await fetch(`${API_URL}/api/razorpay/create-order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: plan.price, currency: 'INR', receipt: `sub_${Date.now()}` })
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error();
      const rzp = new window.Razorpay({
        key: orderData.keyId, amount: orderData.amount, currency: orderData.currency,
        name: 'Urban Steam', description: `${plan.name} Plan`, order_id: orderData.orderId,
        theme: { color: '#452D9B' },
        prefill: { name: localStorage.getItem('userName') || '' },
        modal: { ondismiss: () => setIsPurchasing(false) },
        handler: async (response: any) => {
          try {
            const vRes = await fetch(`${API_URL}/api/razorpay/verify-payment`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature })
            });
            if (!(await vRes.json()).success) throw new Error();
            await fetch(`${API_URL}/api/subscriptions`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customerId, planId: plan._id, razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, status: 'active' })
            });
            setShowPlanModal(false);
            setPurchaseToast(`✅ ₹${plan.walletCredit} added to your wallet!`);
            setTimeout(() => setPurchaseToast(''), 4000);
          } catch { setPurchaseToast('❌ Payment failed. Contact support.'); setTimeout(() => setPurchaseToast(''), 4000); }
          finally { setIsPurchasing(false); }
        }
      });
      rzp.open();
    } catch { setIsPurchasing(false); setPurchaseToast('❌ Could not start payment. Try again.'); setTimeout(() => setPurchaseToast(''), 3000); }
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
        <div className="mb-4 sm:mb-5">
          <Button
            onClick={() => navigate("/prices")}
            className="w-full h-12 sm:h-14 bg-gradient-to-r from-[#452D9B] to-[#07C8D0] hover:from-[#3a2682] hover:to-[#06b3bb] text-white rounded-2xl text-sm sm:text-base font-semibold shadow-lg"
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Book Order
          </Button>
        </div>

        {/* Wallet Top-Up Plans Carousel */}
        {topupPlans.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <style>{`
              @keyframes plan-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(220%)} }
              @keyframes plan-blob1 { 0%,100%{transform:scale(1) translate(0,0)} 50%{transform:scale(1.15) translate(5px,-5px)} }
              @keyframes plan-blob2 { 0%,100%{transform:scale(1) translate(0,0)} 50%{transform:scale(1.1) translate(-4px,4px)} }
            `}</style>

            <div className="relative rounded-3xl overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(69,45,155,0.28)' }}>
              {/* Sliding track */}
              <div
                className="flex"
                style={{ transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)', transform: `translateX(-${currentPlan * 100}%)` }}
                onTouchStart={handlePlanTouchStart}
                onTouchMove={handlePlanTouchMove}
                onTouchEnd={handlePlanTouchEnd}
              >
                {topupPlans.map((plan, idx) => {
                  const extra = plan.walletCredit > plan.price ? Math.round(((plan.walletCredit - plan.price) / plan.price) * 100) : 0;
                  return (
                    <div key={plan._id} className="w-full flex-shrink-0 relative select-none" style={{ background: 'linear-gradient(135deg, #0f0228 0%, #2d1875 50%, #06869a 100%)', minHeight: 148 }}>
                      {/* Decorative blobs */}
                      <div style={{ position:'absolute', top:-28, right:-28, width:120, height:120, borderRadius:'50%', background:'rgba(7,200,208,0.15)', animation:'plan-blob1 4.5s ease-in-out infinite' }} />
                      <div style={{ position:'absolute', bottom:-24, left:-18, width:95, height:95, borderRadius:'50%', background:'rgba(69,45,155,0.3)', animation:'plan-blob2 5.5s ease-in-out infinite' }} />
                      <div style={{ position:'absolute', top:16, right:80, width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
                      {/* Shimmer */}
                      <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
                        <div style={{ position:'absolute', top:0, bottom:0, width:'38%', background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)', animation:'plan-shimmer 3s linear infinite' }} />
                      </div>

                      {/* Content */}
                      <div className="relative flex items-center gap-3 p-4 sm:p-5">
                        {/* Icon / Image */}
                        <div style={{ width:58, height:58, borderRadius:20, overflow:'hidden', flexShrink:0, border:'1.5px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.1)' }}>
                          {plan.image
                            ? <img src={plan.image.startsWith('http') ? plan.image : `${API_URL}${plan.image}`} alt={plan.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>💎</div>
                          }
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-extrabold text-base sm:text-lg leading-tight truncate">{plan.name}</span>
                            {extra > 0 && <span style={{ fontSize:'0.6rem', background:'linear-gradient(to right,#f59e0b,#ef4444)', color:'white', padding:'0.12rem 0.4rem', borderRadius:6, fontWeight:800, whiteSpace:'nowrap' }}>+{extra}% 🔥</span>}
                          </div>
                          <div className="flex items-baseline gap-1 mb-2">
                            <span style={{ color:'#fde68a', fontWeight:700, fontSize:'0.9rem' }}>Pay ₹{plan.price}</span>
                            <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.8rem' }}>→</span>
                            <span style={{ color:'#6ee7b7', fontWeight:800, fontSize:'1rem' }}>Get ₹{plan.walletCredit}</span>
                          </div>
                          {plan.benefits?.length > 0 && (
                            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.72rem', lineHeight:1.4 }}>
                              ✓ {plan.benefits.slice(0,2).join('  ✓ ')}
                            </p>
                          )}
                        </div>

                        {/* Get button */}
                        <button
                          onClick={() => { setSelectedPlan(plan); setShowPlanModal(true); }}
                          style={{ flexShrink:0, background:'linear-gradient(to right,#452D9B,#07C8D0)', color:'white', border:'none', borderRadius:14, padding:'0.6rem 1rem', fontWeight:800, fontSize:'0.85rem', cursor:'pointer', boxShadow:'0 3px 14px rgba(7,200,208,0.4)', whiteSpace:'nowrap' }}
                        >
                          Get →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dots */}
            {topupPlans.length > 1 && (
              <div className="flex justify-center gap-2 mt-2.5">
                {topupPlans.map((_, i) => (
                  <button key={i} onClick={() => { setCurrentPlan(i); setIsPlanAutoScrolling(false); }}
                    style={{ width: i === currentPlan ? 20 : 8, height:8, borderRadius:4, border:'none', cursor:'pointer', transition:'all 0.3s', background: i === currentPlan ? '#452D9B' : '#d1d5db', padding:0 }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Plan Detail Modal */}
        {showPlanModal && selectedPlan && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:60, display:'flex', alignItems:'flex-end' }} onClick={() => setShowPlanModal(false)}>
            <div style={{ width:'100%', background:'white', borderRadius:'28px 28px 0 0', overflow:'hidden', animation:'slideUp 0.35s cubic-bezier(0.4,0,0.2,1)' }} onClick={e => e.stopPropagation()}>
              <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

              {/* Header image / gradient */}
              {selectedPlan.image
                ? <img src={selectedPlan.image.startsWith('http') ? selectedPlan.image : `${API_URL}${selectedPlan.image}`} alt={selectedPlan.name} style={{ width:'100%', height:180, objectFit:'cover' }} />
                : <div style={{ width:'100%', height:140, background:'linear-gradient(135deg,#0f0228,#2d1875,#06869a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:52 }}>💎</div>
              }

              <div style={{ padding:'1.25rem 1.25rem 2rem' }}>
                {/* Name + extra badge */}
                <div className="flex items-center gap-2 mb-1">
                  <h3 style={{ fontWeight:800, fontSize:'1.3rem', color:'#1e293b', margin:0 }}>{selectedPlan.name}</h3>
                  {selectedPlan.walletCredit > selectedPlan.price && (
                    <span style={{ fontSize:'0.65rem', background:'linear-gradient(to right,#f59e0b,#ef4444)', color:'white', padding:'0.15rem 0.5rem', borderRadius:7, fontWeight:800 }}>
                      +{Math.round(((selectedPlan.walletCredit - selectedPlan.price) / selectedPlan.price) * 100)}% BONUS
                    </span>
                  )}
                </div>

                {/* Pay → Get */}
                <div style={{ background:'linear-gradient(to right,#452D9B,#07C8D0)', borderRadius:14, padding:'0.85rem 1rem', marginBottom:'1rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.75rem' }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.72rem', fontWeight:600 }}>YOU PAY</div>
                    <div style={{ color:'white', fontSize:'1.5rem', fontWeight:900 }}>₹{selectedPlan.price}</div>
                  </div>
                  <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'1.5rem' }}>→</div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.72rem', fontWeight:600 }}>WALLET GETS</div>
                    <div style={{ color:'#6ee7b7', fontSize:'1.5rem', fontWeight:900 }}>₹{selectedPlan.walletCredit}</div>
                  </div>
                </div>

                {/* Benefits */}
                {selectedPlan.benefits?.length > 0 && (
                  <ul style={{ listStyle:'none', padding:0, margin:'0 0 1.25rem', display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                    {selectedPlan.benefits.map((b: string, i: number) => (
                      <li key={i} style={{ display:'flex', gap:'0.5rem', alignItems:'flex-start', fontSize:'0.88rem', color:'#475569' }}>
                        <span style={{ color:'#07C8D0', fontWeight:900, flexShrink:0 }}>✓</span>{b}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Buy button */}
                <button
                  onClick={() => handleBuyPlan(selectedPlan)}
                  disabled={isPurchasing}
                  style={{ width:'100%', padding:'0.9rem', background: isPurchasing ? '#94a3b8' : 'linear-gradient(to right,#452D9B,#07C8D0)', color:'white', border:'none', borderRadius:16, fontWeight:800, fontSize:'1rem', cursor: isPurchasing ? 'not-allowed' : 'pointer', boxShadow:'0 4px 18px rgba(69,45,155,0.3)' }}
                >
                  {isPurchasing ? 'Processing...' : `Buy Now — ₹${selectedPlan.price}`}
                </button>
                <button onClick={() => setShowPlanModal(false)} style={{ width:'100%', marginTop:'0.6rem', padding:'0.65rem', background:'transparent', border:'none', color:'#94a3b8', fontSize:'0.85rem', cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Toast */}
        {purchaseToast && (
          <div style={{ position:'fixed', top:24, left:'50%', transform:'translateX(-50%)', zIndex:70, background: purchaseToast.startsWith('✅') ? '#16a34a' : '#dc2626', color:'white', padding:'0.75rem 1.25rem', borderRadius:14, fontWeight:700, fontSize:'0.9rem', boxShadow:'0 4px 20px rgba(0,0,0,0.25)', whiteSpace:'nowrap' }}>
            {purchaseToast}
          </div>
        )}

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