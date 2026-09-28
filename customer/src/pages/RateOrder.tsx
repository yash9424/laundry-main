import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Shirt, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_URL } from '@/config/api';
import Header from "@/components/Header";

const RateOrder = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderData();
    }
  }, [orderId]);

  const fetchOrderData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        const order = data.data;
        setOrderData({
          id: order.orderId,
          rawOrderId: order._id, // Store the actual MongoDB _id
          items: order.items?.map((item: any) => `${item.quantity} ${item.name}`).join(', ') || 'No items',
          status: order.status.charAt(0).toUpperCase() + order.status.slice(1).replace(/_/g, ' '),
          deliveryDate: new Date(order.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          }),
          amount: `₹${order.totalAmount}`
        });
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  const handleStarClick = (starRating: number) => {
    setRating(starRating);
  };

  const handleSubmitRating = async () => {
    if (rating === 0) return;
    
    try {
      const customerId = localStorage.getItem('customerId') || '507f1f77bcf86cd799439011';
      
      // Get the actual order _id from the orderData
      const actualOrderId = orderData?.rawOrderId || orderId;
      
      console.log('Submitting review:', { actualOrderId, customerId, rating, feedback });
      
      const response = await fetch(`${API_URL}/api/orders/${actualOrderId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          rating,
          comment: feedback || 'No comment provided'
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('Review submitted successfully:', result);
        showSuccessPopup();
      } else {
        console.error('Failed to submit review:', result);
        alert(result.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    }
  };

  const handleSkip = () => {
    navigate(-1);
  };

  const showSuccessPopup = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      navigate(-1);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header 
        title="Rate Your Order"
        onBack={() => navigate(-1)}
      />

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Loading order details...
          </div>
        ) : !orderData ? (
          <div className="text-center py-8 text-gray-500">
            Order not found
          </div>
        ) : (
          <>
        {/* Order Details */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
              <Shirt className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-black mb-1">Order #{orderData.id}</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-1">{orderData.items} - {orderData.status}</p>
              <p className="text-xs sm:text-sm text-gray-500">on {orderData.deliveryDate}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg sm:text-xl font-bold" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{orderData.amount}</p>
            </div>
          </div>
        </div>

        {/* Rating Section */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg text-center">
          <h3 className="text-lg sm:text-xl font-bold text-black mb-6">How was your experience?</h3>
          
          {/* Star Rating */}
          <div className="flex justify-center gap-2 sm:gap-3 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleStarClick(star)}
                className="transition-all duration-200 hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 sm:w-10 sm:h-10 ${
                    star <= rating
                      ? "text-white"
                      : "text-gray-300 hover:text-gray-400"
                  }`}
                  style={star <= rating ? { fill: '#452D9B', stroke: '#452D9B' } : {}}
                />
              </button>
            ))}
          </div>

          {/* Rating Label */}
          {rating > 0 && (
            <p className="text-sm sm:text-base font-semibold text-gray-600 mb-6 uppercase tracking-wide">
              {ratingLabels[rating]}
            </p>
          )}

          {/* Feedback Textarea */}
          <div className="mb-6">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Write your feedback (optional)..."
              className="w-full h-24 sm:h-32 p-4 border-2 rounded-2xl resize-none focus:outline-none text-sm sm:text-base"
              style={{ borderColor: '#e0d4f7' }}
              onFocus={(e) => e.target.style.borderColor = '#452D9B'}
              onBlur={(e) => e.target.style.borderColor = '#e0d4f7'}
              maxLength={500}
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleSubmitRating}
              disabled={rating === 0}
              className="w-full h-12 sm:h-14 rounded-2xl font-semibold text-white text-base disabled:bg-gray-300 disabled:cursor-not-allowed"
              style={rating > 0 ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)' } : {}}
            >
              Submit Rating
            </Button>
            <Button
              onClick={handleSkip}
              variant="ghost"
              className="w-full h-10 sm:h-12 rounded-2xl font-semibold text-base"
              style={{ color: '#452D9B' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0ebf8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Skip
            </Button>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Thank you!</h3>
            <p className="text-gray-600">Your feedback has been submitted successfully.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateOrder;