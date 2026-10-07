import mongoose from 'mongoose'

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  email: { type: String },
  googleId: { type: String, unique: true, sparse: true },
  appleId: { type: String, unique: true, sparse: true },
  profileImage: { type: String },
  address: [{
    street: String,
    city: String,
    state: String,
    pincode: String,
    // Where the customer actually dropped the pin. A typed address alone left the
    // captain searching for a text match, which Google often answered with the
    // wrong end of the street.
    latitude: Number,
    longitude: Number,
    isDefault: { type: Boolean, default: false }
  }],
  paymentMethods: [{
    type: { type: String },
    upiId: { type: String },
    cardNumber: { type: String },
    cardHolder: { type: String },
    expiryDate: { type: String },
    cvv: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    bankName: { type: String },
    details: { type: String },
    isPrimary: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now }
  }],
  totalSpend: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  walletBalance: { type: Number, default: 0 },
  loyaltyPoints: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  lastAdjustmentReason: { type: String },
  lastAdjustmentAction: { type: String },
  lastAdjustmentAt: { type: Date },
  referralCodes: [{ 
    code: String, 
    used: { type: Boolean, default: false },
    usedBy: String,
    usedAt: Date,
    createdAt: { type: Date, default: Date.now }
  }],
  referredBy: String,
  usedVouchers: [{ 
    voucherCode: String,
    usedAt: { type: Date, default: Date.now },
    orderId: String
  }],
  isActive: { type: Boolean, default: true },
  lastOrderDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema)