import mongoose from 'mongoose'

const OrderChargesSchema = new mongoose.Schema({
  cancellationPercentage: { type: Number, default: 20 },
  customerUnavailable: { type: Number, default: 150 },
  incorrectAddress: { type: Number, default: 150 },
  refusalToAccept: { type: Number, default: 150 },
  cancellationPolicyText: { type: String, default: '' },
  expressDeliveryEnabled: { type: Boolean, default: true },
  expressTurnaroundHours: { type: Number, default: 12 },
  standardTurnaroundHours: { type: Number, default: 24 },
  invoiceGstNumber: { type: String, default: '29ACLFAA519M1ZW' },
  invoiceSupportEmail: { type: String, default: 'support@urbansteam.in' },
  // Customer Home screen — the two delivery buttons
  homeStandardTitle: { type: String, default: 'Standard Delivery' },
  homeStandardSubtitle: { type: String, default: '24-hour turnaround' },
  homeExpressTitle: { type: String, default: 'Express Delivery' },
  homeExpressSubtitle: { type: String, default: '12-hour turnaround — for a small fee' },
  // "How To Order" popup on the catalogue. One step per line, written as "Title | Description".
  howToOrderTitle: { type: String, default: 'How To Order' },
  howToOrderSteps: {
    type: String,
    default: 'Choose Your Garments | Count your garments and tap "+" to add them.\nReview Your Cart | Items are saved to your cart automatically. Tap the total bar or Cart below to check your order.\nPick a Slot & Pay | Choose your pickup slot and complete payment.\nRelax | We\'ll take care of the rest.'
  },
  // Brand typography, applied across the Customer, Captain and Admin apps.
  // Must be a Google Fonts family name; the apps fall back to the defaults if it fails to load.
  brandHeadingFont: { type: String, default: 'Montserrat' },
  brandBodyFont: { type: String, default: 'Manrope' },
  // Checkout policy popups. Empty = fall back to the matching section of the Terms page.
  garmentCarePolicyText: { type: String, default: '' },
  damageLossPolicyText: { type: String, default: '' },
  // "Before your pickup" card shown in the customer app (Order Confirmation + Track Order)
  pickupChecklistEnabled: { type: Boolean, default: true },
  pickupChecklistTitle: { type: String, default: 'Before your pickup' },
  pickupChecklistIntro: { type: String, default: 'For a smooth pickup, please ensure that:' },
  // One bullet per line
  pickupChecklistPoints: {
    type: String,
    default: 'The garment quantities match your booking.\nGarments are added under the correct categories (for example, Linen Shirts and Silk Sarees).\nThe garments are kept ready as per your booking.'
  },
  pickupChecklistNote: { type: String, default: 'Our pickup team will collect only the garments included in the confirmed booking.' },
  pickupImportantTitle: { type: String, default: 'Important' },
  pickupImportantText: { type: String, default: 'Urban Steam does not take responsibility for cash, jewellery, or any personal items left inside garments. Kindly check all pockets before handing over your clothes.' },
  pickupSustainabilityTitle: { type: String, default: 'A small step towards sustainable service' },
  pickupSustainabilityText: { type: String, default: "If the paper inside your garments is still clean and usable, you can keep it aside for us. We'll be happy to collect and reuse it with your next pickup." },
  expressDeliveryPrice: { type: Number, default: 0 },
  expressDeliveryLabel: { type: String, default: '' },
  expressDeliveryDescription: { type: String, default: '' },
  todaySlotsEnabled: { type: Boolean, default: true },
  tomorrowSlotsEnabled: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
})

export default mongoose.models.OrderCharges || mongoose.model('OrderCharges', OrderChargesSchema)
