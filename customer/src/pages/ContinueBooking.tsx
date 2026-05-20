import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shirt, CheckCircle2, MapPin, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LeafletMap from "@/components/LeafletMap";
import { API_URL } from '@/config/api';
import Header from "@/components/Header";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const ContinueBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const orderData = location.state || {};
  
  // Check if coming from cart
  const isFromCart = orderData.cartItems && Array.isArray(orderData.cartItems);
  
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [pastOrders, setPastOrders] = useState<any[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentWarning, setShowPaymentWarning] = useState(false);
  const [showAddressWarning, setShowAddressWarning] = useState(false);
  const [paymentWarningMessage, setPaymentWarningMessage] = useState('');
  const [realItemData, setRealItemData] = useState<any[]>([]);
  const [loading, setLoading] = useState(isFromCart);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [expressDelivery, setExpressDelivery] = useState(false);
  const [expressDeliveryPrice, setExpressDeliveryPrice] = useState(0);

  // Use real item data if fetched, otherwise use original data
  const items = realItemData.length > 0 ? realItemData : (isFromCart ? orderData.cartItems : (orderData.items || []));
  const totalAmount = realItemData.length > 0 
    ? realItemData.reduce((total, item) => total + (item.price * item.quantity), 0)
    : (isFromCart ? orderData.totalAmount : (orderData.total || 120));
  
  const itemsText = items.length > 0 
    ? items.map((item: any) => `${item.quantity} ${item.name}`).join(', ') 
    : '3 Shirts, 1 Bedsheet';
  const dueAmount = customerInfo?.dueAmount || 0;
  const walletBalance = customerInfo?.walletBalance || 0;
  const expressDeliveryFee = expressDelivery ? expressDeliveryPrice : 0;
  const amountAfterDiscount = totalAmount - discount + dueAmount + expressDeliveryFee;
  const walletUsed = Math.min(walletBalance, amountAfterDiscount);
  const finalAmount = Math.max(0, amountAfterDiscount - walletUsed);
  
  useEffect(() => {
    fetchCustomerInfo();
    fetchPastOrders();
    fetchExpressPrice();

    // If coming from cart, fetch real item data from API
    if (isFromCart && orderData.cartItems) {
      fetchRealItemData();
    }
    
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);
  
  const fetchRealItemData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pricing`);
      const data = await response.json();
      
      if (data.success && orderData.cartItems) {
        // Map cart items to real pricing data
        const realItems = orderData.cartItems.map((cartItem: any) => {
          const realItem = data.data.find((item: any) => item._id === cartItem.id);
          return {
            _id: cartItem.id,
            name: realItem?.name || cartItem.name,
            price: realItem?.price || cartItem.price,
            quantity: cartItem.quantity,
            category: realItem?.category || cartItem.category
          };
        });
        
        setRealItemData(realItems);
      }
    } catch (error) {
      console.error('Failed to fetch real item data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchExpressPrice = async () => {
    try {
      const response = await fetch(`${API_URL}/api/order-charges`);
      const data = await response.json();
      if (data.success && data.data) {
        setExpressDeliveryPrice(data.data.expressDeliveryPrice || 0);
      }
    } catch (error) {
      console.error('Failed to fetch order charges:', error);
    }
  };

  const fetchCustomerInfo = async () => {
    try {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) return;
      
      const response = await fetch(`${API_URL}/api/mobile/profile?customerId=${customerId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setCustomerInfo(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch customer info:', error);
    }
  };
  
  const fetchPastOrders = async () => {
    try {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) return;
      
      const response = await fetch(`${API_URL}/api/orders?customerId=${customerId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const recentOrder = data.data.slice(0, 1);
        setPastOrders(recentOrder);
      }
    } catch (error) {
      console.error('Failed to fetch past orders:', error);
    }
  };
  
  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    try {
      const customerId = localStorage.getItem('customerId');
      if (!customerId) {
        setCouponError("Please login to use coupons");
        return;
      }
      
      // Check if customer already used this voucher in a PAID order
      const ordersRes = await fetch(`${API_URL}/api/orders?customerId=${customerId}`);
      const ordersData = await ordersRes.json();
      
      if (ordersData.success && ordersData.data) {
        // Only check vouchers used in successfully paid orders
        const paidOrders = ordersData.data.filter((order: any) => order.paymentStatus === 'paid');
        const usedVoucherCodes = paidOrders
          .map((order: any) => order.appliedVoucherCode)
          .filter((code: string) => code && code.trim());
        
        const alreadyUsed = usedVoucherCodes.includes(couponCode.trim());
        
        if (alreadyUsed) {
          setCouponError("You have already used this coupon");
          setDiscount(0);
          setAppliedVoucher(null);
          return;
        }
      }
      
      const response = await fetch(`${API_URL}/api/vouchers`);
      const data = await response.json();
      
      if (data.success) {
        const voucher = data.data.find((v: any) => v.code === couponCode.trim() && v.isActive);
        
        if (voucher) {
          const discountAmount = Math.floor((totalAmount * voucher.discount) / 100);
          setDiscount(discountAmount);
          setAppliedVoucher(voucher);
          setCouponError("");
        } else {
          setCouponError("Invalid or inactive coupon code");
          setDiscount(0);
          setAppliedVoucher(null);
        }
      }
    } catch (error) {
      setCouponError("Failed to apply coupon");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#452D9B', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#07C8D0', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      </svg>
      <Header 
        title="Final Step" 
        variant="gradient"
        backTo="/home"
      />

      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 page-bottom-content">
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
                <Shirt className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-black text-sm sm:text-base">Order #{Math.floor(Math.random() * 90000) + 10000}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{itemsText}</p>
                <p className="text-base sm:text-lg font-bold" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>₹{totalAmount}</p>
              </div>
            </div>
            <span className="px-2 sm:px-4 py-1 sm:py-1.5 text-white text-xs sm:text-sm font-semibold rounded-full flex-shrink-0 shadow-md" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
              In Progress
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg relative overflow-hidden">
          <div className="mb-3 sm:mb-4 h-32 sm:h-48 rounded-xl overflow-hidden relative">
            {customerInfo?.address?.[0] ? (
              <LeafletMap address={customerInfo.address[0]} />
            ) : (
              <div className="h-full bg-blue-50 rounded-xl flex items-center justify-center">
                <div className="text-center p-4">
                  <MapPin className="w-8 h-8 mx-auto mb-2" style={{ stroke: 'url(#gradient)' }} />
                  <p className="text-xs font-semibold" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>No address</p>
                  <p className="text-xs" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Add address to see map</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 w-12 h-16 sm:w-16 sm:h-20 bg-white rounded-lg shadow-lg p-1.5 sm:p-2 z-10">
              <div className="w-full h-6 sm:h-8 bg-blue-100 rounded flex items-center justify-center mb-1">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4" style={{ stroke: 'url(#gradient)' }} />
              </div>
              <div className="space-y-0.5">
                <div className="h-1 bg-green-500 rounded"></div>
                <div className="h-1 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>
          {/* Temporarily hidden - not in use currently
          <div className="flex gap-2 sm:gap-3">
            <Button className="flex-1 h-10 sm:h-12 rounded-2xl font-semibold bg-white border border-gray-300 text-black hover:bg-gray-50 text-xs sm:text-sm">
              Contact Partner
            </Button>
            <Button className="flex-1 h-10 sm:h-12 rounded-2xl font-semibold bg-white border border-red-300 text-red-500 hover:bg-red-50 text-xs sm:text-sm">
              Report Issue
            </Button>
          </div>
          */}
        </div>

        {pastOrders.length > 0 && (
          <div>
            <h2 className="text-base sm:text-lg font-bold mb-3 text-black">Past Orders</h2>
            <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2 gap-3">
                <p className="font-bold text-black text-sm sm:text-base">Order #{pastOrders[0].orderId}</p>
                <span className="px-2 sm:px-4 py-1 text-white text-xs sm:text-sm font-semibold rounded-full flex-shrink-0" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
                  {pastOrders[0].status}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mb-2">{pastOrders[0].items?.map((item: any) => `${item.quantity} ${item.name}`).join(', ') || 'No items'}</p>
              <button 
                onClick={() => navigate("/order-details", { state: { orderId: pastOrders[0].orderId, order: pastOrders[0] } })}
                className="font-semibold text-xs sm:text-sm"
                style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                View Details
              </button>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3 text-black">Additional Information</h2>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg space-y-2 text-xs sm:text-sm text-gray-600">
            <p>Delivery Address: {customerInfo?.address?.[0] ? `${customerInfo.address[0].street}, ${customerInfo.address[0].city}, ${customerInfo.address[0].state} - ${customerInfo.address[0].pincode}` : 'No address found'}</p>
            <p>Contact Number: {customerInfo?.mobile || 'Not provided'}</p>
            <p>Email: {customerInfo?.email || 'Not provided'}</p>
            <p>Payment Method: {customerInfo?.paymentMethods?.[0]?.type || 'Please add payment method on profile'}</p>
          </div>
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3 text-black">Additional Notes</h2>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg">
            <textarea
              placeholder="Add any special instructions for pickup/delivery (optional)..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full h-20 rounded-xl border-2 border-gray-300 px-3 py-2 text-sm resize-none outline-none focus:border-[#452D9B] focus:ring-2 focus:ring-[#452D9B]/20"
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-2">{additionalNotes.length}/200 characters</p>
          </div>
        </div>

        {expressDeliveryPrice > 0 && (
          <div>
            <h2 className="text-base sm:text-lg font-bold mb-3 text-black">Priority Express Delivery</h2>
            <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(to right, #f59e0b, #ef4444)' }}>
                    <span className="text-lg">⚡</span>
                  </div>
                  <div>
                    <p className="font-bold text-black text-sm sm:text-base">Priority Express</p>
                    <p className="text-xs text-gray-500">Delivery in 4–6 hours</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>+₹{expressDeliveryPrice}</span>
                  <button
                    type="button"
                    title={expressDelivery ? 'Disable express delivery' : 'Enable express delivery'}
                    onClick={() => setExpressDelivery(!expressDelivery)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${expressDelivery ? 'bg-gradient-to-r from-[#452D9B] to-[#07C8D0]' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${expressDelivery ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3 text-black">Coupon Code</h2>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg space-y-3 sm:space-y-4">
            <div className="flex gap-2 sm:gap-3">
              <Input
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 h-10 sm:h-12 rounded-2xl border-2 bg-white text-sm sm:text-base"
              />
              <Button 
                onClick={applyCoupon}
                className="h-10 sm:h-12 rounded-2xl px-4 sm:px-8 font-semibold bg-gradient-to-r from-[#452D9B] to-[#07C8D0] hover:from-[#3a2682] hover:to-[#06b3bb] text-white text-xs sm:text-sm shadow-md"
              >
                Apply
              </Button>
            </div>
            {couponError && (
              <p className="text-red-500 text-xs sm:text-sm">{couponError}</p>
            )}
            {appliedVoucher && (
              <p className="text-green-600 text-xs sm:text-sm font-semibold">
                🎉 {appliedVoucher.slogan} - {appliedVoucher.discount}% discount applied!
              </p>
            )}
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Sub Total (Included GST):</span>
                <span className="text-black">₹{totalAmount}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount Added:</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              {expressDelivery && expressDeliveryFee > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Express Delivery Fee:</span>
                  <span>+₹{expressDeliveryFee}</span>
                </div>
              )}
              {dueAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Pending Due:</span>
                  <span>+₹{dueAmount}</span>
                </div>
              )}
              {walletUsed > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Wallet Balance Used:</span>
                  <span>-₹{walletUsed}</span>
                </div>
              )}
              {walletBalance > 0 && (
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>Available Wallet Balance:</span>
                  <span>₹{walletBalance}</span>
                </div>
              )}
              <div className="flex justify-between text-base sm:text-lg font-bold text-black">
                <span>Amount to Pay:</span>
                <span>₹{finalAmount}</span>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={async () => {
            try {
              const customerId = localStorage.getItem('customerId');
              if (!customerId) {
                alert('Please login to place order');
                return;
              }
              
              // Validate address
              const hasAddress = orderData.address || (customerInfo?.address && customerInfo.address.length > 0);
              console.log('Address validation check:', { hasAddress, orderDataAddress: orderData.address, customerInfoAddress: customerInfo?.address });
              
              if (!hasAddress) {
                console.log('Setting showAddressWarning to true');
                setShowAddressWarning(true);
                return;
              }

              // Validate payment method
              if (!customerInfo?.paymentMethods || customerInfo.paymentMethods.length === 0) {
                setPaymentWarningMessage('Please add a payment method before placing order. Go to Profile → Payment Methods to add one.');
                setShowPaymentWarning(true);
                return;
              }
              
              const primaryPaymentMethod = customerInfo.paymentMethods.find((pm: any) => pm.isPrimary);
              if (!primaryPaymentMethod) {
                setPaymentWarningMessage('Please set a primary payment method before placing order. Go to Profile → Payment Methods and mark one as primary.');
                setShowPaymentWarning(true);
                return;
              }
              
              setIsProcessingPayment(true);
              
              // Get selected payment method
              const paymentMethod = primaryPaymentMethod.type;
              
              // If wallet covers full amount, place order directly without Razorpay
              if (finalAmount === 0) {
                const orderPayload = {
                  customerId,
                  items: items || [],
                  totalAmount: amountAfterDiscount,
                  pickupAddress: orderData.address || customerInfo?.address?.[0],
                  pickupSlot: orderData.selectedSlot || 'Next Available',
                  pickupDate: orderData.pickupType === 'now' ? new Date() : new Date(Date.now() + 24 * 60 * 60 * 1000),
                  paymentMethod: 'Wallet',
                  paymentStatus: 'paid',
                  walletUsed: walletUsed,
                  appliedVoucherCode: appliedVoucher?.code || null,
                  specialInstructions: additionalNotes.trim() || null,
                  expressDelivery: expressDelivery,
                  expressDeliveryFee: expressDeliveryFee
                };
                
                const response = await fetch(`${API_URL}/api/orders`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(orderPayload)
                });
                
                const result = await response.json();
                setIsProcessingPayment(false);
                
                if (result.success) {
                  // Clear cart items from localStorage
                  localStorage.removeItem('cartItems');
                  
                  navigate("/booking-confirmation", { 
                    state: {
                      orderId: result.data.orderId,
                      items: itemsText,
                      service: 'Steam Iron',
                      total: amountAfterDiscount,
                      originalTotal: totalAmount,
                      discount: discount,
                      walletUsed: walletUsed,
                      appliedVoucher: appliedVoucher,
                      customerInfo: customerInfo,
                      status: 'Pending',
                      pickupType: orderData.pickupType,
                      selectedSlot: orderData.selectedSlot,
                      address: orderData.address,
                      paymentStatus: 'Paid',
                      expressDelivery: expressDelivery,
                      expressDeliveryFee: expressDeliveryFee
                    }
                  });
                } else {
                  alert('Failed to place order. Please try again.');
                }
                return;
              }

              // For online payment methods (UPI, Card, Bank Transfer), use Razorpay
              const orderResponse = await fetch(`${API_URL}/api/razorpay/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  amount: finalAmount,
                  currency: 'INR',
                  receipt: `order_${Date.now()}`
                })
              });
              
              const orderResult = await orderResponse.json();
              
              if (!orderResult.success) {
                setIsProcessingPayment(false);
                alert('Failed to create payment order');
                return;
              }
              
              // Prepare payment method data for Razorpay
              const razorpayOptions: any = {
                key: orderResult.keyId,
                amount: orderResult.amount,
                currency: orderResult.currency,
                name: 'Urban Steam',
                description: 'Laundry Service Payment',
                order_id: orderResult.orderId,
                handler: async function (response: any) {
                  try {
                    // Verify payment
                    const verifyResponse = await fetch(`${API_URL}/api/razorpay/verify-payment`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                      })
                    });
                    
                    const verifyResult = await verifyResponse.json();
                    
                    if (verifyResult.success) {
                      // Payment successful, place order
                      const orderPayload = {
                        customerId,
                        items: items || [],
                        totalAmount: amountAfterDiscount,
                        pickupAddress: orderData.address || customerInfo?.address?.[0],
                        pickupSlot: orderData.selectedSlot || 'Next Available',
                        pickupDate: orderData.pickupType === 'now' ? new Date() : new Date(Date.now() + 24 * 60 * 60 * 1000),
                        paymentMethod: paymentMethod,
                        paymentStatus: 'paid',
                        razorpayOrderId: response.razorpay_order_id,
                        razorpayPaymentId: response.razorpay_payment_id,
                        walletUsed: walletUsed,
                        appliedVoucherCode: appliedVoucher?.code || null,
                        specialInstructions: additionalNotes.trim() || null,
                        expressDelivery: expressDelivery,
                        expressDeliveryFee: expressDeliveryFee
                      };
                      
                      const placeOrderResponse = await fetch(`${API_URL}/api/orders`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(orderPayload)
                      });
                      
                      const placeOrderResult = await placeOrderResponse.json();
                      setIsProcessingPayment(false);
                      
                      if (placeOrderResult.success) {
                        // Clear cart items from localStorage
                        localStorage.removeItem('cartItems');
                        
                        navigate("/booking-confirmation", { 
                          state: {
                            orderId: placeOrderResult.data.orderId,
                            items: itemsText,
                            service: 'Steam Iron',
                            total: amountAfterDiscount,
                            originalTotal: totalAmount,
                            discount: discount,
                            walletUsed: walletUsed,
                            appliedVoucher: appliedVoucher,
                            customerInfo: customerInfo,
                            status: 'Pending',
                            pickupType: orderData.pickupType,
                            selectedSlot: orderData.selectedSlot,
                            address: orderData.address,
                            paymentStatus: 'Paid',
                            expressDelivery: expressDelivery,
                            expressDeliveryFee: expressDeliveryFee
                          }
                        });
                      } else {
                        alert('Payment successful but order placement failed. Please contact support.');
                      }
                    } else {
                      setIsProcessingPayment(false);
                      alert('Payment verification failed');
                    }
                  } catch (error) {
                    setIsProcessingPayment(false);
                    console.error('Payment verification error:', error);
                    alert('Payment verification failed');
                  }
                },
                prefill: {
                  name: customerInfo?.name || '',
                  email: customerInfo?.email || '',
                  contact: customerInfo?.mobile || ''
                },
                method: primaryPaymentMethod.type === 'UPI' ? 'upi' : primaryPaymentMethod.type === 'Card' ? 'card' : 'netbanking',
                theme: {
                  color: '#452D9B'
                },
                modal: {
                  ondismiss: function() {
                    setIsProcessingPayment(false);
                  }
                }
              };
              
              // Add payment method specific data
              if (primaryPaymentMethod.type === 'UPI' && primaryPaymentMethod.upiId) {
                razorpayOptions.prefill.vpa = primaryPaymentMethod.upiId;
              }
              
              const razorpay = new window.Razorpay(razorpayOptions);
              razorpay.open();
              
            } catch (error) {
              setIsProcessingPayment(false);
              console.error('Error processing payment:', error);
              alert('Failed to process payment. Please try again.');
            }
          }}
          disabled={isProcessingPayment}
          className="w-full h-12 sm:h-14 rounded-2xl text-sm sm:text-base font-semibold bg-gradient-to-r from-[#452D9B] to-[#07C8D0] hover:from-[#3a2682] hover:to-[#06b3bb] text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessingPayment ? 'Processing...' : 'Continue'}
        </Button>
      </div>

      {/* Payment Warning Modal */}
      {showPaymentWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(to right, #f59e0b, #ef4444)' }}>
                <span className="text-3xl">⚠️</span>
              </div>
              <h2 className="text-xl font-bold mb-3 text-gray-900">Payment Method Required</h2>
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">{paymentWarningMessage}</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowPaymentWarning(false)}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-2"
                  style={{ borderColor: '#452D9B', color: '#452D9B' }}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowPaymentWarning(false);
                    navigate('/profile');
                  }}
                  className="flex-1 h-12 rounded-xl text-white"
                  style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
                >
                  Go to Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Address Warning Modal */}
      {showAddressWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(to right, #f59e0b, #ef4444)' }}>
                <span className="text-3xl">📍</span>
              </div>
              <h2 className="text-xl font-bold mb-3 text-gray-900">Address Required</h2>
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">Please add a delivery address before placing order.</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowAddressWarning(false)}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-2"
                  style={{ borderColor: '#452D9B', color: '#452D9B' }}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowAddressWarning(false);
                    navigate('/add-address');
                  }}
                  className="flex-1 h-12 rounded-xl text-white"
                  style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
                >
                  Add Address
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContinueBooking;
