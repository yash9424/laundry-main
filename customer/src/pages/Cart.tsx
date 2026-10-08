import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft } from "lucide-react";
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


const Cart = () => {
  const navigate = useNavigate();
  const [showClearCartDialog, setShowClearCartDialog] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [checklistEnabled, setChecklistEnabled] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [minOrderPrice, setMinOrderPrice] = useState(500);
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
        if (data.success) setChecklistEnabled(data.data?.pickupChecklistEnabled !== false);
      })
      .catch(err => console.error('Error fetching express delivery fee:', err));
  }, []);

  const getOrderTotal = () => {
    return getSelectedTotal() + (isExpressSelected ? expressDeliveryFee : 0);
  };

  useEffect(() => {
    loadCartItems();
    fetchMinOrderPrice();
    
    // No back-button listener here. The one in App.tsx handles every screen,
    // and this one's cleanup called App.removeAllListeners(), which removed the
    // global handler as well -- after which back did nothing anywhere until the
    // app was restarted.
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

  const handleProceedToCheckout = () => {
    if (selectedItems.size === 0) {
      alert('Please select at least one item to order');
      return;
    }
    if (getSelectedTotal() < minOrderPrice) {
      alert(`Minimum order value is ₹${minOrderPrice}. Please add more items.`);
      return;
    }
    // Checkout is two screens of its own now, so the hardware back button has
    // somewhere real to go. If an admin has switched the checklist off there is
    // nothing to show, so go straight to the slot.
    const checkout = {
      cartItems: getSelectedCartItems(),
      totalAmount: getSelectedTotal(),
    };
    navigate(checklistEnabled ? '/pickup-checklist' : '/pickup-slot', { state: checkout });
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