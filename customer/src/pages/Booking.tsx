import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Info, Shirt, MapPin, CheckCircle2, Home as HomeIcon, Tag, ShoppingCart, RotateCcw, User, Minus, Plus, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_URL } from '@/config/api';
import BottomNavigation from "@/components/BottomNavigation";
import Header from "@/components/Header";
import { App } from '@capacitor/app';

interface PricingItem {
  _id: string;
  name: string;
  price: number;
  category: string;
}

interface TimeSlot {
  _id: string;
  time: string;
  type: string;
}

interface Address {
  street: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

const Booking = () => {
  const navigate = useNavigate();
  const [pickupType, setPickupType] = useState<"now" | "later">("now");
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [showSlotError, setShowSlotError] = useState(false);
  const [daySettings, setDaySettings] = useState({ todaySlotsEnabled: true, tomorrowSlotsEnabled: true });
  const [customerAddress, setCustomerAddress] = useState<Address | null>(() => {
    const cached = localStorage.getItem('cachedBookingAddress');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [savedAddresses, setSavedAddresses] = useState<Address[]>(() => {
    const cached = localStorage.getItem('cachedSavedAddresses');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return [];
  });
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [minOrderPrice, setMinOrderPrice] = useState(500);
  
  useEffect(() => {
    fetchPricingItems();
    fetchTimeSlots('now');
    fetchCustomerAddress();
    fetchDaySettings();
    
    // Handle hardware back button
    const handleBackButton = () => {
      navigate('/home');
      return true; // Prevent default behavior
    };
    
    App.addListener('backButton', handleBackButton);
    
    return () => {
      App.removeAllListeners();
    };
  }, [navigate]);

  useEffect(() => {
    fetchTimeSlots(pickupType);
  }, [pickupType]);

  const fetchPricingItems = async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    
    try {
      const [pricingRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/api/pricing`, { signal: controller.signal }),
        fetch(`${API_URL}/api/wallet-settings`, { signal: controller.signal })
      ]);
      clearTimeout(timeoutId)
      
      const pricingData = await pricingRes.json();
      const settingsData = await settingsRes.json();
      
      if (pricingData.success) {
        setPricingItems(pricingData.data);
        
        // Extract unique categories
        const uniqueCategories = ['All', ...new Set(pricingData.data.map((item: PricingItem) => item.category || 'Laundry'))];
        setCategories(uniqueCategories);
        
        const initialQuantities: {[key: string]: number} = {};
        pricingData.data.forEach((item: PricingItem) => {
          initialQuantities[item._id] = 0;
        });
        setQuantities(initialQuantities);
      }
      
      if (settingsData.success && settingsData.data) {
        setMinOrderPrice(settingsData.data.minOrderPrice || 500);
      }
    } catch (error) {
      clearTimeout(timeoutId)
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
        });
      }
    } catch {}
  };

  const fetchTimeSlots = async (day: 'now' | 'later') => {
    try {
      const dayParam = day === 'now' ? 'today' : 'tomorrow';
      const response = await fetch(`${API_URL}/api/time-slots?day=${dayParam}`);
      const data = await response.json();
      if (data.success) {
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
  
  const isSlotPassed = (slotTime: string) => {
    if (pickupType === 'later') return false; // Tomorrow slots are always available
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Extract start and end time from slot (e.g., "1 PM - 2 PM" -> start: 1, end: 2, period: PM)
    const timeMatch = slotTime.match(/(\d+)\s*(AM|PM)?\s*-\s*(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return false;
    
    const startHour = parseInt(timeMatch[1]);
    const startPeriod = timeMatch[2] || timeMatch[4]; // Use end period if start period is missing
    const endHour = parseInt(timeMatch[3]);
    const endPeriod = timeMatch[4];
    
    // Convert end time to 24-hour format (this is what matters for slot availability)
    let slotEndHour = endHour;
    if (endPeriod?.toUpperCase() === 'PM' && endHour !== 12) {
      slotEndHour = endHour + 12;
    } else if (endPeriod?.toUpperCase() === 'AM' && endHour === 12) {
      slotEndHour = 0; // 12 AM is midnight (0 hours)
    }
    
    // Slot is passed only if current time is past the END time of the slot
    return currentHour > slotEndHour || (currentHour === slotEndHour && currentMinute > 0);
  };
  
  const getAvailableSlots = (slots: TimeSlot[]) => {
    return slots.filter(slot => !isSlotPassed(slot.time));
  };
  
  const handleSlotSelection = (slotTime: string) => {
    console.log('Slot clicked:', slotTime);
    console.log('Current time:', new Date().getHours() + ':' + new Date().getMinutes());
    console.log('Pickup type:', pickupType);
    console.log('Is slot passed:', isSlotPassed(slotTime));
    
    if (isSlotPassed(slotTime) && pickupType === 'now') {
      setShowSlotError(true);
      setTimeout(() => setShowSlotError(false), 3000);
      return;
    }
    setSelectedSlot(slotTime);
  };

  const getFilteredItems = () => {
    if (selectedCategory === 'All') {
      return pricingItems;
    }
    return pricingItems.filter(item => (item.category || 'Laundry') === selectedCategory);
  };

  const updateQuantity = (itemId: string, increment: boolean) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + (increment ? 1 : -1))
    }));
  };
  
  const calculateTotal = () => {
    return pricingItems.reduce((total, item) => {
      return total + (item.price * (quantities[item._id] || 0));
    }, 0);
  };
  
  const addToCart = () => {
    const selectedItems = pricingItems
      .filter(item => (quantities[item._id] || 0) > 0)
      .map(item => ({
        id: item._id,
        name: item.name,
        price: item.price,
        quantity: quantities[item._id],
        category: item.category || 'Laundry'
      }));

    if (selectedItems.length === 0) {
      setToast({ show: true, message: 'Please select at least one item', type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
      return;
    }

    // Get existing cart items
    const existingCart = JSON.parse(localStorage.getItem('cartItems') || '[]');
    
    // Merge with new items (update quantities if item already exists)
    const updatedCart = [...existingCart];
    
    selectedItems.forEach(newItem => {
      const existingIndex = updatedCart.findIndex(item => item.id === newItem.id);
      if (existingIndex >= 0) {
        updatedCart[existingIndex].quantity += newItem.quantity;
      } else {
        updatedCart.push(newItem);
      }
    });

    localStorage.setItem('cartItems', JSON.stringify(updatedCart));
    
    setToast({ show: true, message: `${selectedItems.length} item(s) added to cart!`, type: 'success' });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
    
    // Reset quantities after adding to cart
    const resetQuantities: {[key: string]: number} = {};
    pricingItems.forEach((item: PricingItem) => {
      resetQuantities[item._id] = 0;
    });
    setQuantities(resetQuantities);
  };
  const fetchCustomerAddress = async () => {
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
      
      if (data.success && data.data?.address) {
        setSavedAddresses(data.data.address);
        const primaryAddress = data.data.address.find((addr: Address) => addr.isDefault) || data.data.address[0];
        setCustomerAddress(primaryAddress);
        localStorage.setItem('cachedSavedAddresses', JSON.stringify(data.data.address));
        localStorage.setItem('cachedBookingAddress', JSON.stringify(primaryAddress));
      }
    } catch (error) {
      clearTimeout(timeoutId)
    }
  };

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
        title="Book Your Order" 
        rightAction={
          <button onClick={addToCart}>
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" style={{ stroke: 'url(#gradient)' }} />
          </button>
        }
      />

      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div>
          {/* Category Filter */}
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-3 mb-4 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`h-8 sm:h-10 rounded-2xl font-semibold whitespace-nowrap text-xs sm:text-sm px-3 sm:px-4 flex-shrink-0 transition-all ${
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
          
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg space-y-3 sm:space-y-4">
            {getFilteredItems().map((item) => (
              <div key={item._id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
                    <Shirt className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-black text-sm sm:text-base">
                      {item.name} <span style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>₹{item.price}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <button
                    onClick={() => updateQuantity(item._id, false)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-white flex items-center justify-center font-bold touch-manipulation shadow-md"
                    style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <span className="w-6 sm:w-8 text-center font-semibold text-black text-sm sm:text-base">
                    {quantities[item._id] || 0}
                  </span>
                  <button
                    onClick={() => updateQuantity(item._id, true)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-white flex items-center justify-center font-bold touch-manipulation shadow-md"
                    style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Add to Cart Button */}
          <button
            onClick={addToCart}
            className="w-full h-12 sm:h-14 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-2xl text-sm sm:text-base font-semibold shadow-lg flex items-center justify-center gap-2 mt-4"
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
            Add to Cart
          </button>
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-black">Select Pickup Day</h2>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => setPickupType("now")}
              className={`flex-1 h-10 sm:h-12 rounded-2xl font-semibold text-sm sm:text-base shadow-md ${
                pickupType === "now"
                  ? "text-white"
                  : "bg-white border border-gray-300 hover:bg-gray-50"
              }`}
              style={pickupType === "now" ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)' } : { color: '#452D9B' }}
            >
              Today
            </button>
            <button
              onClick={() => setPickupType("later")}
              className={`flex-1 h-10 sm:h-12 rounded-2xl font-semibold text-sm sm:text-base shadow-md ${
                pickupType === "later"
                  ? "text-white"
                  : "bg-white border border-gray-300 hover:bg-gray-50"
              }`}
              style={pickupType === "later" ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)' } : { color: '#452D9B' }}
            >
              Tomorrow
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-black">
            {pickupType === "now" ? "Today's" : "Tomorrow's"} Pickup Slots
          </h2>
          {((pickupType === 'now' && !daySettings.todaySlotsEnabled) || (pickupType === 'later' && !daySettings.tomorrowSlotsEnabled)) ? (
            <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 text-center">
              <p className="text-orange-600 font-semibold text-sm">
                {pickupType === 'now' ? 'Today' : 'Tomorrow'} pickup is currently unavailable.
              </p>
              <p className="text-orange-500 text-xs mt-1">Please select the other day or try again later.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {timeSlots.map((slot) => (
                  <Button
                    key={slot._id}
                    onClick={() => !(isSlotPassed(slot.time) && pickupType === 'now') && handleSlotSelection(slot.time)}
                    className={`h-10 sm:h-12 rounded-2xl font-semibold text-sm sm:text-base w-full ${
                      isSlotPassed(slot.time) && pickupType === 'now'
                        ? 'bg-gray-200 border border-gray-300 text-gray-400 cursor-not-allowed'
                        : selectedSlot === slot.time
                          ? 'text-white shadow-md'
                          : 'bg-white border border-gray-300 text-black hover:bg-gray-50'
                    }`}
                    style={selectedSlot === slot.time && !(isSlotPassed(slot.time) && pickupType === 'now') ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)' } : {}}
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
              {selectedSlot && (
                <p className="text-xs sm:text-sm mt-2 sm:mt-3" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Selected: {pickupType === "now" ? "Today" : "Tomorrow"}, {selectedSlot}
                </p>
              )}
            </>
          )}
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-black">Pickup & Delivery Address</h2>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" style={{ stroke: 'url(#gradient)' }} />
                <div className="min-w-0">
                  {customerAddress ? (
                    <>
                      <p className="font-semibold text-black text-sm sm:text-base">{customerAddress.street},</p>
                      <p className="font-semibold text-black text-sm sm:text-base">{customerAddress.city}, {customerAddress.state} - {customerAddress.pincode}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-black text-sm sm:text-base">No address found</p>
                      <p className="text-gray-500 text-xs sm:text-sm">Please add an address</p>
                    </>
                  )}
                </div>
              </div>
              <button 
                onClick={() => savedAddresses.length > 0 ? setShowAddressModal(true) : navigate("/add-address")}
                className="font-semibold text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
                style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                {savedAddresses.length > 0 ? 'Change' : 'Add'}
              </button>
            </div>
          </div>
        </div>

        {showAddressModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowAddressModal(false)}>
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 sm:p-6">
                <h3 className="text-lg font-bold text-black mb-4">Select Address</h3>
                <div className="space-y-3">
                  {savedAddresses.map((addr, index) => (
                    <div 
                      key={index}
                      onClick={() => {
                        setCustomerAddress(addr);
                        setShowAddressModal(false);
                      }}
                      className="p-4 rounded-2xl border-2 cursor-pointer"
                      style={customerAddress?.street === addr.street && customerAddress?.city === addr.city ? { borderColor: '#452D9B', backgroundColor: '#f0ebf8' } : { borderColor: '#e5e7eb' }}
                    >
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ stroke: 'url(#gradient)' }} />
                        <div className="flex-1">
                          <p className="font-semibold text-black text-sm">{addr.street}</p>
                          <p className="text-gray-600 text-xs">{addr.city}, {addr.state} - {addr.pincode}</p>
                          {addr.isDefault && <span className="text-xs font-medium" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Primary</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setShowAddressModal(false);
                      navigate("/add-address");
                    }}
                    className="w-full py-3 border-2 border-dashed rounded-2xl font-semibold"
                    style={{ borderColor: '#9b7dd4', background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                  >
                    + Add New Address
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-black">Order Summary</h2>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg space-y-2 sm:space-y-3">
            <p className="text-xs sm:text-sm text-black">
              Items: {pricingItems.filter(item => (quantities[item._id] || 0) > 0).map(item => `${quantities[item._id]} ${item.name}`).join(', ') || 'No items selected'}
            </p>
            <p className="text-xs sm:text-sm text-black">Service: Steam Iron</p>
            <p className="text-xs sm:text-sm text-black font-semibold">Minimum Order Value: ₹{minOrderPrice}</p>
            <div className="border-t pt-2 sm:pt-3">
              <p className="text-base sm:text-lg font-bold" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Estimated Total: ₹{calculateTotal()}</p>
              {calculateTotal() < minOrderPrice && (
                <p className="text-xs text-red-500 mt-1 sm:mt-2 font-semibold">⚠ Minimum order value of ₹{minOrderPrice} required</p>
              )}
            </div>
          </div>
        </div>

        {showSlotError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 animate-pulse">
            <p className="text-red-700 text-sm sm:text-base font-medium text-center">
              ⏰ This time slot has already passed. Please select an available time slot.
            </p>
          </div>
        )}
        
        <button
          onClick={() => {
            if (!customerAddress) {
              setToast({ show: true, message: 'Please select a delivery address', type: 'error' });
              setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
              return;
            }
            const orderData = {
              items: pricingItems
                .filter(item => (quantities[item._id] || 0) > 0)
                .map(item => ({
                  name: item.name,
                  quantity: quantities[item._id],
                  price: item.price
                })),
              total: calculateTotal(),
              pickupType,
              selectedSlot,
              address: customerAddress
            };
            navigate("/continue-booking", { state: orderData });
          }}
          disabled={calculateTotal() < minOrderPrice}
          className={`w-full h-12 sm:h-14 rounded-2xl text-sm sm:text-base font-semibold transition-colors shadow-lg ${
            calculateTotal() < minOrderPrice 
              ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
              : 'bg-gradient-to-r from-[#452D9B] to-[#07C8D0] hover:from-[#3a2682] hover:to-[#06b3bb] text-white'
          }`}
        >
          Confirm Order
        </button>
      </div>

      <BottomNavigation />

      {toast.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className={`${toast.type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-green-500 to-green-600'} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px]`}>
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <span className="font-semibold flex-1">{toast.message}</span>
            <button onClick={() => setToast({ show: false, message: '', type: '' })} className="flex-shrink-0 hover:bg-white/20 rounded-full p-1 transition-colors" aria-label="Close notification">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;
