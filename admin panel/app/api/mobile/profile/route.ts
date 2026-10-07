import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Customer from '@/models/Customer'
import WalletSettings from '@/models/WalletSettings'
import { persistImageFields } from '@/lib/imageStore'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json({ success: false, error: 'Customer ID required' }, { status: 400 })
    }

    const customer: any = await Customer.findById(customerId).lean()
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
    }
    
    // Ensure dueAmount is included
    const customerData = {
      ...customer,
      dueAmount: customer.dueAmount || 0
    }

    return NextResponse.json({ success: true, data: customerData })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Profile creation API called')
    await dbConnect()
    console.log('Database connected')
    
    const body = await request.json()
    console.log('Profile creation data:', body)

    // Match ONLY this person's own record.
    // This used to also match { mobile: /^google_/ }, which could return a completely
    // unrelated Google user — the new signup then took over that account, wallet included.
    const identityMatches: any[] = []
    if (body.customerId) identityMatches.push({ _id: body.customerId })
    if (body.mobile) identityMatches.push({ mobile: body.mobile })
    if (body.email) identityMatches.push({ email: body.email })

    const existingCustomer = identityMatches.length > 0
      ? await Customer.findOne({ $or: identityMatches })
      : null
    
    if (existingCustomer) {
      // Update existing customer
      const updatedCustomer = await Customer.findByIdAndUpdate(
        existingCustomer._id,
        { 
          name: body.name,
          email: body.email,
          mobile: body.mobile,
          referredBy: body.referralCode || existingCustomer.referredBy,
          updatedAt: new Date() 
        },
        { new: true }
      )
      console.log('Updated existing customer:', updatedCustomer)
      return NextResponse.json({ success: true, data: { customerId: updatedCustomer._id, ...updatedCustomer.toObject() } })
    } else {
      // New customer. No signup bonus: loyalty points were removed from the
      // product, so the Urban Steam Wallet is the only value a customer holds.
      const customerData: any = {
        name: body.name,
        email: body.email,
        mobile: body.mobile,
        address: [],
        paymentMethods: [],
        walletBalance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      // Referrals are still tracked, they just no longer pay out points
      if (body.referralCode) {
        const referrer = await Customer.findOne({ 'referralCodes.code': body.referralCode, 'referralCodes.used': false })
        if (referrer) {
          customerData.referredBy = body.referralCode
          
          const codeIndex = referrer.referralCodes.findIndex((c: any) => c.code === body.referralCode && !c.used)
          if (codeIndex !== -1) {
            referrer.referralCodes[codeIndex].used = true
            referrer.referralCodes[codeIndex].usedBy = body.name
            referrer.referralCodes[codeIndex].usedAt = new Date()
            await referrer.save()
          }
        }
      }
      
      const customer = new Customer(customerData)
      const savedCustomer = await customer.save()
      console.log('Created new customer:', savedCustomer)
      return NextResponse.json({ success: true, data: { customerId: savedCustomer._id, ...savedCustomer.toObject() } })
    }
  } catch (error: any) {
    console.error('Profile creation error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create profile: ' + error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('Profile update API called')
    await dbConnect()
    console.log('Database connected')
    
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const body = await request.json()
    
    console.log('Customer ID:', customerId)
    console.log('Update data:', body)

    if (!customerId) {
      return NextResponse.json({ success: false, error: 'Customer ID required' }, { status: 400 })
    }

    // Only profile fields may be set from the app. Money and loyalty fields
    // (walletBalance, loyaltyPoints, dueAmount, totalSpend, usedVouchers, referralCodes)
    // are deliberately NOT accepted here — they are changed by the server alone.
    const EDITABLE_FIELDS = ['name', 'email', 'mobile', 'profileImage', 'address', 'paymentMethods', 'referredBy']
    const safeUpdate: any = { updatedAt: new Date() }
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) safeUpdate[field] = body[field]
    }
    // A profile photo picked in the app arrives as a base64 data URL; keep the
    // file on disk and only the URL on the customer.
    await persistImageFields(safeUpdate, ['profileImage'])

    const ignored = Object.keys(body).filter(k => !EDITABLE_FIELDS.includes(k))
    if (ignored.length > 0) console.warn('Profile update ignored non-editable fields:', ignored)

    // No upsert: an unknown id must be an error, never a brand new customer record
    const customer = await Customer.findByIdAndUpdate(
      customerId,
      { $set: safeUpdate },
      { new: true }
    )

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
    }

    console.log('Updated customer:', customer._id)

    return NextResponse.json({ success: true, data: customer })
  } catch (error: any) {
    console.error('Profile update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update profile: ' + error.message }, { status: 500 })
  }
}