import mongoose from 'mongoose'

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
  hub: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub' },
  items: [{
    name: String,
    quantity: Number,
    price: Number
  }],
  totalAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'reached_location', 'picked_up', 'delivered_to_hub', 'processing', 'ironing', 'process_completed', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'delivery_failed', 'suspended'],
    default: 'pending'
  },
  pickupAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  pickupSlot: {
    date: Date,
    timeSlot: String
  },
  deliverySlot: {
    date: Date,
    timeSlot: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  paymentMethod: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  appliedVoucherCode: String,
  expressDelivery: { type: Boolean, default: false },
  expressDeliveryFee: { type: Number, default: 0 },
  previousDuePaid: { type: Number, default: 0 },
  cancellationFee: { type: Number, default: 0 },
  cancellationReason: String,
  cancelledAt: Date,
  deliveryFailureReason: String,
  deliveryFailureFee: { type: Number, default: 0 },
  deliveryFailedAt: Date,
  refunded: { type: Boolean, default: false },
  refundedAt: Date,
  refundAmount: { type: Number, default: 0 },
  returnToHubRequested: { type: Boolean, default: false },
  returnToHubRequestedAt: Date,
  returnToHubApproved: { type: Boolean, default: false },
  returnToHubApprovedAt: Date,
  redeliveryScheduled: { type: Boolean, default: false },
  redeliveryReturnRequested: { type: Boolean, default: false },
  redeliveryReturnRequestedAt: Date,
  redeliveryReturnApproved: { type: Boolean, default: false },
  redeliveryReturnApprovedAt: Date,
  orderSuspended: { type: Boolean, default: false },
  suspensionReason: String,
  suspendedAt: Date,
  specialInstructions: String,
  pickupPhotos: [String],
  pickupNotes: String,
  issue: String,
  issueReportedAt: Date,
  reachedLocationAt: Date,
  pickedUpAt: Date,
  deliveredToHubAt: Date,
  hubApprovedAt: Date,
  ironingAt: Date,
  processCompletedAt: Date,
  outForDeliveryAt: Date,
  outForRedeliveryAt: Date,
  deliveredAt: Date,
  statusHistory: [{
    status: String,
    timestamp: Date,
    updatedBy: String
  }],
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' },
  adminNotes: [{
    _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    note: String,
    addedBy: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export default mongoose.models.Order || mongoose.model('Order', OrderSchema)