import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import SubscriptionPlan from '@/models/SubscriptionPlan'

export async function GET() {
  try {
    await connectDB()
    const plans = await SubscriptionPlan.find().sort({ order: 1 }).lean()
    return NextResponse.json({ success: true, data: plans })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch plans' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const { name, benefits, price, walletCredit, image, isActive } = body
    const plan = await SubscriptionPlan.create({ name, benefits, price, walletCredit, image, isActive })
    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create plan' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()

    if (body.reorder) {
      await Promise.all(
        body.reorder.map(({ id, order }: { id: string; order: number }) =>
          SubscriptionPlan.findByIdAndUpdate(id, { order })
        )
      )
      return NextResponse.json({ success: true })
    }

    const { id, ...fields } = body
    const plan = await SubscriptionPlan.findByIdAndUpdate(id, fields, { new: true })
    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update plan' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 })
    await SubscriptionPlan.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete plan' }, { status: 500 })
  }
}
