import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Partner from '@/models/Partner'
import { persistImage } from '@/lib/imageStore'

export async function GET() {
  try {
    await connectDB()
    
    // First check all partners
    const allPartners = await Partner.find({}).lean()
    console.log('Total partners in DB:', allPartners.length)
    console.log('Partners with kycStatus:', allPartners.filter(p => p.kycStatus).length)
    
    const partners = await Partner.find({
      kycStatus: { $exists: true, $ne: null }
    })
      .sort({ kycSubmittedAt: -1 })
      .lean()
    
    console.log('Found KYC partners:', partners.length)
    console.log('KYC Partners:', partners.map(p => ({ id: p._id, status: p.kycStatus })))
    
    return NextResponse.json({ success: true, data: partners })
  } catch (error) {
    console.error('Error fetching KYC partners:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch partners' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const { partnerId, vehicleType, vehicleNumber, aadharNumber, drivingLicenseNumber, aadharImage, drivingLicenseImage } = await request.json()

    // KYC scans come in as base64; store them as files and keep only the URL.
    const aadharImageUrl = await persistImage(aadharImage)
    const drivingLicenseImageUrl = await persistImage(drivingLicenseImage)

    console.log('KYC Submission - Partner ID:', partnerId)
    console.log('KYC Data:', { aadharNumber, drivingLicenseNumber, hasAadharImage: !!aadharImage, hasDLImage: !!drivingLicenseImage })

    const partner = await Partner.findByIdAndUpdate(
      partnerId,
      {
        vehicleType,
        vehicleNumber,
        aadharNumber,
        drivingLicenseNumber,
        aadharImage: aadharImageUrl,
        drivingLicenseImage: drivingLicenseImageUrl,
        kycStatus: 'pending',
        kycSubmittedAt: new Date()
      },
      { new: true }
    )
    
    if (!partner) {
      console.error('Partner not found with ID:', partnerId)
      return NextResponse.json({ success: false, error: 'Partner not found' }, { status: 404 })
    }
    
    console.log('KYC submitted successfully for partner:', partner._id)
    return NextResponse.json({ success: true, data: partner })
  } catch (error) {
    console.error('Error submitting KYC:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit KYC' }, { status: 500 })
  }
}
