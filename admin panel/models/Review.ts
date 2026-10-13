import mongoose from 'mongoose'

const ReviewSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now }
})

// Looked up by order whenever a rating is submitted or shown.
ReviewSchema.index({ orderId: 1 })

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema)