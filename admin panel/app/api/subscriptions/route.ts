import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Subscription from '@/models/Subscription'
import SubscriptionPlan from '@/models/SubscriptionPlan'
import Customer from '@/models/Customer'
import WalletTransaction from '@/models/WalletTransaction'

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

    // The wallet credit must land on a real, identified customer — never a missing
    // or mistyped id, which is how value ends up attached to the wrong account.
    if (!customerId) {
      return NextResponse.json({ success: false, error: 'Customer ID is required' }, { status: 400 })
    }
    const buyer = await Customer.findById(customerId).select('_id name walletBalance')
    if (!buyer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
    }

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
      const creditAmount = Number(plan.walletCredit) || 0
      const previousBalance = buyer.walletBalance || 0

      // $inc is atomic: two purchases at the same moment cannot overwrite each other,
      // and the credit is scoped to this one customer's document.
      const credited = await Customer.findByIdAndUpdate(
        buyer._id,
        { $inc: { walletBalance: creditAmount } },
        { new: true }
      ).select('walletBalance')

      // Wallet credits must leave a trail (scope section 15)
      await WalletTransaction.create({
        customerId: buyer._id,
        type: 'balance',
        action: 'increase',
        amount: creditAmount,
        reason: `Wallet top-up — ${plan.name} plan (₹${plan.price})`,
        previousValue: previousBalance,
        newValue: credited?.walletBalance ?? previousBalance + creditAmount,
        adjustedBy: 'System'
      })
    }

    return NextResponse.json({ success: true, data: subscription })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create subscription' }, { status: 500 })
  }
}
