import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Partner from '@/models/Partner'
import { persistImageFields } from '@/lib/imageStore'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partnerId')

    if (!partnerId) {
      return NextResponse.json({ success: false, error: 'Partner ID required' }, { status: 400 })
    }

    const partner = await Partner.findById(partnerId)
    if (!partner) {
      return NextResponse.json({ success: false, error: 'Partner not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: partner })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const body = await request.json()
    await persistImageFields(body, ['profileImage', 'aadharImage', 'drivingLicenseImage'])

    // Match ONLY this partner's own record. The old { mobile: /^google_/ } clause could
    // return an unrelated Google partner, letting one signup take over another's account.
    const identityMatches: any[] = []
    if (body.partnerId) identityMatches.push({ _id: body.partnerId })
    if (body.mobile) identityMatches.push({ mobile: body.mobile })
    if (body.email) identityMatches.push({ email: body.email })

    const existingPartner = identityMatches.length > 0
      ? await Partner.findOne({ $or: identityMatches })
      : null
    
    if (existingPartner) {
      const updatedPartner = await Partner.findByIdAndUpdate(
        existingPartner._id,
        { ...body, updatedAt: new Date() },
        { new: true }
      )
      return NextResponse.json({ success: true, data: updatedPartner })
    } else {
      const partner = new Partner({
        ...body,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      const savedPartner = await partner.save()
      return NextResponse.json({ success: true, data: savedPartner })
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to create profile: ' + error.message }, { status: 500 })
  }
}