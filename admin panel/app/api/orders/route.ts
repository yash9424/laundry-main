import { NextRequest, NextResponse } from 'next/server'
import dbConnect, { connectToDatabase } from '@/lib/mongodb'
import Order from '@/models/Order'
import Customer from '@/models/Customer'
import Partner from '@/models/Partner'
import WalletSettings from '@/models/WalletSettings'
import WalletTransaction from '@/models/WalletTransaction'
import Hub from '@/models/Hub'
import Counter from '@/models/Counter'
import OrderCharges from '@/models/OrderCharges'

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const orderData = await request.json()

    // Generate unique 5-character alphanumeric order ID
    // Order numbering. Sequential is off by default so nothing changes until the
    // admin turns it on and picks a starting number.
    const numbering = await OrderCharges.findOne().select('orderIdSequential orderIdPrefix orderIdStart')
    let orderId: string

    if (numbering?.orderIdSequential) {
      const start = Number(numbering.orderIdStart) || 1001
      const prefix = (numbering.orderIdPrefix || 'US').toString().trim().toUpperCase()

      // $inc is atomic, so two orders placed together still get different numbers.
      const counter = await Counter.findOneAndUpdate(
        { _id: 'orderId' },
        { $inc: { seq: 1 }, $setOnInsert: {} },
        { new: true, upsert: true }
      )
      // The counter begins below the configured start, so lift it on first use.
      const next = counter.seq < start ? start : counter.seq
      if (counter.seq < start) {
        await Counter.updateOne({ _id: 'orderId' }, { $set: { seq: start } })
      }
      orderId = `${prefix}${next}`
    } else {
      orderId = Math.random().toString(36).substr(2, 5).toUpperCase()
    }

    // expectedDeliveryAt is intentionally NOT set here. Per spec, the 24hr/12hr
    // turnaround counts from actual PICKUP time, not order placement — it gets
    // calculated (server-side, tamper-proof) when the Captain marks the order
    // as picked up. See app/api/orders/[id]/route.ts PATCH handler.
    const serverNow = new Date()
    
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

    // Price breakdown saved on the order so every screen and invoice prints the same numbers
    const itemsList = Array.isArray(orderData.items) ? orderData.items : []
    const itemsSubtotal = itemsList.reduce(
      (sum: number, item: any) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0
    )
    const orderTotal = Number(orderData.totalAmount) || 0
    let discountAmount = Math.min(Math.max(Number(orderData.discountAmount) || 0, 0), itemsSubtotal)
    const requestedWallet = Number(orderData.walletUsed) || 0
    const walletApplied = requestedWallet > 0 && (customerForDue?.walletBalance || 0) >= requestedWallet
      ? Math.min(requestedWallet, orderTotal)
      : 0
    const amountPaidOnline = orderData.paymentStatus === 'paid' ? Math.max(0, orderTotal - walletApplied) : 0
    const expressFeeForTotal = orderData.expressDelivery ? Number(orderData.expressDeliveryFee) || 0 : 0
    const expectedTotal = itemsSubtotal - discountAmount + previousDuePaid + expressFeeForTotal
    if (Math.abs(expectedTotal - orderTotal) > 1) {
      // The charged total is the truth: derive the discount from it so the printed lines always add up
      console.warn(`Order ${orderId}: total mismatch. Expected ${expectedTotal} from breakdown, received ${orderTotal}`)
      discountAmount = Math.min(Math.max(itemsSubtotal + previousDuePaid + expressFeeForTotal - orderTotal, 0), itemsSubtotal)
    }

    const newOrder = new Order({
      orderId,
      customerId: orderData.customerId,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      itemsSubtotal,
      discountAmount,
      walletUsed: walletApplied,
      amountPaidOnline,
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
      expressDelivery: orderData.expressDelivery || false,
      expressDeliveryFee: orderData.expressDeliveryFee || 0,
      createdAt: serverNow,
      updatedAt: serverNow
    })
    
    const savedOrder = await newOrder.save()

    // Let the admin know a new order came in (shows in Admin > Notifications)
    try {
      const { db } = await connectToDatabase()
      await db.collection('notifications').insertOne({
        title: 'New Order Placed',
        message: `Order #${orderId} placed — ₹${orderData.totalAmount}${orderData.expressDelivery ? ' (Express Delivery)' : ''}`,
        audience: 'Admin',
        status: 'sent',
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    } catch (notifyError) {
      console.error('Failed to create admin notification for new order:', notifyError)
    }

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
    
    // Count the order against the customer, and close out their referral code if
    // this was their first order. Loyalty points were removed from the product:
    // the Urban Steam Wallet is the only value the customer holds.
    try {
      const customer = await Customer.findById(orderData.customerId)

      if (customer) {
        const isFirstOrder = (customer.totalOrders || 0) === 0

        await Customer.findByIdAndUpdate(orderData.customerId, {
          $inc: { totalOrders: 1 }
        })

        if (isFirstOrder && customer.referredBy) {
          await Customer.updateOne(
            { 'referralCodes.code': customer.referredBy, 'referralCodes.used': false },
            { $set: { 'referralCodes.$.used': true, 'referralCodes.$.usedBy': customer.name, 'referralCodes.$.usedAt': new Date() } }
          )
        }
      }
    } catch (error) {
      console.error('Error updating customer order count:', error)
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
    const partnerScope = searchParams.get('partnerScope')

    let query: any = {}
    if (customerId) {
      query.customerId = customerId
    }
    if (partnerIdParam) {
      query.partnerId = partnerIdParam
    }
    // What the Captain app's 10-second poller actually needs: the orders assigned
    // to this partner, plus the unclaimed ones in the pincodes they serve. Without
    // it the app pulls every order in the database on every tick, which grows
    // without limit as orders accumulate. Old app builds send no partnerScope and
    // still get the full list, so they keep working unchanged.
    if (partnerScope) {
      const partnerDoc = await Partner.findById(partnerScope).select('pincodes')
      const servedPincodes = partnerDoc?.pincodes?.length ? partnerDoc.pincodes : []
      query.$or = [
        { partnerId: partnerScope },
        { 'pickupAddress.pincode': { $in: servedPincodes }, partnerId: null },
      ]
      // Delivered and cancelled orders are terminal — the poller never raises a
      // notification for them, so they only add weight.
      query.status = { $nin: ['delivered', 'cancelled'] }
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
    
    // pickupPhotos are base64 data URLs stored inside the document, so an order
    // averages ~600 KB. Sending them here made the unfiltered list 7.3 MB, which
    // the Captain app then re-fetched every 10 seconds. Nothing reads photos from
    // the list — only the admin order detail screen does, and that calls
    // /api/orders/[id], which still returns them.
    const orders = await Order.find(query)
      .select('-pickupPhotos')
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