import mongoose from 'mongoose'

const OrderChargesSchema = new mongoose.Schema({
  cancellationPercentage: { type: Number, default: 20 },
  customerUnavailable: { type: Number, default: 150 },
  incorrectAddress: { type: Number, default: 150 },
  refusalToAccept: { type: Number, default: 150 },
  cancellationPolicyText: { type: String, default: '' },
  expressDeliveryPrice: { type: Number, default: 0 },
  expressDeliveryLabel: { type: String, default: '' },
  expressDeliveryDescription: { type: String, default: '' },
  todaySlotsEnabled: { type: Boolean, default: true },
  tomorrowSlotsEnabled: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
})

export default mongoose.models.OrderCharges || mongoose.model('OrderCharges', OrderChargesSchema)
