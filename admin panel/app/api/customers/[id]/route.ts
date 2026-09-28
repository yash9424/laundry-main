import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Customer from '@/models/Customer'
import { persistImageFields } from '@/lib/imageStore'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect()
    const { id } = await params
    const customer = await Customer.findById(id)
    
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: customer })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch customer' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect()
    const { id } = await params
    const updateData = await request.json()
    await persistImageFields(updateData, ['profileImage'])

    const customer = await Customer.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    )
    
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: customer })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect()
    const { id } = await params
    
    const customer = await Customer.findById(id)
    
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
    }

    // Import models
    const Order = (await import('@/models/Order')).default
    const WalletTransaction = (await import('@/models/WalletTransaction')).default
    const Review = (await import('@/models/Review')).default

    // Delete all related data
    await Promise.all([
      Order.deleteMany({ customerId: id }),
      WalletTransaction.deleteMany({ customerId: id }),
      Review.deleteMany({ customerId: id })
    ])

    // Delete customer
    await Customer.findByIdAndDelete(id)

    return NextResponse.json({ success: true, message: 'Customer and all related data deleted successfully' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}