import mongoose from 'mongoose'

const WalletSettingsSchema = new mongoose.Schema({
  minOrderPrice: { type: Number, default: 500 },

  // Referral rewards, paid as wallet credit rather than cash. Credit only
  // becomes useful when the customer orders again, so it costs the business a
  // margin rather than a payout, and it is only given once the referred friend
  // has actually placed and paid for an order.
  referralRewardAmount: { type: Number, default: 50 },       // to the referrer
  referredUserRewardAmount: { type: Number, default: 25 },   // to the new customer
  updatedAt: { type: Date, default: Date.now }
})

export default mongoose.models.WalletSettings || mongoose.model('WalletSettings', WalletSettingsSchema)
