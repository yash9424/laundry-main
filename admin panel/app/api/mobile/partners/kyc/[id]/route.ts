import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Partner from '@/models/Partner'
import { persistImageFields } from '@/lib/imageStore'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params
    const body = await request.json()
    await persistImageFields(body, ['aadharImage', 'drivingLicenseImage'])

    const partner = await Partner.findByIdAndUpdate(
      id,
      {
        vehicleType: body.vehicleType,
        vehicleNumber: body.vehicleNumber,
        aadharNumber: body.aadharNumber,
        aadharImage: body.aadharImage,
        drivingLicenseNumber: body.drivingLicenseNumber,
        drivingLicenseImage: body.drivingLicenseImage,
        kycStatus: 'pending',
        kycSubmittedAt: new Date()
      },
      { new: true }
    )
    
    if (!partner) {
      return NextResponse.json({ success: false, error: 'Partner not found' }, { status: 404, headers: corsHeaders })
    }
    
    return NextResponse.json({ success: true, data: partner }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error submitting KYC:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit KYC' }, { status: 500, headers: corsHeaders })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params
    const { action, reason } = await request.json()
    
    const updateData: any = {}
    
    if (action === 'approve') {
      updateData.kycStatus = 'approved'
      updateData.isVerified = true
      updateData.kycRejectionReason = null
    } else if (action === 'reject') {
      updateData.kycStatus = 'rejected'
      updateData.isVerified = false
      updateData.kycRejectionReason = reason
    }
    
    const partner = await Partner.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
    
    if (!partner) {
      return NextResponse.json({ success: false, error: 'Partner not found' }, { status: 404, headers: corsHeaders })
    }
    
    return NextResponse.json({ success: true, data: partner }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error updating KYC status:', error)
    return NextResponse.json({ success: false, error: 'Failed to update KYC status' }, { status: 500, headers: corsHeaders })
  }
}
