import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'
import Customer from '@/models/Customer'
import Partner from '@/models/Partner'
import WalletSettings from '@/models/WalletSettings'
import WalletTransaction from '@/models/WalletTransaction'
import Hub from '@/models/Hub'

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const orderData = await request.json()
    
    // Generate unique 5-character alphanumeric order ID
    const orderId = Math.random().toString(36).substr(2, 5).toUpperCase()
    
    // Find hub based on customer pincode
    let assignedHub = null
    if (orderData.pickupAddress?.pincode) {
      const hub = await Hub.findOne({ 
        pincodes: orderData.pickupAddress.pincode,
        isActive: true 
      })
      if (hub) {
        assignedHub = hub._id
      }
    }
    
    // Get customer's current due amount
    let previousDuePaid = 0
    const customerForDue = await Customer.findById(orderData.customerId)
    if (customerForDue && customerForDue.dueAmount > 0) {
      previousDuePaid = customerForDue.dueAmount
    }

    const newOrder = new Order({
      orderId,
      customerId: orderData.customerId,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      previousDuePaid: previousDuePaid,
      status: 'pending',
      hub: assignedHub,
      pickupAddress: orderData.pickupAddress,
      deliveryAddress: orderData.deliveryAddress || orderData.pickupAddress,
      pickupSlot: {
        date: orderData.pickupDate || new Date(),
        timeSlot: orderData.pickupSlot
      },
      paymentMethod: orderData.paymentMethod || 'Cash on Delivery',
      paymentStatus: orderData.paymentStatus || 'pending',
      razorpayOrderId: orderData.razorpayOrderId,
      razorpayPaymentId: orderData.razorpayPaymentId,
      appliedVoucherCode: orderData.appliedVoucherCode,
      specialInstructions: orderData.specialInstructions || '',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    const savedOrder = await newOrder.save()
    
    // Mark voucher as used ONLY if payment is successful
    if (orderData.appliedVoucherCode && orderData.paymentStatus === 'paid') {
      await Customer.findByIdAndUpdate(orderData.customerId, {
        $push: {
          usedVouchers: {
            voucherCode: orderData.appliedVoucherCode,
            usedAt: new Date(),
            orderId: orderId
          }
        }
      })
    }
    
    // Handle wallet payment - deduct from wallet balance
    if (orderData.walletUsed && orderData.walletUsed > 0) {
      const customer = await Customer.findById(orderData.customerId)
      if (customer) {
        const walletBalance = customer.walletBalance || 0
        const walletAmount = orderData.walletUsed
        
        if (walletBalance >= walletAmount) {
          // Deduct wallet amount from balance
          await Customer.findByIdAndUpdate(orderData.customerId, {
            walletBalance: walletBalance - walletAmount
          })
          
          // Record wallet transaction
          await WalletTransaction.create({
            customerId: customer._id,
            type: 'balance',
            action: 'decrease',
            amount: walletAmount,
            reason: `Payment for Order #${orderId}`,
            previousValue: walletBalance,
            newValue: walletBalance - walletAmount,
            adjustedBy: 'System'
          })
        }
      }
    }
    
    // Clear due amount if payment is successful and record transaction
    if (orderData.paymentStatus === 'paid') {
      const customer = await Customer.findById(orderData.customerId)
      if (customer && customer.dueAmount > 0) {
        const paidDueAmount = customer.dueAmount
        
        // Clear due amount
        await Customer.findByIdAndUpdate(orderData.customerId, {
          dueAmount: 0
        })
        
        // Record wallet transaction for due payment
        await WalletTransaction.create({
          customerId: customer._id,
          type: 'balance',
          action: 'increase',
          amount: 0,
          reason: `Due amount of ₹${paidDueAmount} paid with Order #${orderId}`,
          previousValue: customer.dueAmount,
          newValue: 0,
          adjustedBy: 'System'
        })
      }
    }
    
    // Award points to customer and handle referral
    try {
      const settings = await WalletSettings.findOne()
      const customer = await Customer.findById(orderData.customerId)
      
      if (customer) {
        // Award only order completion points (no spending points)
        const orderCompletionPoints = settings?.orderCompletionPoints || 10
        
        // Award order points to loyaltyPoints
        await Customer.findByIdAndUpdate(orderData.customerId, {
          $inc: { loyaltyPoints: orderCompletionPoints, totalOrders: 1 }
        })
        
        // Create wallet transaction for order points
        await WalletTransaction.create({
          customerId: customer._id,
          type: 'points',
          action: 'increase',
          amount: orderCompletionPoints,
          reason: `Order #${orderId} completed - ${orderCompletionPoints} points earned`,
          previousValue: customer.loyaltyPoints || 0,
          newValue: (customer.loyaltyPoints || 0) + orderCompletionPoints,
          adjustedBy: 'System'
        })
        
        // Check if this is first order and customer was referred
        if (customer.totalOrders === 0 && customer.referredBy) {
          // Award signup bonus to new customer
          const signupBonus = settings?.signupBonusPoints || 25
          const newCustomerPoints = (customer.loyaltyPoints || 0) + orderCompletionPoints
          
          await Customer.findByIdAndUpdate(orderData.customerId, {
            $inc: { loyaltyPoints: signupBonus }
          })
          
          // Create wallet transaction for signup bonus
          await WalletTransaction.create({
            customerId: customer._id,
            type: 'points',
            action: 'increase',
            amount: signupBonus,
            reason: `Signup bonus for first order`,
            previousValue: newCustomerPoints,
            newValue: newCustomerPoints + signupBonus,
            adjustedBy: 'System'
          })
          
          // Find referrer and award referral points
          const referrer = await Customer.findOne({ 
            'referralCodes.code': customer.referredBy,
            'referralCodes.used': false
          })
          
          if (referrer) {
            const referralBonus = settings?.referralPoints || 50
            
            // Award referral bonus to referrer's loyaltyPoints
            await Customer.findByIdAndUpdate(referrer._id, {
              $inc: { loyaltyPoints: referralBonus }
            })
            
            // Create wallet transaction for referral bonus
            await WalletTransaction.create({
              customerId: referrer._id,
              type: 'points',
              action: 'increase',
              amount: referralBonus,
              reason: `Referral bonus - ${customer.name} completed first order`,
              previousValue: referrer.loyaltyPoints || 0,
              newValue: (referrer.loyaltyPoints || 0) + referralBonus,
              adjustedBy: 'System'
            })
            
            // Mark referral code as used
            await Customer.updateOne(
              { _id: referrer._id, 'referralCodes.code': customer.referredBy },
              { $set: { 'referralCodes.$.used': true, 'referralCodes.$.usedBy': customer.name, 'referralCodes.$.usedAt': new Date() } }
            )
          }
        }
      }
    } catch (error) {
      console.error('Error awarding points:', error)
    }
    
    return NextResponse.json({
      success: true,
      data: savedOrder,
      message: 'Order created successfully'
    })
    
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to create order'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    Partner // Ensure Partner model is registered
    
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const hub = searchParams.get('hub')
    const partnerIdParam = searchParams.get('partnerId')

    let query: any = {}
    if (customerId) {
      query.customerId = customerId
    }
    if (partnerIdParam) {
      query.partnerId = partnerIdParam
    }
    if (hub) {
      console.log('Filtering orders for hub:', hub)
      // For Store Managers: find hub and get its pincodes, then filter orders
      const hubDoc = await Hub.findOne({ name: hub })
      console.log('Hub found:', hubDoc ? hubDoc.name : 'Not found')
      console.log('Hub pincodes:', hubDoc?.pincodes)
      
      if (hubDoc && hubDoc.pincodes && hubDoc.pincodes.length > 0) {
        query['pickupAddress.pincode'] = { $in: hubDoc.pincodes }
        console.log('Query filter:', query)
      } else {
        // If hub not found or has no pincodes, return empty result
        query._id = null
      }
    }
    
    const orders = await Order.find(query)
      .populate('customerId', 'name mobile email')
      .populate('partnerId', 'name mobile email')
      .populate('hub', 'name address contactPerson contactNumber')
      .sort({ createdAt: -1 })
    
    console.log('Orders found:', orders.length)
    
    return NextResponse.json({
      success: true,
      data: orders
    })
    
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch orders'
    }, { status: 500 })
  }
}