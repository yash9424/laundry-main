import mongoose from 'mongoose'

const SubscriptionSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  planName: String,
  price: Number,
  walletCredited: Number,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  status: { type: String, enum: ['pending', 'active', 'failed'], default: 'pending' },
  purchasedAt: { type: Date, default: Date.now }
})

// My Wallet Plans asks for one customer's purchases.
SubscriptionSchema.index({ customerId: 1, createdAt: -1 })

export default mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema)
