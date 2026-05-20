import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle2, MapPin, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toast, ConfirmDialog } from "@/components/Toast";
import { API_URL } from '@/config/api';

const BookingConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const orderData = location.state || {};
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({ show: false, message: '', type: 'success' });
  const [charges, setCharges] = useState({ cancellationPercentage: 20, customerUnavailable: 150, incorrectAddress: 150, refusalToAccept: 150, cancellationPolicyText: '' });
  
  const orderId = orderData.orderId || 12345;
  const items = orderData.items || '3 Shirts, 1 Bedsheet';
  const service = orderData.service || 'Steam Iron';
  const total = orderData.total || 150;
  const status = orderData.status || 'Scheduled';

  useEffect(() => {
    fetchCancellationCharges();
  }, []);

  const fetchCancellationCharges = async () => {
    try {
      const response = await fetch(`${API_URL}/api/order-charges`);
      const data = await response.json();
      if (data.success) setCharges(data.data);
    } catch (error) {
      console.error('Error fetching cancellation charges:', error);
    }
  };
  const cancellationPercentage = charges.cancellationPercentage;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-background border-b border-border px-4 sm:px-6 py-4 flex items-center">
        <button onClick={() => navigate(-1)} className="flex-shrink-0" aria-label="Go back">
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <h1 className="text-lg sm:text-xl font-bold ml-3 sm:ml-4">Order Confirmed</h1>
      </header>

      <div className="px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center page-bottom-content">
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-xl" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
          <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-white" strokeWidth={3} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">
          Your booking is<br />confirmed!
        </h1>
        
        <p className="text-center text-muted-foreground mb-1 text-sm sm:text-base">
          Order #{orderId} has been placed successfully.
        </p>
        <p className="text-center text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base">
          Pickup scheduled for {orderData.pickupType === 'now' ? 'Today' : 'Tomorrow'}, {orderData.selectedSlot || '9-11 AM'}.
        </p>

        <Card className="w-full p-4 sm:p-6 rounded-2xl border-2 mb-4 sm:mb-6">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-start gap-3">
              <span className="text-muted-foreground text-sm sm:text-base">Items:</span>
              <span className="font-semibold text-sm sm:text-base text-right">{items}</span>
            </div>
            <div className="flex justify-between items-start gap-3">
              <span className="text-muted-foreground text-sm sm:text-base">Service:</span>
              <span className="font-semibold text-sm sm:text-base">{service}</span>
            </div>
            <div className="flex justify-between items-start gap-3">
              <span className="text-muted-foreground text-sm sm:text-base">Price:</span>
              <span className="font-bold text-primary text-base sm:text-lg">₹{total}</span>
            </div>
            <div className="flex justify-between items-start gap-3">
              <span className="text-muted-foreground text-sm sm:text-base">Status:</span>
              <span className="font-semibold text-primary text-sm sm:text-base">{status}</span>
            </div>
            {orderData.discount > 0 && (
              <div className="flex justify-between items-start gap-3">
                <span className="text-muted-foreground text-sm sm:text-base">Discount:</span>
                <span className="font-semibold text-green-600 text-sm sm:text-base">-₹{orderData.discount}</span>
              </div>
            )}
            {orderData.expressDelivery && orderData.expressDeliveryFee > 0 && (
              <div className="flex justify-between items-start gap-3">
                <span className="text-muted-foreground text-sm sm:text-base">⚡ Express Delivery:</span>
                <span className="font-semibold text-orange-600 text-sm sm:text-base">+₹{orderData.expressDeliveryFee}</span>
              </div>
            )}
            <div className="flex justify-between items-start gap-3">
              <span className="text-muted-foreground text-sm sm:text-base">Payment Method:</span>
              <span className="font-semibold text-sm sm:text-base">{orderData.customerInfo?.paymentMethods?.find((pm: { isPrimary?: boolean; type?: string }) => pm.isPrimary)?.type || 'Cash on Delivery'}</span>
            </div>
            <div className="flex justify-between items-start gap-3">
              <span className="text-muted-foreground text-sm sm:text-base">Payment Status:</span>
              <span className={`font-semibold text-sm sm:text-base ${orderData.paymentStatus === 'Paid' ? 'text-green-600' : 'text-orange-600'}`}>
                {orderData.paymentStatus || 'Pending'}
              </span>
            </div>
          </div>
        </Card>

        <Button
          onClick={() => navigate("/order-details", { state: orderData })}
          className="w-full h-12 sm:h-14 rounded-2xl text-sm sm:text-base font-semibold mb-3 text-white shadow-lg"
          style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
        >
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Track Order
        </Button>

        <Button
          onClick={() => navigate("/home")}
          variant="outline"
          className="w-full h-12 sm:h-14 rounded-2xl text-sm sm:text-base font-semibold mb-3 border-2"
          style={{ borderColor: '#452D9B', color: '#452D9B' }}
        >
          Back to Home
        </Button>

        <Button
          onClick={() => setShowConfirmDialog(true)}
          className="w-full h-12 sm:h-14 rounded-2xl text-sm sm:text-base font-semibold mb-4 sm:mb-6 text-white shadow-lg"
          style={{ background: 'linear-gradient(to right, #ef4444, #dc2626)' }}
        >
          Cancel Order
        </Button>

        <button 
          onClick={() => setShowCancellationModal(true)}
          className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 underline mt-4"
        >
          View Cancellation Policy
        </button>
      </div>

      {/* Cancellation Policy Modal */}
      {showCancellationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg sm:text-xl font-bold">Cancellation Fees Terms</h2>
              <button onClick={() => setShowCancellationModal(false)} className="p-1" aria-label="Close modal">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6 text-xs sm:text-sm">
              {charges.cancellationPolicyText ? (
                <p className="whitespace-pre-wrap leading-relaxed">{charges.cancellationPolicyText}</p>
              ) : (
                <p className="text-gray-500 text-center py-4">Cancellation policy not set. Please contact support.</p>
              )}
            </div>
            <div className="p-4 border-t">
              <Button
                onClick={() => setShowCancellationModal(false)}
                className="w-full h-10 sm:h-12 rounded-xl text-white"
                style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirmDialog && (
        <ConfirmDialog
          title="Cancel Order"
          message="Are you sure you want to cancel this order? Cancellation charges may apply."
          confirmText="Yes, Cancel"
          cancelText="No, Keep Order"
          onConfirm={async () => {
            setShowConfirmDialog(false);
            try {
              const orderRes = await fetch(`${API_URL}/api/orders`);
              const ordersData = await orderRes.json();
              const order = ordersData.data.find((o: { orderId: string | number; _id: string | number; partnerId?: string; totalAmount: number }) => 
                o.orderId === `#${orderId}` || 
                o.orderId === orderId || 
                o._id === orderId ||
                o._id === orderData._id
              );
              
              if (!order) {
                setToast({ show: true, message: 'Order not found', type: 'error' });
                return;
              }
              
              console.log('Order found:', order._id);
              console.log('Order status:', order.status);
              console.log('Order total:', order.totalAmount);
              console.log('Partner assigned:', order.partnerId);
              console.log('Cancellation percentage:', cancellationPercentage);
              
              let cancellationFee = 0;
              if (order.partnerId) {
                cancellationFee = Math.round((order.totalAmount * cancellationPercentage) / 100);
                console.log('Partner assigned - Calculated fee:', cancellationFee);
              } else {
                console.log('No partner assigned - No cancellation fee');
              }
              
              const response = await fetch(`${API_URL}/api/orders/${order._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  status: 'cancelled',
                  cancelledAt: new Date().toISOString(),
                  cancellationReason: 'Cancelled by customer'
                })
              });
              
              if (response.ok) {
                const result = await response.json();
                const actualFee = result.cancellationFee || 0;
                const message = actualFee > 0 
                  ? `Order cancelled. Cancellation charge of ₹${actualFee} (${cancellationPercentage}% of ₹${order.totalAmount}) has been deducted from your wallet.` 
                  : 'Order cancelled successfully. No cancellation charge applied.';
                setToast({ show: true, message, type: actualFee > 0 ? 'warning' : 'success' });
                setTimeout(() => navigate('/home'), 4000);
              } else {
                setToast({ show: true, message: 'Failed to cancel order. Please try again.', type: 'error' });
              }
            } catch (error) {
              console.error('Error cancelling order:', error);
              setToast({ show: true, message: 'Failed to cancel order. Please try again.', type: 'error' });
            }
          }}
          onCancel={() => setShowConfirmDialog(false)}
        />
      )}

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={5000}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}
    </div>
  );
};

export default BookingConfirmation;
