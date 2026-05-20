import { Schema, model, models } from 'mongoose';

const PricingCategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  image: { type: String, default: '' },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export default models.PricingCategory || model('PricingCategory', PricingCategorySchema);
