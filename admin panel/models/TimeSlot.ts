import mongoose from 'mongoose'

const TimeSlotSchema = new mongoose.Schema({
  time: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['pickup', 'delivery', 'both'],
    default: 'both'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  availableFor: {
    type: String,
    enum: ['today', 'tomorrow', 'both'],
    default: 'both'
  },
  // Express runs on its own shifts, so its pickup windows are not the same ones
  // Standard uses. Existing slots default to 'both' and keep working as before.
  serviceType: {
    type: String,
    enum: ['standard', 'express', 'both'],
    default: 'both'
  },
  // How many days ahead this slot can be booked. The customer app shows the next
  // four dates; a slot is offered on every one of them unless this is narrowed.
  maxDaysAhead: {
    type: Number,
    default: 4
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
})

export default mongoose.models.TimeSlot || mongoose.model('TimeSlot', TimeSlotSchema)