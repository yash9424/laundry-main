import mongoose from 'mongoose';

const PricingItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    default: 'All'
  },
  image: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

if (mongoose.models.PricingItem) {
  delete mongoose.models.PricingItem;
}

export default mongoose.model('PricingItem', PricingItemSchema);