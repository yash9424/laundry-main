import mongoose from 'mongoose'

const SubscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  benefits: [{ type: String }],
  price: { type: Number, required: true },
  walletCredit: { type: Number, required: true },
  image: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.models.SubscriptionPlan || mongoose.model('SubscriptionPlan', SubscriptionPlanSchema)
