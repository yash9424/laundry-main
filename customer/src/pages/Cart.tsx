import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingCart, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_URL } from '@/config/api';
import BottomNavigation from "@/components/BottomNavigation";
import Header from "@/components/Header";
import { App } from '@capacitor/app';

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
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [pickupType, setPickupType] = useState<"now" | "later">("now");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showSlotError, setShowSlotError] = useState(false);
  const [minOrderPrice, setMinOrderPrice] = useState(500);
  const [daySettings, setDaySettings] = useState({ todaySlotsEnabled: true, tomorrowSlotsEnabled: true });

  useEffect(() => {
    loadCartItems();
    fetchTimeSlots('now');
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
        setMinOrderPrice(data.data.minOrderPrice || 500);
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

  const handlePickupTypeChange = (type: "now" | "later") => {
    setPickupType(type);
    fetchTimeSlots(type);
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

  const handleProceedToCheckout = () => {
    if (selectedItems.size === 0) {
      alert('Please select at least one item to order');
      return;
    }
    if (getSelectedTotal() < minOrderPrice) {
      alert(`Minimum order value is ₹${minOrderPrice}. Please add more items.`);
      return;
    }
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
    const orderData = {
      cartItems: selectedCartItems,
      totalAmount: getSelectedTotal(),
      pickupType,
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
          <button onClick={clearCart} className="text-red-500">
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
                <div className="flex justify-between text-sm">
                  <span>Minimum Order:</span>
                  <span className="font-semibold">₹{minOrderPrice}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Order Total:</span>
                  <span style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    ₹{getSelectedTotal()}
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
                  : `Select Pickup Slot - ₹${getSelectedTotal()}`
              }
            </Button>
          </>
        )}
      </div>

      <BottomNavigation />

      {showSlotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-black">Select Pickup Slot</h3>
              <button onClick={() => setShowSlotModal(false)} className="text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => handlePickupTypeChange("now")}
                  className={`flex-1 h-10 rounded-2xl font-semibold text-sm shadow-md ${
                    pickupType === "now"
                      ? "text-white"
                      : "bg-white border border-gray-300 hover:bg-gray-50"
                  }`}
                  style={pickupType === "now" ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)' } : { color: '#452D9B' }}
                >
                  Pickup Today
                </button>
                <button
                  onClick={() => handlePickupTypeChange("later")}
                  className={`flex-1 h-10 rounded-2xl font-semibold text-sm shadow-md ${
                    pickupType === "later"
                      ? "text-white"
                      : "bg-white border border-gray-300 hover:bg-gray-50"
                  }`}
                  style={pickupType === "later" ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)' } : { color: '#452D9B' }}
                >
                  Pickup Tomorrow
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="font-semibold mb-3 text-black">{pickupType === 'now' ? "Today's" : "Tomorrow's"} Pickup Slots</h4>
              {((pickupType === 'now' && !daySettings.todaySlotsEnabled) || (pickupType === 'later' && !daySettings.tomorrowSlotsEnabled)) ? (
                <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 text-center">
                  <p className="text-orange-600 font-semibold text-sm">
                    {pickupType === 'now' ? 'Today' : 'Tomorrow'} pickup is currently unavailable.
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
                    Next available slot: {pickupType === "now" ? "Today" : "Tomorrow"}, {selectedSlot || 'No slots available'}
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
                <div className="flex justify-between font-semibold">
                  <span>Pickup: {pickupType === 'now' ? 'Today' : 'Tomorrow'}</span>
                  <span>{selectedSlot || 'No slot selected'}</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={confirmOrder}
              disabled={!selectedSlot}
              className={`w-full py-3 rounded-2xl font-semibold ${
                selectedSlot 
                  ? 'bg-gradient-to-r from-[#452D9B] to-[#07C8D0] text-white' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Confirm Order - ₹{getSelectedTotal()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;