import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import OrderCharges from '@/models/OrderCharges'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  await dbConnect()
  let charges = await OrderCharges.findOne()
  if (!charges) {
    charges = await OrderCharges.create({
      cancellationPercentage: 20,
      customerUnavailable: 150,
      incorrectAddress: 150,
      refusalToAccept: 150
    })
  }
  return NextResponse.json({ success: true, data: charges })
}

export async function POST(request: NextRequest) {
  // Changing this is an administrator's job, and until now anybody could.
  const denied = requireAdmin(request)
  if (denied) return denied

  await dbConnect()
  const body = await request.json()
  console.log('Received body:', body)
  let charges = await OrderCharges.findOne()
  console.log('Existing charges:', charges)
  if (charges) {
    charges = await OrderCharges.findByIdAndUpdate(charges._id, { ...body, updatedAt: new Date() }, { new: true })
    console.log('Updated charges:', charges)
  } else {
    charges = await OrderCharges.create(body)
    console.log('Created charges:', charges)
  }
  return NextResponse.json({ success: true, data: charges })
}
