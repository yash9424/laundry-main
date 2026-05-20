'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import ResponsiveLayout from '../../../components/ResponsiveLayout'

export default function OrderDetails() {
  const params = useParams()
  const orderId = params.id
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [refundCalculation, setRefundCalculation] = useState<any>(null)
  const [calculatingRefund, setCalculatingRefund] = useState(false)
  const [processingRefund, setProcessingRefund] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editNoteText, setEditNoteText] = useState('')

  useEffect(() => {
    fetchOrderDetails()
  }, [orderId])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${orderId}`)
      const data = await response.json()
      
      if (data.success) {
        setOrder(data.data)
      } else {
        console.error('Failed to fetch order:', data.error)
      }
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    
    try {
      const response = await fetch(`/api/orders/${order._id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote.trim() })
      })
      
      if (response.ok) {
        setNewNote('')
        fetchOrderDetails()
      }
    } catch (error) {
      console.error('Failed to add note:', error)
    }
  }
  
  const editNote = async (noteId: string) => {
    if (!editNoteText.trim()) return
    
    try {
      const response = await fetch(`/api/orders/${order._id}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: editNoteText.trim() })
      })
      
      if (response.ok) {
        setEditingNote(null)
        setEditNoteText('')
        fetchOrderDetails()
      }
    } catch (error) {
      console.error('Failed to edit note:', error)
    }
  }
  
  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return
    
    try {
      const response = await fetch(`/api/orders/${order._id}/notes/${noteId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchOrderDetails()
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  return (
    <ResponsiveLayout activePage="Orders" title={`Order #${orderId}`} searchPlaceholder="Search...">

        <div style={{ padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              Loading order details...
            </div>
          ) : !order ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              Order not found
            </div>
          ) : (
          <div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          
          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {(order?.status === 'cancelled' || order?.status === 'delivery_failed') && !order?.refunded && (
              <button 
                onClick={async () => {
                  try {
                    setCalculatingRefund(true);
                    const customerRes = await fetch(`/api/customers/${order.customerId._id}`);
                    const customerData = await customerRes.json();
                    
                    if (customerData.success) {
                      const customer = customerData.data;
                      const orderAmount = order.totalAmount || 0;
                      const totalCharges = (order.cancellationFee || 0) + (order.deliveryFailureFee || 0);
                      const currentDue = customer.dueAmount || 0;
                      const currentWallet = customer.walletBalance || 0;
                      
                      let refundAmount = orderAmount;
                      let newDue = currentDue;
                      let dueCleared = 0;
                      
                      if (totalCharges > 0) {
                        if (currentDue > 0) {
                          dueCleared = Math.min(currentDue, totalCharges);
                          newDue = currentDue - dueCleared;
                          refundAmount = orderAmount - (totalCharges - dueCleared);
                        } else {
                          refundAmount = orderAmount - totalCharges;
                        }
                      }
                      
                      const newWallet = currentWallet + refundAmount;
                      
                      setRefundCalculation({
                        customer,
                        orderAmount,
                        chargeAmount: totalCharges,
                        currentDue,
                        currentWallet,
                        dueCleared,
                        newDue,
                        refundAmount,
                        newWallet
                      });
                      setShowRefundModal(true);
                    }
                  } catch (error) {
                    alert('Failed to calculate refund. Please try again.');
                  } finally {
                    setCalculatingRefund(false);
                  }
                }}
                style={{
                  backgroundColor: calculatingRefund ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: calculatingRefund ? 'not-allowed' : 'pointer',
                  opacity: calculatingRefund ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                disabled={calculatingRefund}
              >
                {calculatingRefund ? (
                  <>
                    <span style={{ 
                      display: 'inline-block', 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid white', 
                      borderTopColor: 'transparent', 
                      borderRadius: '50%', 
                      animation: 'spin 0.6s linear infinite' 
                    }} />
                    Calculating...
                  </>
                ) : (
                  '💰 Confirm Refund'
                )}
              </button>
            )}
            {order?.refunded && (
              <div style={{
                backgroundColor: '#dcfce7',
                color: '#166534',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                ✓ Refunded ₹{order.refundAmount || order.totalAmount}
              </div>
            )}
            <button 
              onClick={async () => {
                if (confirm('Are you sure you want to cancel this order?')) {
                  const response = await fetch(`/api/orders/${order._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'cancelled' })
                  });
                  if (response.ok) window.location.reload();
                }
              }}
              style={{
                backgroundColor: 'white',
                color: '#2563eb',
                border: '2px solid #2563eb',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Cancel Order
            </button>
            <button 
              onClick={async () => {
                if (confirm('Are you sure you want to DELETE this order? This action cannot be undone.')) {
                  const response = await fetch(`/api/orders/${order._id}`, {
                    method: 'DELETE'
                  });
                  if (response.ok) {
                    alert('Order deleted successfully');
                    window.location.href = '/admin/orders';
                  }
                }
              }}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Delete Order
            </button>
            <button 
              onClick={() => window.location.href = `tel:${order?.customerId?.mobile}`}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              📞 Call Customer
            </button>
            <button 
              onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${order?.customerId?.email}`, '_blank')}
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              ✉️ Email Customer
            </button>
            <button 
              onClick={() => window.open(`https://wa.me/${order?.customerId?.mobile?.replace(/[^0-9]/g, '')}`, '_blank')}
              style={{
                backgroundColor: '#25D366',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              💬 WhatsApp Customer
            </button>
          </div>

          {/* Customer Info */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1rem 0' }}>Customer Info</h3>
                <div style={{ color: '#374151', lineHeight: '1.6' }}>
                  <div><strong>Name:</strong> {order?.customerId?.name || 'N/A'}</div>
                  <div><strong>Mobile:</strong> {order?.customerId?.mobile || 'N/A'}</div>
                  <div><strong>Address:</strong> {order?.pickupAddress ? `${order.pickupAddress.street || ''}, ${order.pickupAddress.city || ''}, ${order.pickupAddress.state || ''} - ${order.pickupAddress.pincode || ''}` : 'N/A'}</div>
                  {order?.specialInstructions && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #f59e0b' }}>
                      <strong style={{ color: '#92400e' }}>Customer Notes:</strong>
                      <div style={{ color: '#92400e', marginTop: '0.25rem', fontSize: '0.9rem' }}>{order.specialInstructions}</div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: '#2563eb', cursor: 'pointer', fontSize: '0.9rem' }}>View Customer Profile</span>
                <span style={{ color: '#2563eb', fontSize: '1.2rem', cursor: 'pointer' }}>📞</span>
              </div>
            </div>
          </div>

          {/* Pickup Slot */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            border: '2px solid #e0e7ff'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1rem 0' }}>🕐 Pickup Slot</h3>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ backgroundColor: '#eff6ff', borderRadius: '10px', padding: '0.75rem 1.25rem', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: '500' }}>DATE</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1e40af' }}>
                  {order?.pickupSlot?.date
                    ? (() => {
                        const slotDate = new Date(order.pickupSlot.date);
                        const today = new Date();
                        const tomorrow = new Date();
                        tomorrow.setDate(today.getDate() + 1);
                        const isSameDay = (a: Date, b: Date) =>
                          a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
                        if (isSameDay(slotDate, today)) return 'Today — ' + slotDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        if (isSameDay(slotDate, tomorrow)) return 'Tomorrow — ' + slotDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        return slotDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                      })()
                    : 'Not selected'}
                </div>
              </div>
              <div style={{ backgroundColor: '#f0fdf4', borderRadius: '10px', padding: '0.75rem 1.25rem', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: '500' }}>TIME SLOT</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#166534' }}>
                  {order?.pickupSlot?.timeSlot || 'Not selected'}
                </div>
              </div>
            </div>
          </div>

          {/* Items in Order */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1rem 0' }}>Items in Order</h3>
            {order?.items?.map((item: any, index: number) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>{item.quantity} {item.name}</span>
                <span>₹{item.price * item.quantity}</span>
              </div>
            )) || <div>No items found</div>}
            {order?.deliveryFailureFee && order.deliveryFailureFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: '#dc2626', fontWeight: '500' }}>
                <span>Delivery Failure Fee</span>
                <span>₹{order.deliveryFailureFee}</span>
              </div>
            )}
            {order?.cancellationFee && order.cancellationFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: '#dc2626', fontWeight: '500' }}>
                <span>Cancellation Fee</span>
                <span>₹{order.cancellationFee}</span>
              </div>
            )}
            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1rem 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: '#2563eb' }}>
              <span>Total: ₹{order?.totalAmount || 0}</span>
            </div>
          </div>

          {/* Charges & Refund Summary */}
          {((order?.deliveryFailureFee && order.deliveryFailureFee > 0) || (order?.cancellationFee && order.cancellationFee > 0) || order?.refunded) && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              border: '2px solid ' + (order?.refunded ? '#10b981' : '#dc2626')
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1rem 0', color: order?.refunded ? '#10b981' : '#dc2626' }}>
                {order?.refunded ? '✓ Charges & Refund Summary' : '⚠️ Charges Applied'}
              </h3>
              
              {/* Charges Details */}
              {(order?.deliveryFailureFee > 0 || order?.cancellationFee > 0) && (
                <div style={{ backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#dc2626' }}>Charges Breakdown:</p>
                  {order?.deliveryFailureFee > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span>Delivery Failure Fee:</span>
                        <strong style={{ color: '#dc2626' }}>₹{order.deliveryFailureFee}</strong>
                      </div>
                      {order?.deliveryFailureReason && (
                        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          Reason: {order.deliveryFailureReason}
                        </div>
                      )}
                    </div>
                  )}
                  {order?.cancellationFee > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span>Cancellation Fee:</span>
                        <strong style={{ color: '#dc2626' }}>₹{order.cancellationFee}</strong>
                      </div>
                      {order?.cancellationReason && (
                        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          Reason: {order.cancellationReason}
                        </div>
                      )}
                    </div>
                  )}
                  <hr style={{ border: 'none', borderTop: '1px solid #fecaca', margin: '0.75rem 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '1rem', color: '#dc2626' }}>
                    <span>Total Charges:</span>
                    <span>₹{(order?.deliveryFailureFee || 0) + (order?.cancellationFee || 0)}</span>
                  </div>
                </div>
              )}
              
              {/* Refund Status */}
              {order?.refunded ? (
                <div style={{ backgroundColor: '#dcfce7', padding: '1rem', borderRadius: '8px', border: '1px solid #10b981' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>✓</span>
                    <p style={{ fontWeight: '700', color: '#166534', fontSize: '1rem', margin: 0 }}>Refund Processed</p>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#166534', lineHeight: '1.6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                      <span>Refund Amount:</span>
                      <strong>₹{order.refundAmount || order.totalAmount}</strong>
                    </div>
                    {order?.refundedAt && (
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>
                        Refunded on: {new Date(order.refundedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(order.refundedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: '#fef3c7', padding: '1rem', borderRadius: '8px', border: '1px solid #f59e0b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>⏳</span>
                    <p style={{ fontWeight: '600', color: '#92400e', fontSize: '0.9rem', margin: 0 }}>Refund Pending</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Information */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1rem 0' }}>Payment Information</h3>
            <div style={{ color: '#374151', lineHeight: '1.8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>Payment Method:</strong>
                <span>{order?.paymentMethod || 'Cash on Delivery'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>Payment Status:</strong>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  backgroundColor: order?.paymentStatus === 'paid' ? '#dcfce7' : '#fef3c7',
                  color: order?.paymentStatus === 'paid' ? '#166534' : '#92400e'
                }}>
                  {order?.paymentStatus ? order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1) : 'Pending'}
                </span>
              </div>
              {order?.razorpayPaymentId && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>Payment ID:</strong>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{order.razorpayPaymentId}</span>
                </div>
              )}
              {order?.razorpayOrderId && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Order ID:</strong>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{order.razorpayOrderId}</span>
                </div>
              )}
            </div>
            
            {/* Customer Payment Methods */}
            {order?.customerId?.paymentMethods && order.customerId.paymentMethods.length > 0 && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', color: '#6b7280' }}>Customer's Saved Payment Methods</h4>
                {order.customerId.paymentMethods.map((pm: any, index: number) => (
                  <div key={index} style={{ 
                    padding: '0.75rem', 
                    backgroundColor: pm.isPrimary ? '#eff6ff' : '#f9fafb', 
                    borderRadius: '8px', 
                    marginBottom: '0.5rem',
                    border: pm.isPrimary ? '1px solid #2563eb' : '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                          {pm.type} {pm.isPrimary && <span style={{ color: '#2563eb', fontSize: '0.8rem' }}>(Primary)</span>}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          {pm.type === 'UPI' && pm.upiId && `UPI: ${pm.upiId}`}
                          {pm.type === 'Card' && pm.cardNumber && `Card: ****${String(pm.cardNumber).slice(-4)} | ${pm.cardHolder || ''}`}
                          {pm.type === 'Bank Transfer' && pm.accountNumber && `${pm.bankName || ''} - ****${String(pm.accountNumber).slice(-4)}`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hub Information */}
          {order?.hub && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              border: '2px solid #3b82f6'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1rem 0', color: '#2563eb' }}>🏢 Processing Hub</h3>
              <div style={{ color: '#374151', lineHeight: '1.8' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Hub Name:</strong> {order.hub.name || 'N/A'}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Address:</strong> {order.hub.address ? (typeof order.hub.address === 'string' ? order.hub.address : `${order.hub.address.street || ''}, ${order.hub.address.city || ''}, ${order.hub.address.state || ''}`) : 'N/A'}{order.hub.address2 ? `, ${order.hub.address2}` : ''}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>City:</strong> {order.hub.city || 'N/A'} - {order.hub.pincode || 'N/A'}
                </div>
                {order.hub.phone && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Phone:</strong> {order.hub.phone}
                  </div>
                )}
                {order.hub.email && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Email:</strong> {order.hub.email}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assigned Partner */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1rem 0' }}>Assigned Partner</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Partner Name:</strong> {order?.partnerId?.name || 'Not Assigned'} {order?.partnerId?._id ? `(#${order.partnerId._id.slice(-4)})` : ''}
                </div>
                {order?.partnerId?.mobile && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Mobile:</strong> {order.partnerId.mobile}
                  </div>
                )}
              </div>
              <span style={{ color: order?.partnerId ? '#10b981' : '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                {order?.partnerId ? 'Assigned' : 'Not Assigned'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              {order?.partnerId && (
                <button 
                  onClick={() => window.location.href = `/admin/delivery-partners/${order.partnerId._id}`}
                  style={{
                    backgroundColor: 'white',
                    color: '#2563eb',
                    border: '2px solid #2563eb',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  View Partner Profile
                </button>
              )}
            </div>
          </div>

          {/* Hub Delivery Approval - HIDDEN */}
          {/* {order?.status === 'delivered_to_hub' && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1rem 0' }}>Hub Delivery Approval</h3>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Order has been delivered to hub. Please approve or cancel.</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={async () => {
                    const response = await fetch(`/api/orders/${order._id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        status: 'ready',
                        hubApprovedAt: new Date().toISOString()
                      })
                    });
                    if (response.ok) window.location.reload();
                  }}
                  style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to cancel this order?')) {
                      const response = await fetch(`/api/orders/${order._id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'cancelled' })
                      });
                      if (response.ok) window.location.reload();
                    }
                  }}
                  style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  ✗ Cancel Order
                </button>
              </div>
            </div>
          )} */}

          {/* Ready to Process - HIDDEN */}
          {/* {order?.status === 'ready' && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1rem 0' }}>Ready to Process</h3>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Order is ready. Click below to start processing.</p>
              <button
                onClick={async () => {
                  const response = await fetch(`/api/orders/${order._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'processing' })
                  });
                  if (response.ok) window.location.reload();
                }}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Start Processing
              </button>
            </div>
          )} */}

          {/* Delivery Failure */}
          {order?.status === 'delivery_failed' && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              border: '2px solid #ef4444'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1rem 0', color: '#ef4444' }}>⚠ Delivery Failed</h3>
              <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '0.5rem' }}>
                <p style={{ color: '#374151' }}><strong>Reason:</strong> {order.deliveryFailureReason || 'Not specified'}</p>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                Failed on: {order.deliveryFailedAt ? new Date(order.deliveryFailedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + new Date(order.deliveryFailedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
              </p>
            </div>
          )}

          {/* Reported Issue */}
          {order?.issue && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              border: '2px solid #ef4444'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1rem 0', color: '#ef4444' }}>⚠ Reported Issue</h3>
              <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '0.5rem' }}>
                <p style={{ color: '#374151' }}>{order.issue}</p>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                Reported on: {order.issueReportedAt ? new Date(order.issueReportedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + new Date(order.issueReportedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
              </p>
            </div>
          )}

          {/* Pickup Photos */}
          {order?.pickupPhotos && order.pickupPhotos.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1rem 0' }}>Pickup Photos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {order.pickupPhotos.map((photo: string, index: number) => (
                  <img 
                    key={index} 
                    src={photo} 
                    alt={`Pickup ${index + 1}`} 
                    style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
                    onClick={() => window.open(photo, '_blank')}
                  />
                ))}
              </div>
              {order?.pickupNotes && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                  <strong>Partner Notes:</strong> {order.pickupNotes}
                </div>
              )}
            </div>
          )}

          {/* Order Status Timeline */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1rem 0' }}>Order Status Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div>
                <div style={{ fontWeight: '600' }}>Order Placed</div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                  {order?.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '600' }}>Reached Location</div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                  {order?.reachedLocationAt ? new Date(order.reachedLocationAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + new Date(order.reachedLocationAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Pending'}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '600' }}>Picked Up</div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                  {order?.pickedUpAt ? new Date(order.pickedUpAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + new Date(order.pickedUpAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Pending'}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '600' }}>Delivered to Hub</div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                  {order?.deliveredToHubAt ? new Date(order.deliveredToHubAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + new Date(order.deliveredToHubAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Pending'}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '600' }}>Processing</div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                  {order?.hubApprovedAt ? new Date(order.hubApprovedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + new Date(order.hubApprovedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Pending'}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '600' }}>Ironing</div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                  {order?.ironingAt ? new Date(order.ironingAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + new Date(order.ironingAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Pending'}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '600' }}>Process Completed</div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                  {order?.processCompletedAt ? new Date(order.processCompletedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + new Date(order.processCompletedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Pending'}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '600' }}>{order?.redeliveryScheduled ? 'Out for Redelivery' : 'Out for Delivery'}</div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                  {order?.redeliveryScheduled && order?.outForRedeliveryAt ? new Date(order.outForRedeliveryAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + new Date(order.outForRedeliveryAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : order?.outForDeliveryAt ? new Date(order.outForDeliveryAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + new Date(order.outForDeliveryAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Pending'}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '600' }}>{order?.redeliveryScheduled && order?.status === 'delivered' ? 'Redelivered Successfully' : 'Delivered'}</div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                  {order?.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + new Date(order.deliveredAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Pending'}
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Issues */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1rem 0' }}>Notes & Issues</h3>
            
            {/* Existing Notes */}
            {order?.adminNotes && order.adminNotes.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem', color: '#6b7280' }}>Previous Notes:</h4>
                {order.adminNotes.map((note: any, index: number) => (
                  <div key={note._id || index} style={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    marginBottom: '0.5rem'
                  }}>
                    {editingNote === note._id ? (
                      <div>
                        <textarea
                          value={editNoteText}
                          onChange={(e) => setEditNoteText(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            outline: 'none',
                            resize: 'vertical',
                            minHeight: '60px',
                            fontFamily: 'inherit',
                            marginBottom: '0.5rem'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => editNote(note._id)}
                            style={{
                              backgroundColor: '#10b981',
                              color: 'white',
                              border: 'none',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingNote(null)
                              setEditNoteText('')
                            }}
                            style={{
                              backgroundColor: '#6b7280',
                              color: 'white',
                              border: 'none',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '0.5rem' }}>
                          {note.note || note.text}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' at ' + new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Unknown date'}
                            {note.addedBy && ` • by ${note.addedBy}`}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => {
                                setEditingNote(note._id)
                                setEditNoteText(note.note || note.text)
                              }}
                              style={{
                                backgroundColor: 'transparent',
                                color: '#2563eb',
                                border: 'none',
                                padding: '0.25rem',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => deleteNote(note._id)}
                              style={{
                                backgroundColor: 'transparent',
                                color: '#dc2626',
                                border: 'none',
                                padding: '0.25rem',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Add New Note */}
            <div style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>Add a new note:</div>
            <textarea
              placeholder="Add a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                outline: 'none',
                resize: 'vertical',
                minHeight: '80px',
                marginBottom: '1rem',
                fontFamily: 'inherit'
              }}
            />
            <button 
              onClick={addNote}
              disabled={!newNote.trim()}
              style={{
                backgroundColor: newNote.trim() ? '#2563eb' : '#9ca3af',
                color: 'white',
                border: 'none',
                padding: '0.75rem 2rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: newNote.trim() ? 'pointer' : 'not-allowed',
                width: '100%'
              }}
            >
              Add Note
            </button>
          </div>

          {/* Bottom Actions */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={async () => {
                const jsPDF = (await import('jspdf')).default;
                
                // Brand typography system
                const setBrandFont = (doc: any, type: 'primary' | 'secondary', weight: 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black' = 'regular') => {
                  try {
                    const fontMap = { primary: 'helvetica', secondary: 'helvetica' };
                    const weightMap = { light: 'normal', regular: 'normal', medium: 'normal', semibold: 'bold', bold: 'bold', extrabold: 'bold', black: 'bold' };
                    doc.setFont(fontMap[type], weightMap[weight]);
                  } catch (e) {
                    doc.setFont('helvetica', 'normal');
                  }
                };
                
                const setTypography = (doc: any, style: 'h1' | 'h2' | 'h3' | 'h4' | 'subtitle' | 'button' | 'body') => {
                  switch (style) {
                    case 'h1': setBrandFont(doc, 'primary', 'bold'); doc.setFontSize(16); break;
                    case 'h2': setBrandFont(doc, 'primary', 'semibold'); doc.setFontSize(14); break;
                    case 'h3': setBrandFont(doc, 'primary', 'medium'); doc.setFontSize(14); break;
                    case 'h4': setBrandFont(doc, 'primary', 'regular'); doc.setFontSize(13); break;
                    case 'subtitle': setBrandFont(doc, 'secondary', 'bold'); doc.setFontSize(14); break;
                    case 'button': setBrandFont(doc, 'primary', 'medium'); doc.setFontSize(12); break;
                    case 'body': setBrandFont(doc, 'secondary', 'regular'); doc.setFontSize(12); break;
                  }
                };
                
                const doc = new jsPDF('p', 'mm', 'a4');
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                
                let customerName = order.customerId?.name || order.customer?.name || 'Customer';
                let customerMobile = order.customerId?.mobile || order.customer?.mobile || '';
                
                doc.setFillColor(255, 255, 255);
                doc.rect(0, 0, pageWidth, pageHeight, 'F');
                
                // Header logos
                try {
                  doc.addImage('/assets/ACS LOGO.png', 'PNG', 15, 15, 30, 20);
                  doc.addImage('/assets/LOGO MARK GRADIENT.png', 'PNG', pageWidth - 45, 15, 30, 20);
                } catch (imgError) {
                  setTypography(doc, 'h1');
                  doc.setFontSize(12);
                  doc.text('ACS Group', 15, 20);
                  doc.text('Urban Steam', pageWidth - 45, 20);
                }
                
                // Invoice header
                setTypography(doc, 'body');
                doc.setFontSize(8);
                doc.text('ORIGINAL FOR RECIPIENT', 17, 45);
                
                setTypography(doc, 'h1');
                doc.setFontSize(18);
                doc.text('TAX INVOICE', 17, 55);
                
                setTypography(doc, 'body');
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text(`#${order.orderId || 'N/A'}`, 17, 61);
                doc.setTextColor(0, 0, 0);
                
                let yStart = 75;
                const address = order.pickupAddress?.street || 'Customer address';
                const cityState = `${order.pickupAddress?.city || 'City'}, ${order.pickupAddress?.state || 'State'} - ${order.pickupAddress?.pincode || '000000'}`;
                
                // Calculate section height based on address length
                const addressLines = doc.splitTextToSize(address, 60);
                const cityStateLines = doc.splitTextToSize(cityState, 60);
                const totalAddressLines = addressLines.length + cityStateLines.length;
                let sectionHeight = Math.max(50, 35 + (totalAddressLines * 5));
                
                doc.setDrawColor(220, 220, 220);
                doc.setLineWidth(0.2);
                doc.rect(15, yStart, pageWidth - 30, sectionHeight);
                
                doc.line(75, yStart, 75, yStart + sectionHeight);
                doc.line(145, yStart, 145, yStart + sectionHeight);
                
                // Issued section
                setTypography(doc, 'subtitle');
                doc.setFontSize(10);
                doc.text('Issued', 17, yStart + 8);
                
                setTypography(doc, 'body');
                doc.setFontSize(9);
                doc.text(new Date(order.createdAt).toLocaleDateString('en-GB'), 17, yStart + 14);
                
                setTypography(doc, 'subtitle');
                doc.setFontSize(10);
                doc.text('Due', 17, yStart + 22);
                
                setTypography(doc, 'body');
                doc.setFontSize(9);
                doc.text(new Date(order.createdAt).toLocaleDateString('en-GB'), 17, yStart + 28);
                
                // Billed to section
                setTypography(doc, 'subtitle');
                doc.setFontSize(10);
                doc.text('Billed to', 77, yStart + 8);
                
                setTypography(doc, 'body');
                doc.setFontSize(9);
                doc.text(customerName, 77, yStart + 14);
                
                // Handle multi-line address
                let addressY = yStart + 19;
                addressLines.forEach((line: string, index: number) => {
                  doc.text(line, 77, addressY + (index * 4));
                });
                addressY += addressLines.length * 4;
                
                cityStateLines.forEach((line: string, index: number) => {
                  doc.text(line, 77, addressY + (index * 4));
                });
                
                setTypography(doc, 'body');
                doc.setFontSize(8);
                doc.text(`Contact Number: ${customerMobile || 'N/A'}`, 77, yStart + sectionHeight - 15);
                doc.text(`Order Id: ${order.orderId || 'N/A'}`, 77, yStart + sectionHeight - 8);
                
                // From section
                setTypography(doc, 'subtitle');
                doc.setFontSize(10);
                doc.text('From', 147, yStart + 8);
                
                setTypography(doc, 'body');
                doc.setFontSize(9);
                doc.text('Email: support@urbansteam.in', 147, yStart + 14);
                doc.text('GST: 29ACLFAA519M1ZW', 147, yStart + 22);
                
                // Service table
                yStart = 75 + sectionHeight + 5;
                doc.setFillColor(245, 245, 245);
                doc.rect(15, yStart, pageWidth - 30, 10, 'F');
                
                setTypography(doc, 'h3');
                doc.setFontSize(10);
                doc.text('Service & Description', 17, yStart + 7);
                doc.text('Qty', 130, yStart + 7, { align: 'center' });
                doc.text('Rate', 155, yStart + 7, { align: 'center' });
                doc.text('Total', pageWidth - 17, yStart + 7, { align: 'right' });
                
                yStart += 15;
                let subtotal = 0;
                const maxYPosition = pageHeight - 100; // Reserve more space for summary
                
                if (order.items && order.items.length > 0) {
                  order.items.forEach((item: any) => {
                    if (yStart > maxYPosition) {
                      doc.addPage();
                      yStart = 20;
                      
                      doc.setFillColor(245, 245, 245);
                      doc.rect(15, yStart, pageWidth - 30, 10, 'F');
                      
                      setTypography(doc, 'h3');
                      doc.setFontSize(10);
                      doc.text('Service & Description', 17, yStart + 7);
                      doc.text('Qty', 130, yStart + 7, { align: 'center' });
                      doc.text('Rate', 155, yStart + 7, { align: 'center' });
                      doc.text('Total', pageWidth - 17, yStart + 7, { align: 'right' });
                      yStart += 15;
                    }
                    
                    const itemTotal = (item.quantity || 0) * (item.price || 0);
                    subtotal += itemTotal;
                    
                    setTypography(doc, 'h4');
                    doc.setFontSize(10);
                    doc.text(item.name || 'Item', 17, yStart);
                    
                    setTypography(doc, 'body');
                    doc.setFontSize(10);
                    doc.text(String(item.quantity || 1), 130, yStart, { align: 'center' });
                    doc.text('- Rs.' + (item.price || 0), 155, yStart, { align: 'center' });
                    doc.text('- Rs.' + itemTotal, pageWidth - 17, yStart, { align: 'right' });
                    yStart += 15;
                  });
                } else {
                  setTypography(doc, 'h4');
                  doc.setFontSize(10);
                  doc.text('Service', 17, yStart);
                  
                  setTypography(doc, 'body');
                  doc.setFontSize(10);
                  doc.text('1', 130, yStart, { align: 'center' });
                  doc.text('- Rs.0', 155, yStart, { align: 'center' });
                  doc.text('- Rs.0', pageWidth - 17, yStart, { align: 'right' });
                  subtotal = 0;
                  yStart += 15;
                }
                
                // Check if summary section needs new page (reserve 80mm for summary)
                if (yStart > pageHeight - 80) {
                  doc.addPage();
                  yStart = 20;
                }
                
                // Summary section starts after items
                yStart += 10;
                setTypography(doc, 'h2');
                doc.setFontSize(12);
                
                doc.text('Subtotal', 130, yStart);
                doc.text('- Rs.' + subtotal, pageWidth - 17, yStart, { align: 'right' });
                yStart += 8;
                
                doc.setDrawColor(220, 220, 220);
                doc.setLineWidth(0.2);
                doc.line(130, yStart, pageWidth - 15, yStart);
                yStart += 8;
                
                doc.text('Tax (0%)', 130, yStart);
                doc.text('- Rs.0.00', pageWidth - 17, yStart, { align: 'right' });
                yStart += 8;
                
                doc.line(130, yStart, pageWidth - 15, yStart);
                yStart += 8;
                
                // Calculate discount
                const originalAmount = subtotal;
                const finalAmount = order.totalAmount || subtotal;
                const discountAmount = originalAmount - finalAmount;
                const hasDiscount = discountAmount > 0;
                
                if (hasDiscount) {
                  const discountLabel = order.appliedVoucherCode ? `Discount (${order.appliedVoucherCode})` : 'Discount';
                  doc.text(discountLabel, 130, yStart);
                  doc.text('- Rs.' + Math.round(discountAmount), pageWidth - 17, yStart, { align: 'right' });
                  yStart += 8;
                  
                  doc.line(130, yStart, pageWidth - 15, yStart);
                  yStart += 8;
                }
                
                const finalTotal = finalAmount;
                
                doc.text('Total', 130, yStart);
                doc.text('- Rs.' + Math.round(finalTotal), pageWidth - 17, yStart, { align: 'right' });
                yStart += 8;
                
                doc.line(130, yStart, pageWidth - 15, yStart);
                yStart += 8;
                
                // Grand Total
                doc.setTextColor(69, 45, 155);
                doc.text('Grand Total', 130, yStart);
                doc.text('- Rs.' + Math.round(order.totalAmount || finalTotal), pageWidth - 17, yStart, { align: 'right' });
                doc.setTextColor(0, 0, 0);
                
                // Footer
                yStart = pageHeight - 30;
                setTypography(doc, 'h3');
                doc.setFontSize(10);
                doc.text('Thank you for choosing Urban Steam', 15, yStart);
                
                setTypography(doc, 'body');
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text('In case of any issues contact support@urbansteam.in within 24 hours of delivery', 15, yStart + 6);
                
                doc.save(`Invoice-${order.orderId || 'order'}.pdf`);
              }}
              style={{
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              Download Invoice (PDF)
            </button>
            <button 
              onClick={() => {
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Delivery Slip - ${order.orderId}</title>
                        <style>
                          body { font-family: Arial, sans-serif; margin: 20px; }
                          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                          .section { margin-bottom: 15px; }
                          .label { font-weight: bold; }
                          .items { border: 1px solid #ccc; padding: 10px; }
                          @media print { body { margin: 0; } }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <h2>URBAN STEAM - DELIVERY SLIP</h2>
                          <p>Order ID: ${order.orderId || 'N/A'}</p>
                        </div>
                        
                        <div class="section">
                          <div class="label">Customer Details:</div>
                          <p>Name: ${order?.customerId?.name || 'N/A'}</p>
                          <p>Mobile: ${order?.customerId?.mobile || 'N/A'}</p>
                          <p>Address: ${order?.pickupAddress ? `${order.pickupAddress.street || ''}, ${order.pickupAddress.city || ''}, ${order.pickupAddress.state || ''} - ${order.pickupAddress.pincode || ''}` : 'N/A'}</p>
                        </div>
                        
                        <div class="section">
                          <div class="label">Partner Details:</div>
                          <p>Partner: ${order?.partnerId?.name || 'Not Assigned'}</p>
                          <p>Mobile: ${order?.partnerId?.mobile || 'N/A'}</p>
                        </div>
                        
                        <div class="section items">
                          <div class="label">Items:</div>
                          ${order?.items?.map((item: any) => `<p>• ${item.quantity} ${item.name} - ₹${item.price * item.quantity}</p>`).join('') || '<p>No items</p>'}
                          <hr>
                          <p><strong>Total: ₹${order?.totalAmount || 0}</strong></p>
                        </div>
                        
                        <div class="section">
                          <div class="label">Status:</div>
                          <p>${order?.status || 'N/A'}</p>
                          <p>Date: ${order?.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB') : 'N/A'}</p>
                        </div>
                        
                        <div class="section">
                          <p>_________________________</p>
                          <p>Customer Signature</p>
                        </div>
                        
                        <script>
                          window.onload = function() {
                            window.print();
                            window.onafterprint = function() {
                              window.close();
                            }
                          }
                        </script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }
              }}
              style={{
              backgroundColor: 'white',
              color: '#2563eb',
              border: '2px solid #2563eb',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              Print Slip
            </button>
          </div>
          </div>
          )}

          {/* Refund Modal */}
          {showRefundModal && refundCalculation && (
            <div style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }} onClick={() => setShowRefundModal(false)}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '90vh',
                overflow: 'auto'
              }} onClick={(e) => e.stopPropagation()}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#10b981' }}>💰 Refund Confirmation</h2>
                
                {/* Wallet Balance Summary - Top */}
                <div style={{ backgroundColor: '#eff6ff', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '2px solid #3b82f6' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: '#1e40af', textAlign: 'center' }}>Wallet Balance</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>Current Balance</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#dc2626' }}>₹{refundCalculation.currentWallet}</div>
                    </div>
                    <div style={{ fontSize: '2rem', color: '#3b82f6' }}>→</div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>After Refund</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#10b981' }}>₹{refundCalculation.newWallet}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '1rem', padding: '0.75rem', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#166534', fontWeight: '600' }}>
                      +₹{refundCalculation.refundAmount} will be credited
                    </span>
                  </div>
                </div>
                
                {/* Order Details */}
                <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Order Details</h3>
                  <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Order ID:</span>
                      <strong>#{order.orderId}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Customer:</span>
                      <strong>{refundCalculation.customer.name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
                      <span>Items:</span>
                      <span>{order.items?.map((item: any) => `${item.quantity} ${item.name}`).join(', ')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: '#2563eb' }}>
                      <span>Order Amount:</span>
                      <span>₹{refundCalculation.orderAmount}</span>
                    </div>
                  </div>
                </div>

                {/* Charges */}
                {refundCalculation.chargeAmount > 0 && (
                  <div style={{ backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #fecaca' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#dc2626' }}>Charges Applied</h3>
                    <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.8' }}>
                      {order.cancellationFee > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Cancellation Fee:</span>
                          <strong style={{ color: '#dc2626' }}>₹{order.cancellationFee}</strong>
                        </div>
                      )}
                      {order.deliveryFailureFee > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Delivery Failure Fee:</span>
                          <strong style={{ color: '#dc2626' }}>₹{order.deliveryFailureFee}</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #fecaca', fontWeight: '600' }}>
                        <span>Total Charges:</span>
                        <strong style={{ color: '#dc2626' }}>₹{refundCalculation.chargeAmount}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wallet & Due Status */}
                <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #bfdbfe' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#2563eb' }}>Current Wallet Status</h3>
                  <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Current Wallet Balance:</span>
                      <strong>₹{refundCalculation.currentWallet}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Current Due Amount:</span>
                      <strong style={{ color: refundCalculation.currentDue > 0 ? '#dc2626' : '#10b981' }}>₹{refundCalculation.currentDue}</strong>
                    </div>
                  </div>
                </div>

                {/* Refund Calculation */}
                <div style={{ backgroundColor: '#dcfce7', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '2px solid #10b981' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#166534' }}>Refund Breakdown</h3>
                  <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.8' }}>
                    {refundCalculation.dueCleared > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                        <span>✓ Due Cleared:</span>
                        <strong>₹{refundCalculation.dueCleared}</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '700', color: '#166534', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #86efac' }}>
                      <span>Amount to Credit:</span>
                      <span>₹{refundCalculation.refundAmount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                      <span>New Wallet Balance:</span>
                      <strong style={{ color: '#10b981' }}>₹{refundCalculation.newWallet}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>New Due Amount:</span>
                      <strong style={{ color: refundCalculation.newDue > 0 ? '#dc2626' : '#10b981' }}>₹{refundCalculation.newDue}</strong>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={() => setShowRefundModal(false)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      backgroundColor: 'white'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setProcessingRefund(true);
                        // Update wallet balance
                        const walletRes = await fetch(`/api/customers/${order.customerId._id}/adjust`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            type: 'balance',
                            action: 'increase',
                            amount: refundCalculation.refundAmount,
                            reason: `Refund for order #${order.orderId}`,
                            adjustedBy: 'Admin'
                          })
                        });
                        
                        if (!walletRes.ok) {
                          const errorData = await walletRes.json();
                          throw new Error(errorData.error || 'Failed to update wallet');
                        }
                        
                        // Update customer due amount directly
                        await fetch(`/api/customers/${order.customerId._id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            dueAmount: refundCalculation.newDue
                          })
                        });
                        
                        // Mark order as refunded
                        await fetch(`/api/orders/${order._id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            refunded: true,
                            refundedAt: new Date().toISOString(),
                            refundAmount: refundCalculation.refundAmount
                          })
                        });
                        
                        alert(`Refund successful! ₹${refundCalculation.refundAmount} credited to wallet.`);
                        window.location.reload();
                      } catch (error: any) {
                        console.error('Refund error:', error);
                        alert(`Refund failed: ${error.message || 'Please try again.'}`);
                      } finally {
                        setProcessingRefund(false);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: processingRefund ? 'not-allowed' : 'pointer',
                      backgroundColor: processingRefund ? '#9ca3af' : '#10b981',
                      color: 'white',
                      opacity: processingRefund ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                    disabled={processingRefund}
                  >
                    {processingRefund ? (
                      <>
                        <span style={{ 
                          display: 'inline-block', 
                          width: '16px', 
                          height: '16px', 
                          border: '2px solid white', 
                          borderTopColor: 'transparent', 
                          borderRadius: '50%', 
                          animation: 'spin 0.6s linear infinite' 
                        }} />
                        Processing...
                      </>
                    ) : (
                      '✓ Confirm Refund'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
    </ResponsiveLayout>
  )
}