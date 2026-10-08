import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Customer from '@/models/Customer'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log('Starting login process...')
    await dbConnect()
    console.log('Database connected')
    
    const { mobile } = await request.json()
    console.log('Mobile number received:', mobile)

    let customer = await Customer.findOne({ mobile })
    console.log('Customer found:', customer ? 'Yes' : 'No')
    
    let isExistingUser = false
    
    if (!customer) {
      customer = await Customer.create({
        mobile,
        name: '',
        isActive: true
      })
      console.log('New customer created:', customer._id)
    } else {
      // "Existing" has to mean the person actually finished signing up, not
      // merely that a row exists. The row is created the moment a number is
      // verified, before they have given a name, so anyone who closed the app
      // on the name screen would otherwise be sent straight to Home and never
      // asked for a name again. Sending them back to the profile screen just
      // fills in the record they already have.
      isExistingUser = Boolean((customer.name || '').trim())
      console.log('Existing customer found, profile complete:', isExistingUser)
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    console.log('OTP generated:', otp)
    
    return NextResponse.json({
      success: true,
      data: {
        customerId: customer._id,
        otp,
        message: 'OTP sent successfully',
        isExistingUser,
        customer: customer
      }
    })
  } catch (error) {
    console.error('Login API Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Login failed' 
    }, { status: 500 })
  }
}