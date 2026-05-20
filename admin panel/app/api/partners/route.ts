import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Partner from '@/models/Partner'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const pincode = searchParams.get('pincode')

    const query: any = { kycStatus: 'approved', isActive: true }
    if (pincode) {
      query.pincodes = pincode
    }

    const partners = await Partner.find(query)
      .select('name mobile pincodes')
      .sort({ name: 1 })

    return NextResponse.json({ success: true, data: partners })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch partners' }, { status: 500 })
  }
}
