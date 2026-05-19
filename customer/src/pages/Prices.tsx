import { useNavigate } from "react-router-dom";
import { Info, Shirt, Bed, Home as HomeIcon, Tag, ShoppingCart, RotateCcw, User, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { API_URL } from '@/config/api';
import { Button } from "@/components/ui/button";
import BottomNavigation from "@/components/BottomNavigation";
import Header from "@/components/Header";
import { App } from '@capacitor/app';

const Prices = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchCategories();
    
    // Handle hardware back button
    const handleBackButton = () => {
      if (selectedCategory !== null) {
        setSelectedCategory(null);
      } else {
        navigate('/home');
      }
      return true; // Prevent default behavior
    };
    
    App.addListener('backButton', handleBackButton);
    
    return () => {
      App.removeAllListeners();
    };
  }, [navigate, selectedCategory]);

  useEffect(() => {
    // Show "How to Order" modal automatically on first visit
    const hasSeenTutorial = sessionStorage.getItem('hasSeenPricesTutorial');
    if (!hasSeenTutorial) {
      const timer = setTimeout(() => {
        setShowInfoModal(true);
        sessionStorage.setItem('hasSeenPricesTutorial', 'true');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pricing/categories`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.data.map((cat: any) => cat.name));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pricing`);
      const data = await response.json();
      if (data.success) {
        setItems(data.data);
        
        // Load quantities from existing cart
        const existingCart = JSON.parse(localStorage.getItem('cartItems') || '[]');
        const initialQuantities: {[key: string]: number} = {};
        data.data.forEach((item: any) => {
          const cartItem = existingCart.find((c: any) => c.id === item._id);
          initialQuantities[item._id] = cartItem ? cartItem.quantity : 0;
        });
        setQuantities(initialQuantities);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };


  const updateQuantity = (itemId: string, increment: boolean) => {
    const item = items.find(i => i._id === itemId);
    if (!item) return;

    const newQty = Math.max(0, (quantities[itemId] || 0) + (increment ? 1 : -1));
    setQuantities(prev => ({ ...prev, [itemId]: newQty }));

    // Sync to cart immediately
    const cart = JSON.parse(localStorage.getItem('cartItems') || '[]');
    const idx = cart.findIndex((c: any) => c.id === itemId);

    if (newQty === 0) {
      if (idx >= 0) cart.splice(idx, 1);
    } else if (idx >= 0) {
      cart[idx].quantity = newQty;
    } else {
      cart.push({ id: item._id, name: item.name, price: item.price, quantity: newQty, category: item.category || 'Laundry' });
    }

    localStorage.setItem('cartItems', JSON.stringify(cart));
  };

  const getTotalItems = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const filteredItems = selectedCategory === 'All'
    ? items 
    : items.filter(item => item.category === selectedCategory);

  const groupedItems = filteredItems.reduce((acc: any, item: any) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 page-with-bottom-nav">
      <Header 
        title="Categories" 
        variant="gradient"
        rightAction={
          <button onClick={() => setShowInfoModal(true)}>
            <Info className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
        }
      />

      <div className="px-4 sm:px-6 py-4 sm:py-6">
        {selectedCategory === null && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {/* All Items Card */}
            <button 
              onClick={() => setSelectedCategory('All')}
              className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow text-left"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2 sm:mb-3 shadow-md" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className="font-bold text-sm sm:text-lg mb-1 text-black">All Items</h3>
              <p className="text-xs sm:text-sm text-gray-500">
                {items.length} items
              </p>
            </button>

            {categories.map((cat) => {
              const Icon = cat.toLowerCase().includes('household') || cat.toLowerCase().includes('home') ? Bed : Shirt;
              return (
                <button 
                  key={cat} 
                  onClick={() => setSelectedCategory(cat)}
                  className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow text-left"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2 sm:mb-3 shadow-md" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-sm sm:text-lg mb-1 text-black">{cat}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {items.filter(item => item.category === cat).length} items
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading prices...</div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-lg">
            <p className="text-center text-sm text-gray-600">No pricing items available yet.</p>
          </div>
        ) : selectedCategory !== null ? (
          <div>
            <div className="mb-4">
              <button 
                onClick={() => setSelectedCategory(null)}
                className="text-blue-500 text-sm font-medium hover:underline"
              >
                ← Back to all categories
              </button>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {selectedCategory === 'All' ? 'All Items' : selectedCategory}
              </h2>
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {filteredItems.map((item: any, index: number) => (
                  <div
                    key={item._id}
                    className={`flex items-center justify-between p-4 ${
                      index !== filteredItems.length - 1 ? 'border-b border-gray-100' : ''
                    } hover:bg-blue-50 transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
                        <Shirt className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800 block">{item.name}</span>
                        <span className="text-lg font-bold" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                          ₹{item.price}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item._id, false)}
                        className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold shadow-md"
                        style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold text-black">
                        {quantities[item._id] || 0}
                      </span>
                      <button
                        onClick={() => updateQuantity(item._id, true)}
                        className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold shadow-md"
                        style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* View Cart Button */}
        {false && getTotalItems() > 0 && (
          <div className="mt-6">
            <Button
              onClick={() => navigate('/cart')}
              className="w-full h-12 bg-gradient-to-r from-[#452D9B] to-[#07C8D0] hover:from-[#3a2682] hover:to-[#06b3bb] text-white rounded-2xl font-semibold shadow-lg flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              View Cart ({getTotalItems()} items)
            </Button>
          </div>
        )}

        <div className="mt-6 rounded-2xl p-4 shadow-md" style={{ background: 'linear-gradient(to bottom right, #f0ebf8, #e0f7f9)' }}>
          <p className="text-center text-xs text-gray-700 font-medium">
            *All services include professional steam ironing as standard.
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`${toast.type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-green-500 to-green-600'} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3`}>
            <span className="font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm mx-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowInfoModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <Info className="w-6 h-6" />
            </button>
            
            <h3 className="text-xl font-bold mb-6 text-center" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              How to Order
            </h3>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>1</div>
                <div>
                  <p className="font-semibold text-gray-800">Choose Items</p>
                  <p className="text-sm text-gray-600">Use the <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded text-xs font-bold">+</span> sign to add quantity for each item you want to iron.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>2</div>
                <div>
                  <p className="font-semibold text-gray-800">Add to Cart</p>
                  <p className="text-sm text-gray-600">Click the "Add to Cart" button at the bottom once you've selected your items.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>3</div>
                <div>
                  <p className="font-semibold text-gray-800">Select Slot & Confirm</p>
                  <p className="text-sm text-gray-600">Choose a convenient pickup time slot, confirm your ride, and add any special instructions.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowInfoModal(false)}
              className="w-full mt-8 py-3 rounded-2xl font-semibold text-white shadow-lg"
              style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
};

export default Prices;
