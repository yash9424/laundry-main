import mongoose from 'mongoose'

/**
 * Atomic counters, currently just the running order number.
 *
 * Order IDs used to be five random characters, which gave no sense of sequence
 * and could in principle collide. A counter incremented with findOneAndUpdate
 * is atomic in MongoDB, so two orders placed in the same instant still receive
 * different numbers.
 */
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
}, { versionKey: false })

export default mongoose.models.Counter || mongoose.model('Counter', CounterSchema)
