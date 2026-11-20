import mongoose from 'mongoose'

const CustomerSchema = new mongoose.Schema({
  // Not required: the record is created the moment a phone number is verified,
  // before the person has told us their name. They fill it in on the next
  // screen. Requiring it here meant Mongoose rejected the placeholder — an
  // empty string fails `required` — so no new phone signup could ever complete.
  name: { type: String, default: '' },
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
  // A saved payment method is a hint about which sheet Razorpay should open,
  // nothing more. It once carried cardNumber, expiryDate and cvv as well --
  // the card itself, and a CVV that PCI-DSS forbids storing at all -- none of
  // which was ever used to take a payment. They are gone from the schema, so
  // a phone on an older build that still sends them has them dropped on
  // arrival instead of written down.
  paymentMethods: [{
    type: { type: String },
    upiId: { type: String },
    cardHolder: { type: String },
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