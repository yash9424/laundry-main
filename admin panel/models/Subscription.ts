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

export default mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema)
