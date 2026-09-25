import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Phone, Shirt, Clock, Package, Truck, CheckCircle2, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateInvoicePDF } from "@/utils/generateInvoice";
import { API_URL } from '@/config/api';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import Header from "@/components/Header";
import { getExpectedDeliveryText } from "@/utils/expectedDelivery";
import { getOrderBreakdown } from "@/utils/orderBreakdown";

const OrderDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueText, setIssueText] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [partnerPhone, setPartnerPhone] = useState<string | null>(null);
  
  const orderId = location.state?.orderId;
  
  const fetchPartnerPhone = async () => {
    const partnerId = order?.assignedPartner || order?.partnerId;
    
    if (!partnerId) {
      alert('No partner assigned yet');
      return;
    }
    
    try {
      const partnerIdString = typeof partnerId === 'string' ? partnerId : partnerId._id;
      console.log('Partner ID:', partnerIdString);
      console.log('Order data:', order);
      
      // Direct API call to get partner details
      const response = await fetch(`${API_URL}/api/mobile/partners/${partnerIdString}`);
      const data = await response.json();
      console.log('Partner API response:', data);
      
      if (data.success && data.data?.mobile) {
        const phoneNumber = data.data.mobile;
        console.log('Calling partner:', phoneNumber);
        
        // Open phone dialer
        if (Capacitor.isNativePlatform()) {
          window.open(`tel:${phoneNumber}`, '_system');
        } else {
          window.location.href = `tel:${phoneNumber}`;
        }
      } else {
        console.log('No mobile number found');
        alert('Partner contact not available');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to get partner contact');
    }
  };
  
  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
      // Refresh every 5 seconds to get latest updates
      const interval = setInterval(fetchOrderDetails, 5000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [orderId]);
  
  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders`);
      const data = await response.json();
      
      if (data.success) {
        const foundOrder = data.data.find((o: any) => o._id === orderId || o.orderId === orderId);
        console.log('Order data:', foundOrder);
        console.log('reachedLocationAt:', foundOrder?.reachedLocationAt);
        console.log('pickedUpAt:', foundOrder?.pickedUpAt);
        console.log('deliveredToHubAt:', foundOrder?.deliveredToHubAt);
        console.log('hubApprovedAt:', foundOrder?.hubApprovedAt);
        console.log('status:', foundOrder?.status);
        setOrder(foundOrder);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getTimeline = () => {
    if (!order) return [];
    
    const statusMap = {
      'pending': 0,
      'reached_location': 1,
      'picked_up': 2,
      'delivered_to_hub': 3,
      'processing': 3,
      'ironing': 3,
      'process_completed': 4,
      'ready': 4,
      'out_for_delivery': 5,
      'delivered': 6,
      'delivery_failed': 6,
      'suspended': 3
    };
    
    const currentStep = statusMap[order.status] || 0;
    
    const formatDateTime = (date: string) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + 
             ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };
    
    const placedTime = formatDateTime(order.createdAt);
    const reachedLocationTime = order.reachedLocationAt ? formatDateTime(order.reachedLocationAt) : 'Pending';
    const pickedUpTime = order.pickedUpAt ? formatDateTime(order.pickedUpAt) : 'Pending';
    const deliveredToHubTime = order.deliveredToHubAt ? formatDateTime(order.deliveredToHubAt) : 'Pending';
    const processCompletedTime = order.processCompletedAt ? formatDateTime(order.processCompletedAt) : 'Pending';
    
    const finalStepLabel = order.status === 'delivery_failed' && !order.redeliveryScheduled ? 'Undelivered' : order.redeliveryScheduled && order.status === 'delivered' ? 'Redelivered Successfully' : 'Delivered';
    const finalStepTime = order.status === 'delivery_failed' && !order.redeliveryScheduled
      ? (order.deliveryFailedAt ? formatDateTime(order.deliveryFailedAt) : 'Failed')
      : (order.deliveredAt ? formatDateTime(order.deliveredAt) : 'Pending');
    
    return [
      { icon: Clock, label: 'Order Placed', time: placedTime, completed: currentStep >= 0, active: currentStep === 0 },
      { icon: Package, label: 'Reached Location', time: reachedLocationTime, completed: currentStep >= 1, active: currentStep === 1 },
      { icon: Package, label: 'Picked Up', time: pickedUpTime, completed: currentStep >= 2, active: currentStep === 2 },
      { icon: Truck, label: 'Delivered to Hub', time: deliveredToHubTime, completed: currentStep >= 3, active: currentStep === 3 },
      { icon: CheckCircle2, label: 'Process Completed', time: processCompletedTime, completed: currentStep >= 4, active: currentStep === 4 },
      { icon: Truck, label: order.redeliveryScheduled ? 'Out for Redelivery' : 'Out for Delivery', time: order.redeliveryScheduled && order.outForRedeliveryAt ? formatDateTime(order.outForRedeliveryAt) : order.outForDeliveryAt ? formatDateTime(order.outForDeliveryAt) : 'Pending', completed: currentStep >= 5, active: currentStep === 5 },
      { icon: order.status === 'delivery_failed' && !order.redeliveryScheduled ? X : CheckCircle2, label: finalStepLabel, time: finalStepTime, completed: currentStep >= 6, active: currentStep === 6, failed: order.status === 'delivery_failed' && !order.redeliveryScheduled },
    ];
  };
  
  const timeline = getTimeline();

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Track Order" 
        variant="gradient"
        onBack={() => navigate(-1)}
      />

      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 page-bottom-content">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Loading order details...
          </div>
        ) : !order ? (
          <div className="text-center py-8 text-gray-500">
            Order not found
          </div>
        ) : (
          <>
        <Card className="p-3 sm:p-4 rounded-2xl border-2 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
                <Shirt className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm sm:text-base">Order #{order?.orderId || 'N/A'}</p>
                  {order?.expressDelivery && (
                    <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
                      Express Delivery
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {order?.items?.map((item: any) => `${item.quantity} ${item.name}`).join(', ') || 'No items'}
                </p>
                <p className="text-base sm:text-lg font-bold" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>₹{order?.totalAmount || 0}</p>
              </div>
            </div>
            <span className="px-2 sm:px-4 py-1 sm:py-1.5 text-white text-xs sm:text-sm font-semibold rounded-full flex-shrink-0 shadow-md" style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}>
              {['processing', 'ironing'].includes(order?.status) ? 'At hub' : order?.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ') : 'Unknown'}
            </span>
          </div>
          {order && !['delivered', 'cancelled'].includes(order.status) && (
            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <span className="text-xs sm:text-sm text-muted-foreground">Expected Delivery</span>
              <span className="text-xs sm:text-sm font-semibold">
                {getExpectedDeliveryText({ expectedDeliveryAt: order.expectedDeliveryAt, slotDate: order.pickupSlot?.date, slotText: order.pickupSlot?.timeSlot, express: order.expressDelivery })}
              </span>
            </div>
          )}
        </Card>

        <div className="space-y-3 sm:space-y-4">
          {timeline.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center gap-3 sm:gap-4">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                    item.completed ? "" : "bg-muted"
                  }`}
                  style={item.completed ? (item.failed ? { background: 'linear-gradient(to right, #ef4444, #dc2626)' } : { background: 'linear-gradient(to right, #452D9B, #07C8D0)' }) : {}}
                >
                  <Icon
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      item.completed ? "text-white" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-semibold text-sm sm:text-base ${
                      item.completed ? "text-foreground" : "text-muted-foreground"
                    }`}
                    style={item.active ? { background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } : {}}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {item.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {order?.previousDuePaid > 0 && (
          <Card className="p-3 sm:p-4 rounded-2xl border-2 shadow-lg" style={{ background: 'linear-gradient(to bottom right, #dbeafe, #bfdbfe)', borderColor: '#3b82f6' }}>
            <div className="flex items-start gap-2">
              <span className="text-2xl">💰</span>
              <div className="flex-1">
                <p className="text-sm sm:text-base font-bold text-blue-800 mb-1">Previous Due Paid</p>
                <p className="text-xs sm:text-sm text-blue-700 font-semibold mb-1">
                  ₹{order.previousDuePaid} included in total
                </p>
                <p className="text-xs sm:text-sm text-blue-600">
                  Cleared from previous pending amount
                </p>
              </div>
            </div>
          </Card>
        )}

        {order?.deliveryFailureFee > 0 && (
          <Card className="p-3 sm:p-4 rounded-2xl border-2 shadow-lg" style={{ background: 'linear-gradient(to bottom right, #fef3c7, #fde68a)', borderColor: '#f59e0b' }}>
            <div className="flex items-start gap-2">
              <span className="text-2xl">💳</span>
              <div className="flex-1">
                <p className="text-sm sm:text-base font-bold text-amber-800 mb-1">Charges Applied</p>
                <p className="text-xs sm:text-sm text-amber-700 font-semibold mb-1">
                  ₹{order.deliveryFailureFee} deducted from your wallet balance
                </p>
                <p className="text-xs sm:text-sm text-amber-600">
                  <strong>Reason:</strong> {order.deliveryFailureReason || 'Delivery failure charge'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {order?.status === 'delivery_failed' && (
          <Card className="p-3 sm:p-4 rounded-2xl border-2 shadow-lg" style={{ background: 'linear-gradient(to bottom right, #fee2e2, #fecaca)', borderColor: '#ef4444' }}>
            <div className="flex items-start gap-2">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm sm:text-base font-bold text-red-700 mb-1">{order.redeliveryScheduled ? 'Redelivery Failed' : 'Delivery Failed'}</p>
                <p className="text-xs sm:text-sm text-red-600 font-medium">
                  <strong>Reason:</strong> {order.deliveryFailureReason || 'Not specified'}
                </p>
                {order.redeliveryScheduled && (
                  <p className="text-xs sm:text-sm text-red-600 font-medium mt-1">
                    This order failed delivery multiple times.
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {order?.cancellationFee > 0 && (
          <Card className="p-3 sm:p-4 rounded-2xl border-2 shadow-lg" style={{ background: 'linear-gradient(to bottom right, #fef3c7, #fde68a)', borderColor: '#f59e0b' }}>
            <div className="flex items-start gap-2">
              <span className="text-2xl">💳</span>
              <div className="flex-1">
                <p className="text-sm sm:text-base font-bold text-amber-800 mb-1">Charges Applied</p>
                <p className="text-xs sm:text-sm text-amber-700 font-semibold mb-1">
                  ₹{order.cancellationFee} deducted from your wallet balance
                </p>
                <p className="text-xs sm:text-sm text-amber-600">
                  <strong>Reason:</strong> {order.cancellationReason || 'Order cancellation charge'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {order?.status === 'cancelled' && (
          <Card className="p-3 sm:p-4 rounded-2xl border-2 shadow-lg" style={{ background: 'linear-gradient(to bottom right, #fee2e2, #fecaca)', borderColor: '#ef4444' }}>
            <div className="flex items-start gap-2">
              <span className="text-2xl">❌</span>
              <div className="flex-1">
                <p className="text-sm sm:text-base font-bold text-red-700 mb-1">Order Cancelled</p>
                {order.cancellationReason && (
                  <p className="text-xs sm:text-sm text-red-600 font-medium">
                    <strong>Reason:</strong> {order.cancellationReason}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {order?.status === 'suspended' && (
          <Card className="p-3 sm:p-4 rounded-2xl border-2 shadow-lg" style={{ background: 'linear-gradient(to bottom right, #fef3c7, #fde68a)', borderColor: '#f59e0b' }}>
            <div className="flex items-start gap-2">
              <span className="text-2xl">🚫</span>
              <div className="flex-1">
                <p className="text-sm sm:text-base font-bold text-amber-700 mb-1">Order Suspended</p>
                <p className="text-xs sm:text-sm text-amber-600 font-medium">
                  <strong>Reason:</strong> {order.suspensionReason || 'Multiple delivery failures'}
                </p>
                <p className="text-xs sm:text-sm text-amber-600 font-medium mt-2">
                  Please contact admin for further assistance.
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-3 sm:p-4 rounded-2xl border-2 shadow-md" style={{ background: 'linear-gradient(to bottom right, #f0ebf8, #e0f7fa)' }}>
          <p className="text-xs sm:text-sm text-gray-700 font-medium">
            Pickup Address: {order?.pickupAddress ? `${order.pickupAddress.street}, ${order.pickupAddress.city}` : 'Not specified'}
          </p>
          <p className="text-xs sm:text-sm text-gray-700 font-medium mt-1">
            Pickup Slot: {order?.pickupSlot?.timeSlot || 'Not scheduled'}
          </p>
        </Card>

        {(() => {
          const bd = getOrderBreakdown(order);
          return (
            <Card className="p-3 sm:p-4 rounded-2xl border-2 shadow-md">
              <p className="text-sm sm:text-base font-bold mb-2">Payment Summary</p>
              <div className="space-y-1 text-xs sm:text-sm text-gray-700">
                <div className="flex justify-between"><span>Items Subtotal</span><span>₹{Math.round(bd.subtotal)}</span></div>
                {bd.express > 0 && <div className="flex justify-between"><span>Express Delivery Fee</span><span>+₹{Math.round(bd.express)}</span></div>}
                {bd.due > 0 && <div className="flex justify-between"><span>Previous Due</span><span>+₹{Math.round(bd.due)}</span></div>}
                {bd.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{Math.round(bd.discount)}</span></div>}
                <div className="flex justify-between font-bold text-black text-sm sm:text-base pt-1 border-t border-gray-200"><span>Order Total</span><span>₹{Math.round(bd.total)}</span></div>
                {bd.wallet > 0 && <div className="flex justify-between"><span>Paid from Wallet</span><span>₹{Math.round(bd.wallet)}</span></div>}
                {bd.paidOnline !== null && bd.paidOnline > 0 && <div className="flex justify-between"><span>Paid Online</span><span>₹{Math.round(bd.paidOnline)}</span></div>}
              </div>
            </Card>
          );
        })()}

        <div className="flex gap-2 sm:gap-3">
          <Button 
            variant="outline" 
            className="flex-1 h-10 sm:h-12 rounded-2xl font-semibold text-xs sm:text-sm border-2 shadow-md" 
            style={{ borderColor: '#452D9B', color: '#452D9B' }}
            disabled={!order?.assignedPartner && !order?.partnerId}
            onClick={fetchPartnerPhone}
          >
            <Phone className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
            Contact Partner
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1 h-10 sm:h-12 rounded-2xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 shadow-lg"
            onClick={() => setShowIssueForm(true)}
          >
            ⚠ Report Issue
          </Button>
        </div>

        {showIssueForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold mb-4">Report Issue</h2>
              <textarea
                value={issueText}
                onChange={(e) => setIssueText(e.target.value)}
                placeholder="Describe the issue..."
                className="w-full border rounded-lg p-3 min-h-32 mb-4 outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-2"
                  onClick={() => {
                    setShowIssueForm(false);
                    setIssueText('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 shadow-lg text-white"
                  style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
                  onClick={async () => {
                    if (!issueText.trim()) {
                      alert('Please describe the issue');
                      return;
                    }
                    console.log('Reporting issue for order:', order._id);
                    console.log('Issue text:', issueText);
                    const response = await fetch(`${API_URL}/api/orders/${order._id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        issue: issueText,
                        issueReportedAt: new Date().toISOString()
                      })
                    });
                    const result = await response.json();
                    console.log('Response:', result);
                    if (response.ok) {
                      setShowIssueForm(false);
                      setIssueText('');
                      setShowSuccessToast(true);
                      setTimeout(() => setShowSuccessToast(false), 3000);
                      fetchOrderDetails();
                    } else {
                      alert('Failed to report issue: ' + (result.message || 'Unknown error'));
                    }
                  }}
                >
                  Submit
                </Button>
              </div>
            </div>
          </div>
        )}

        <Button 
          onClick={() => generateInvoicePDF(order)}
          className="w-full h-10 sm:h-12 rounded-2xl font-semibold text-sm sm:text-base text-white shadow-lg"
          style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)' }}
        >
          <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Download Invoice
        </Button>
          </>
        )}
      </div>

      {showSuccessToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px]">
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
            <span className="font-semibold flex-1">Issue reported successfully!</span>
            <button onClick={() => setShowSuccessToast(false)} className="flex-shrink-0 hover:bg-white/20 rounded-full p-1 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;
