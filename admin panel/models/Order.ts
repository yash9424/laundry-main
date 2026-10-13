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
    pincode: String,
    // Carried over from the address the customer pinned, so the captain is given
    // a point to navigate to rather than a string to search for.
    latitude: Number,
    longitude: Number
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    latitude: Number,
    longitude: Number
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
  itemsSubtotal: { type: Number },
  discountAmount: { type: Number },
  walletUsed: { type: Number },
  amountPaidOnline: { type: Number },
  expectedDeliveryAt: { type: Date },
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

// The collection the whole system reads. Both apps poll it -- the customer
// app every two seconds per signed-in phone, the Captain app every ten -- and
// without these every one of those was a full scan of every order ever placed,
// followed by an in-memory sort. That is what pins the server's CPU as the
// collection grows.
// `orderId` needs no entry here: the path is declared unique, so Mongoose
// already creates that index, and naming it twice conflicts on boot.
OrderSchema.index({ customerId: 1, createdAt: -1 })     // the customer app's poll
OrderSchema.index({ partnerId: 1, status: 1 })          // the Captain's lists and counts
OrderSchema.index({ status: 1, createdAt: -1 })         // admin lists and reports
OrderSchema.index({ createdAt: -1 })                    // the default sort
OrderSchema.index({ 'pickupAddress.pincode': 1, status: 1 }) // hub and partnerScope

export default mongoose.models.Order || mongoose.model('Order', OrderSchema)