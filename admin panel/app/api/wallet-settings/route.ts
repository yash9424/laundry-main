import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import WalletSettings from '@/models/WalletSettings'

export async function GET() {
  try {
    await connectDB()
    let settings = await WalletSettings.findOne()

    // The schema carries the defaults, so an empty document is enough
    if (!settings) settings = await WalletSettings.create({})

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// Only these may be written, and only when the request actually carries them.
// Listing them avoids wiping a setting the caller did not mention.
const EDITABLE = [
  'minOrderPrice',
  'referralRewardAmount',
  'referredUserRewardAmount',
] as const

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()

    const update: Record<string, number | Date> = { updatedAt: new Date() }

    for (const field of EDITABLE) {
      if (body[field] === undefined) continue
      const value = Number(body[field])
      // Zero is a real setting here — it switches a reward off — so it must not
      // be treated as "missing". Only a non-number is rejected.
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json(
          { success: false, error: `${field} must be a number of zero or more` },
          { status: 400 }
        )
      }
      update[field] = Math.round(value)
    }

    const settings = await WalletSettings.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true }
    )

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('Save error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 })
  }
}
