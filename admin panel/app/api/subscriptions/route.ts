import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Subscription from '@/models/Subscription'
import SubscriptionPlan from '@/models/SubscriptionPlan'
import Customer from '@/models/Customer'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    const query = customerId ? { customerId } : {}
    const subscriptions = await Subscription.find(query)
      .populate('customerId', 'name mobile')
      .populate('planId')
      .sort({ purchasedAt: -1 })
      .lean()

    return NextResponse.json({ success: true, data: subscriptions })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch subscriptions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const { customerId, planId, razorpayOrderId, razorpayPaymentId, status } = body

    const plan = await SubscriptionPlan.findById(planId).lean() as any
    if (!plan) return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 })

    const subscription = await Subscription.create({
      customerId,
      planId,
      planName: plan.name,
      price: plan.price,
      walletCredited: plan.walletCredit,
      razorpayOrderId,
      razorpayPaymentId,
      status: status || 'active'
    })

    if (status === 'active' || !status) {
      const customer = await Customer.findById(customerId)
      if (customer) {
        const prev = customer.walletBalance || 0
        customer.walletBalance = prev + plan.walletCredit
        await customer.save()
      }
    }

    return NextResponse.json({ success: true, data: subscription })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create subscription' }, { status: 500 })
  }
}
