import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingCart, Clock, X, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_URL } from '@/config/api';
import BottomNavigation from "@/components/BottomNavigation";
import Header from "@/components/Header";
import { App } from '@capacitor/app';
import { ConfirmDialog } from "@/components/Toast";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

interface TimeSlot {
  _id: string;
  time: string;
  type: string;
}

const Cart = () => {
  const navigate = useNavigate();
  const [showClearCartDialog, setShowClearCartDialog] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showSlotModal, setShowSlotModal] = useState(false);
  // Checkout is two steps: the wallet offer, then the pickup slot.
  const [checkoutStep, setCheckoutStep] = useState<'topup' | 'slot'>('slot');
  const [topupPlans, setTopupPlans] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  // The customer picks a real date now, not just Today/Tomorrow. Index 0 is today.
  const PICKUP_DAYS = 4;
  const [dayIndex, setDayIndex] = useState(0);
  // Kept because the rest of the flow and the order payload still speak in these terms
  const pickupType: "now" | "later" = dayIndex === 0 ? "now" : "later";
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showSlotError, setShowSlotError] = useState(false);
  const [minOrderPrice, setMinOrderPrice] = useState(500);
  const [daySettings, setDaySettings] = useState({
    todaySlotsEnabled: true,
    tomorrowSlotsEnabled: true,
    // Same-day Express closes after this hour, and a slot must start at least
    // this many minutes ahead so the captain can actually reach the customer.
    expressCutoffHour: 18,
    expressLeadTimeMinutes: 90,
  });
  const [garmentConfirmed, setGarmentConfirmed] = useState(false);
  const [expressDeliveryFee, setExpressDeliveryFee] = useState(0);
  const isExpressSelected = typeof window !== 'undefined' && localStorage.getItem('selectedDeliveryType') === 'express';

  useEffect(() => {
    fetch(`${API_URL}/api/order-charges`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.expressDeliveryEnabled === false) {
          localStorage.setItem('selectedDeliveryType', 'standard');
          setExpressDeliveryFee(0);
        } else if (data.success && data.data?.expressDeliveryPrice) {
          setExpressDeliveryFee(data.data.expressDeliveryPrice);
        }
      })
      .catch(err => console.error('Error fetching express delivery fee:', err));
  }, []);

  const getOrderTotal = () => {
    return getSelectedTotal() + (isExpressSelected ? expressDeliveryFee : 0);
  };

  useEffect(() => {
    loadCartItems();
    fetchTimeSlots(0);
    fetchTopupPlans();
    fetchMinOrderPrice();
    fetchDaySettings();
    
    const handleBackButton = () => {
      navigate('/home');
      return true;
    };
    
    App.addListener('backButton', handleBackButton);
    
    return () => {
      App.removeAllListeners();
    };
  }, [navigate]);

  const fetchMinOrderPrice = async () => {
    try {
      const response = await fetch(`${API_URL}/api/wallet-settings`);
      const data = await response.json();
      if (data.success && data.data) {
        setMinOrderPrice(typeof data.data.minOrderPrice === 'number' ? data.data.minOrderPrice : 500);
      }
    } catch (error) {
      console.error('Failed to fetch minimum order price:', error);
    }
  };

  const fetchDaySettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/order-charges`);
      const data = await res.json();
      if (data.success) {
        setDaySettings({
          todaySlotsEnabled: data.data.todaySlotsEnabled !== false,
          tomorrowSlotsEnabled: data.data.tomorrowSlotsEnabled !== false,
          expressCutoffHour: Number(data.data.expressCutoffHour ?? 18),
          expressLeadTimeMinutes: Number(data.data.expressLeadTimeMinutes ?? 90),
        });
      }
    } catch {}
  };

  // If every slot today has already gone, open on the next date rather than
  // leaving the customer looking at a greyed-out list.
  const advanceIfDayIsOver = (slots: TimeSlot[], offset: number) => {
    if (offset !== 0 || slots.length === 0) return false;
    const anyLeft = slots.some((slot) => !isSlotPassed(slot.time));
    if (anyLeft) return false;
    setDayIndex(1);
    fetchTimeSlots(1);
    return true;
  };

  const fetchTimeSlots = async (offset: number) => {
    try {
      const serviceType = isExpressSelected ? 'express' : 'standard';
      const response = await fetch(`${API_URL}/api/time-slots?dayOffset=${offset}&serviceType=${serviceType}`);
      const data = await response.json();
      if (data.success) {
        if (advanceIfDayIsOver(data.data, offset)) return;
        setTimeSlots(data.data);
        const availableSlots = getAvailableSlots(data.data);
        if (availableSlots.length > 0) {
          setSelectedSlot(availableSlots[0].time);
        } else {
          setSelectedSlot('');
        }
      }
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
    }
  };

  // "Today, 6 Oct" reads better than just "Today" when someone is choosing a day.
  const formatHour = (hour: number) => {
    const h = ((hour % 24) + 24) % 24;
    const suffix = h < 12 ? 'AM' : 'PM';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display} ${suffix}`;
  };

  const dayParts = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return {
      top: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      bottom: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    };
  };

  const dayLabel = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const name = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' });
    return `${name}, ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  };

  // Slot labels are free text typed by the admin, so they turn up in several
  // shapes: "9:00 AM", "1-2pm", "10:00 AM - 12:00 PM". Returns minutes since
  // midnight, or null when nothing recognisable is in the string.
  const minutesFromLabel = (label: string, preferLast: boolean) => {
    const matches = [...String(label).matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi)]
      .filter((m) => m[3] || m[2] || /\d/.test(m[1]));
    if (matches.length === 0) return null;

    // A range is "start - end"; what matters for availability is when it ends.
    const chosen = preferLast && matches.length > 1 ? matches[matches.length - 1] : matches[0];
    // A start time with no am/pm ("1-2pm") borrows the period from the end time.
    const period = (chosen[3] || matches[matches.length - 1][3] || '').toLowerCase();

    let hour = parseInt(chosen[1], 10);
    const minute = chosen[2] ? parseInt(chosen[2], 10) : 0;
    if (Number.isNaN(hour)) return null;

    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;

    return hour * 60 + minute;
  };

  // Same-day Express shuts at the cutoff hour, whatever slots remain on paper.
  const expressClosedForToday =
    isExpressSelected && new Date().getHours() >= daySettings.expressCutoffHour;

  const isSlotPassed = (slotTime: string) => {
    if (dayIndex > 0) return false; // A future date's slots are all still ahead
    if (expressClosedForToday) return true;

    // A range is gone once it ends; a single time is gone once it arrives.
    const isRange = /-/.test(slotTime);
    const slotMinutes = minutesFromLabel(slotTime, isRange);
    if (slotMinutes === null) return false;

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    // Express needs a head start; Standard only needs the slot not to have gone.
    const lead = isExpressSelected ? daySettings.expressLeadTimeMinutes : 0;
    return nowMinutes + lead >= slotMinutes;
  };
  
  const getAvailableSlots = (slots: TimeSlot[]) => {
    return slots.filter(slot => !isSlotPassed(slot.time));
  };

  const handleDayChange = (offset: number) => {
    setDayIndex(offset);
    setSelectedSlot('');
    fetchTimeSlots(offset);
  };

  const handleSlotSelection = (slotTime: string) => {
    console.log('Cart - Slot clicked:', slotTime);
    console.log('Cart - Current time:', new Date().getHours() + ':' + new Date().getMinutes());
    console.log('Cart - Pickup type:', pickupType);
    console.log('Cart - Is slot passed:', isSlotPassed(slotTime));
    
    if (isSlotPassed(slotTime) && pickupType === 'now') {
      setShowSlotError(true);
      setTimeout(() => setShowSlotError(false), 3000);
      return;
    }
    setSelectedSlot(slotTime);
  };

  const loadCartItems = () => {
    const savedCart = localStorage.getItem('cartItems');
    if (savedCart) {
      const items = JSON.parse(savedCart);
      setCartItems(items);
      setSelectedItems(new Set(items.map((item: CartItem) => item.id)));
      
      const uniqueCategories = ['All', ...new Set(items.map((item: CartItem) => item.category))];
      setCategories(uniqueCategories);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const getSelectedCartItems = () => {
    return cartItems.filter(item => selectedItems.has(item.id));
  };

  const getSelectedTotal = () => {
    return getSelectedCartItems().reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getSelectedItemsCount = () => {
    return getSelectedCartItems().reduce((total, item) => total + item.quantity, 0);
  };

  const updateQuantity = (id: string, increment: boolean) => {
    const updatedItems = cartItems.map(item => {
      if (item.id === id) {
        const newQuantity = increment ? item.quantity + 1 : Math.max(0, item.quantity - 1);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0);

    setCartItems(updatedItems);
    localStorage.setItem('cartItems', JSON.stringify(updatedItems));
  };

  const removeItem = (id: string) => {
    const updatedItems = cartItems.filter(item => item.id !== id);
    setCartItems(updatedItems);
    localStorage.setItem('cartItems', JSON.stringify(updatedItems));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cartItems');
    setShowClearCartDialog(false);
  };

  const getFilteredItems = () => {
    if (selectedCategory === 'All') return cartItems;
    return cartItems.filter(item => item.category === selectedCategory);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const fetchTopupPlans = async () => {
    try {
      const response = await fetch(`${API_URL}/api/subscription-plans`);
      const data = await response.json();
      if (data.success) setTopupPlans((data.data || []).filter((p: any) => p.isActive));
    } catch (error) {
      console.error('Failed to fetch top-up plans:', error);
    }
  };

  const handleProceedToCheckout = () => {
    if (selectedItems.size === 0) {
      alert('Please select at least one item to order');
      return;
    }
    if (getSelectedTotal() < minOrderPrice) {
      alert(`Minimum order value is ₹${minOrderPrice}. Please add more items.`);
      return;
    }
    // Show the wallet offer first, then the slot. With no plans configured
    // there is nothing to offer, so go straight to the slot.
    setCheckoutStep(topupPlans.length > 0 ? 'topup' : 'slot');
    setShowSlotModal(true);
  };

  const confirmOrder = () => {
    if (!selectedSlot) {
      alert('Please select a pickup slot');
      return;
    }
    if (selectedItems.size === 0) {
      alert('Please select at least one item to order');
      return;
    }
    
    const selectedCartItems = getSelectedCartItems();
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + dayIndex);

    const orderData = {
      cartItems: selectedCartItems,
      totalAmount: getSelectedTotal(),
      pickupType,
      pickupDate: pickupDate.toISOString(),
      pickupDayLabel: dayLabel(dayIndex),
      selectedSlot,
      items: selectedCartItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }))
    };
    setShowSlotModal(false);
    navigate('/continue-booking', { state: orderData });
  };

  const filteredItems = getFilteredItems();

  return (
    <div className="min-h-screen bg-gray-50 page-with-bottom-nav">
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#452D9B', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#07C8D0', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      </svg>

      <Header 
        title={`My Cart (${getTotalItems()})`}
        rightAction={cartItems.length > 0 ? (
          <button onClick={() => setShowClearCartDialog(true)} className="text-red-500" aria-label="Delete entire cart">
            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        ) : undefined}
      />

      <div className="px-4 sm:px-6 py-4 sm:py-6">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
              <ShoppingCart className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 text-center mb-6">Add items from our services to get started</p>
            <Button
              onClick={() => navigate('/prices')}
              className="bg-gradient-to-r from-[#452D9B] to-[#07C8D0] hover:from-[#3a2682] hover:to-[#06b3bb] text-white rounded-2xl px-8 py-3 font-semibold"
            >
              Book Now
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-2xl font-semibold whitespace-nowrap text-sm flex-shrink-0 ${
                      selectedCategory === category
                        ? 'text-white shadow-md'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    style={selectedCategory === category ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)' } : {}}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {filteredItems.map((item) => (
                <div key={item.id} className={`bg-white rounded-2xl p-4 shadow-lg border-2 ${
                  selectedItems.has(item.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
                }`}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleItemSelection(item.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedItems.has(item.id)
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {selectedItems.has(item.id) && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    
                    <div className="flex items-center justify-between gap-3 flex-1">
                      <div className="flex-1">
                        <h3 className="font-semibold text-black text-base">{item.name}</h3>
                        <p className="text-sm text-gray-500 mb-2">{item.category}</p>
                        <p className="font-bold text-lg" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                          ₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, false)}
                            className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold shadow-md"
                            style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold text-black">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, true)}
                            className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold shadow-md"
                            style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 mb-6">
              <h3 className="font-bold text-lg mb-3">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Selected Items:</span>
                  <span className="font-semibold">{getSelectedItemsCount()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Selected Total:</span>
                  <span className="font-semibold">₹{getSelectedTotal()}</span>
                </div>
                {isExpressSelected && expressDeliveryFee > 0 && (
                  getSelectedTotal() < minOrderPrice ? (
                    selectedItems.size > 0 && (
                      <div className="flex justify-between gap-3 text-sm text-gray-500">
                        <span>Express Delivery:</span>
                        <span className="text-right">₹{expressDeliveryFee} — applies after minimum order is reached</span>
                      </div>
                    )
                  ) : (
                    <div className="flex justify-between">
                      <span>Express Delivery Fee:</span>
                      <span className="font-semibold">₹{expressDeliveryFee}</span>
                    </div>
                  )
                )}
                <hr className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Order Total:</span>
                  <span style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    ₹{getSelectedTotal() < minOrderPrice ? getSelectedTotal() : getOrderTotal()}
                  </span>
                </div>
                {selectedItems.size === 0 && (
                  <p className="text-red-500 text-sm mt-2">Please select items to place order</p>
                )}
                {getSelectedTotal() < minOrderPrice && selectedItems.size > 0 && (
                  <p className="text-red-500 text-sm mt-2 font-semibold">⚠ Minimum order value of ₹{minOrderPrice} required</p>
                )}
              </div>
            </div>

            {/* The total and the button stay in view while the item list scrolls.
                On a short screen they used to sit below the fold entirely. */}
            <div
              className="sticky z-30 -mx-4 px-4 pt-3 pb-2 bg-gray-50/95 backdrop-blur border-t"
              style={{ bottom: 'calc(5rem + max(env(safe-area-inset-bottom), 0px))' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Order Total{selectedItems.size > 0 ? ` (${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''})` : ''}
                </span>
                <span className="text-xl font-bold" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  ₹{getSelectedTotal() < minOrderPrice ? getSelectedTotal() : getOrderTotal()}
                </span>
              </div>
              <Button
                onClick={handleProceedToCheckout}
                disabled={selectedItems.size === 0 || getSelectedTotal() < minOrderPrice}
                className={`w-full h-12 sm:h-14 rounded-2xl text-base font-semibold shadow-lg ${
                  selectedItems.size === 0 || getSelectedTotal() < minOrderPrice
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#452D9B] to-[#07C8D0] hover:from-[#3a2682] hover:to-[#06b3bb] text-white'
                }`}
              >
                {selectedItems.size === 0
                  ? 'Select Items to Order'
                  : getSelectedTotal() < minOrderPrice
                    ? `Minimum Order ₹${minOrderPrice} Required`
                    : `Select Pickup Slot - ₹${getOrderTotal()}`
                }
              </Button>
            </div>
          </>
        )}
      </div>

      <BottomNavigation />

      {showSlotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            {/* Step one: the wallet offer, shown where it is actually relevant --
                the moment before paying. It used to appear once at app launch,
                on top of whatever screen the person happened to open. */}
            {checkoutStep === 'topup' && (
              <>
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-lg font-bold text-black">Top up your wallet</h3>
                  <button onClick={() => setShowSlotModal(false)} className="text-gray-500" aria-label="Close">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-4">Add money now and pay less on this order.</p>

                <div
                  className="flex gap-3 overflow-x-auto scrollbar-hide -mx-6 px-6 pb-2"
                  style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
                >
                  {topupPlans.map((plan: any) => {
                    const bonus = plan.walletCredit > plan.price
                      ? Math.round(((plan.walletCredit - plan.price) / plan.price) * 100)
                      : 0;
                    return (
                      <button
                        key={plan._id}
                        type="button"
                        onClick={() => navigate('/subscriptions')}
                        className="flex-shrink-0 w-48 rounded-2xl overflow-hidden text-left bg-white border border-gray-200 shadow-sm active:scale-[0.98] transition-transform"
                        style={{ scrollSnapAlign: 'start' }}
                      >
                        <div
                          className="px-3 py-2 flex items-center justify-between"
                          style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
                        >
                          <span className="text-white font-bold text-sm">&#8377;{plan.price} &rarr; &#8377;{plan.walletCredit}</span>
                          {bonus > 0 && <span className="text-white/90 text-[10px] font-bold">+{bonus}%</span>}
                        </div>
                        <div className="px-3 py-2">
                          <span className="block text-sm font-bold text-gray-900 mb-1">{plan.name}</span>
                          {(plan.benefits || []).slice(0, 2).map((b: string, i: number) => (
                            <span key={i} className="block text-[11px] text-gray-600 leading-snug">&#10003; {b}</span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCheckoutStep('slot')}
                  className="w-full py-3 mt-4 rounded-2xl font-semibold text-white"
                  style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
                >
                  Next
                </button>
                <p className="text-xs text-gray-500 text-center mt-3">
                  Tap a plan to add money now, or carry on and pick your pickup slot.
                </p>
              </>
            )}

            {checkoutStep === 'slot' && (
              <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 min-w-0">
                {topupPlans.length > 0 && (
                  <button onClick={() => setCheckoutStep('topup')} className="text-gray-500 flex-shrink-0" aria-label="Back to top-up">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <h3 className="text-lg font-bold text-black truncate">Select Pickup Slot</h3>
              </div>
              <button onClick={() => setShowSlotModal(false)} className="text-gray-500 flex-shrink-0" aria-label="Close">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Four real dates to choose from, with that day's slots underneath */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">
                {isExpressSelected ? 'Express pickup date' : 'Pickup date'}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {Array.from({ length: PICKUP_DAYS }, (_, offset) => {
                  const parts = dayParts(offset);
                  const selected = dayIndex === offset;
                  const disabled =
                    (offset === 0 && !daySettings.todaySlotsEnabled) ||
                    (offset === 1 && !daySettings.tomorrowSlotsEnabled);
                  return (
                    <button
                      key={offset}
                      onClick={() => !disabled && handleDayChange(offset)}
                      disabled={disabled}
                      className={`flex-shrink-0 min-w-[76px] rounded-2xl py-2 px-3 shadow-md text-center ${
                        disabled
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : selected
                            ? 'text-white'
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                      style={!disabled && selected
                        ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)' }
                        : (!disabled ? { color: '#452D9B' } : undefined)}
                    >
                      <span className="block text-[11px] font-medium opacity-90">{parts.top}</span>
                      <span className="block text-sm font-bold">{parts.bottom}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="font-semibold mb-3 text-black">{isExpressSelected ? 'Express slots' : 'Pickup slots'} for {dayLabel(dayIndex)}</h4>
              {((dayIndex === 0 && !daySettings.todaySlotsEnabled) || (dayIndex === 1 && !daySettings.tomorrowSlotsEnabled)) ? (
                <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 text-center">
                  <p className="text-orange-600 font-semibold text-sm">
                    Pickup on {dayLabel(dayIndex)} is currently unavailable.
                  </p>
                  <p className="text-orange-500 text-xs mt-1">Please select the other day or try again later.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot._id}
                        onClick={() => handleSlotSelection(slot.time)}
                        disabled={isSlotPassed(slot.time) && pickupType === 'now'}
                        className={`h-10 rounded-2xl font-semibold text-xs w-full ${
                          isSlotPassed(slot.time) && pickupType === 'now'
                            ? 'bg-gray-200 border border-gray-300 text-gray-400 cursor-not-allowed'
                            : selectedSlot === slot.time
                              ? 'text-white shadow-md'
                              : 'bg-white border border-gray-300 text-black hover:bg-gray-50'
                        }`}
                        style={selectedSlot === slot.time && !(isSlotPassed(slot.time) && pickupType === 'now') ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)' } : {}}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs mt-3" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    {selectedSlot
                      ? `Selected: ${dayLabel(dayIndex)}, ${selectedSlot}`
                      : dayIndex === 0 && expressClosedForToday
                        ? `Same-day Express closes at ${formatHour(daySettings.expressCutoffHour)} - pick another date above`
                        : dayIndex === 0
                          ? "Today's slots have all passed - pick another date above"
                          : 'Pick a slot above'}
                  </p>
                </>
              )}
            </div>
            
            {showSlotError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4 animate-pulse">
                <p className="text-red-700 text-sm font-medium text-center">
                  ⏰ This time slot has already passed. Please select an available time slot.
                </p>
              </div>
            )}
            
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <h4 className="font-semibold mb-2">Order Summary</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Selected Items: {getSelectedItemsCount()}</span>
                  <span>₹{getSelectedTotal()}</span>
                </div>
                {isExpressSelected && expressDeliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span>Express Delivery Fee</span>
                    <span>₹{expressDeliveryFee}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Pickup: {pickupType === 'now' ? 'Today' : 'Tomorrow'}</span>
                  <span>{selectedSlot || 'No slot selected'}</span>
                </div>
              </div>
            </div>
            
            <label className="flex items-start gap-3 cursor-pointer bg-gray-50 rounded-2xl p-3 mb-4" onClick={() => setGarmentConfirmed(!garmentConfirmed)}>
              <div
                className="mt-1 w-5 h-5 flex-shrink-0 rounded flex items-center justify-center"
                style={{
                  border: garmentConfirmed ? 'none' : '2px solid #9ca3af',
                  background: garmentConfirmed ? 'linear-gradient(to right, #452D9B, #07C8D0)' : 'white'
                }}
              >
                {garmentConfirmed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-black">
                  I confirm I have added all my clothes for steam ironing.
                </p>
              </div>
            </label>

            <button
              onClick={confirmOrder}
              disabled={!selectedSlot || !garmentConfirmed}
              className={`w-full py-3 rounded-2xl font-semibold ${
                selectedSlot && garmentConfirmed
                  ? 'bg-gradient-to-r from-[#452D9B] to-[#07C8D0] text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Confirm Order - ₹{getOrderTotal()}
            </button>
            <p className="text-xs text-gray-500 text-center mt-3">
              Our captain will only pick up the clothes added to your cart and confirmed in this order. This helps us maintain transparency and ensures your order is processed correctly.
            </p>
              </>
            )}
          </div>
        </div>
      )}

      {showClearCartDialog && (
        <ConfirmDialog
          title="Delete entire cart?"
          message="Are you sure you want to delete the entire cart? All the items you have added will be removed."
          confirmText="Yes, delete"
          cancelText="No, keep it"
          onConfirm={clearCart}
          onCancel={() => setShowClearCartDialog(false)}
        />
      )}
    </div>
  );
};

export default Cart;