import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shirt, Home as HomeIcon, Tag, ShoppingCart, RotateCcw, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import group12Image from "@/assets/Group (12).png";
import deliveryImage from "@/assets/Delivery.png";
import { API_URL } from '@/config/api';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import BottomNavigation from "@/components/BottomNavigation";
import Header from "@/components/Header";

const BookingHistory = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("scheduled");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

    // Handle hardware back button
    if (Capacitor.isNativePlatform()) {
      const handleBackButton = App.addListener('backButton', () => {
        navigate('/home');
      });
      
      return () => {
        handleBackButton.remove();
      };
    }
  }, [navigate]);

  const fetchOrders = async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    
    try {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) {
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${API_URL}/api/orders?customerId=${customerId}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId)
      const data = await response.json();
      
      if (data.success) {
        const formattedOrders = data.data.map((order: { orderId: string; items?: { quantity: number; name: string }[]; createdAt: string; totalAmount: number; status: string }) => ({
          id: order.orderId,
          items: order.items?.map((item: { quantity: number; name: string }) => `${item.quantity} ${item.name}`).join(', ') || 'No items',
          date: new Date(order.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }),
          price: `₹${order.totalAmount}`,
          status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
          rawOrder: order
        }));
        setOrders(formattedOrders);
      }
    } catch (error) {
      clearTimeout(timeoutId)
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === "scheduled") return true;
    if (activeTab === "in progress") return ['Pending', 'Confirmed', 'Picked_up', 'Processing', 'Ready', 'Out_for_delivery'].includes(order.status);
    if (activeTab === "delivered") return order.status === "Delivered";
    if (activeTab === "cancelled") return order.status === "Cancelled";
    return true;
  });

  return (
    <div className="min-h-screen bg-background page-with-bottom-nav">
      <Header 
        title="Booking History" 
        variant="gradient"
        onBack={() => navigate(-1)}
      />

      <div className="px-4 sm:px-6 py-4">
        {/* These used to sit in a scroller with a hidden scrollbar, so on a narrow
            phone "Cancelled" was off-screen with nothing to suggest it existed.
            Wrapping keeps every filter visible. */}
        <div className="pb-2 mb-4 sm:mb-6">
          <div className="flex flex-wrap gap-2 sm:gap-3 pl-1 pr-1">
            {["Scheduled", "In Progress", "Delivered", "Cancelled"].map((tab) => (
              <Button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`h-8 sm:h-10 rounded-2xl font-semibold whitespace-nowrap flex-shrink-0 px-3 sm:px-4 text-xs sm:text-sm transition-all ${
                  activeTab === tab.toLowerCase()
                    ? "text-white shadow-lg"
                    : "bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-50 shadow-md"
                }`}
                style={activeTab === tab.toLowerCase() ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)' } : {}}
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Loading orders...
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            {filteredOrders.map((order) => (
            <Card key={order.id} className="p-3 sm:p-4 rounded-2xl border-2 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-2 sm:mb-3 gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
                    <Shirt className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm sm:text-base">Order #{order.id}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{order.items}</p>
                  </div>
                </div>
                <span
                  className="px-2 sm:px-3 py-1 text-xs font-semibold rounded-full flex-shrink-0 shadow-md text-white"
                  style={
                    order.status === "Delivered" 
                      ? { background: 'linear-gradient(to right, #10b981, #059669)' } 
                      : order.status === "Cancelled" 
                      ? { background: 'linear-gradient(to right, #ef4444, #dc2626)' }
                      : { background: 'linear-gradient(to right, #452D9B, #07C8D0)' }
                  }
                >
                  {order.status}
                </span>
              </div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-muted-foreground">{order.date}</p>
                <p className="text-base sm:text-lg font-bold" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{order.price}</p>
              </div>
              <div className="flex gap-3 sm:gap-4">
                <button
                  onClick={() => navigate("/order-details", { state: { orderId: order.id, order: order.rawOrder } })}
                  className="font-semibold text-xs sm:text-sm"
                  style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                >
                  View Order
                </button>

                <button
                  onClick={() => navigate(`/rate-order/${order.id}`)}
                  className="font-semibold text-xs sm:text-sm"
                  style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                >
                  Rate Service
                </button>
              </div>
            </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 sm:py-12">
          <img 
            src={deliveryImage}
            alt="No Orders" 
            className="w-64 h-64 sm:w-80 sm:h-80 mb-4 sm:mb-6 object-contain"
          />
          <h3 className="text-lg sm:text-xl font-bold mb-2">No orders yet.</h3>
          <p className="text-muted-foreground text-center mb-4 sm:mb-6 text-sm sm:text-base px-4">
            Tap 'Book Now' to place your first order.
          </p>
          <Button
            onClick={() => navigate("/prices")}
            className="h-10 sm:h-12 rounded-2xl px-6 sm:px-8 font-semibold text-sm sm:text-base text-white shadow-lg"
            style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
          >
            Book Now
          </Button>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default BookingHistory;
