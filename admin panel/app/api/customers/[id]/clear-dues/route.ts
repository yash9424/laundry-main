import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '../../../../../lib/mongodb'
import Customer from '../../../../../models/Customer'
import { requireAdmin } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  // Changing this is an administrator's job, and until now anybody could.
  const denied = requireAdmin(request)
  if (denied) return denied

    await dbConnect()
    const { id } = await params

    const customer = await Customer.findById(id)
    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 })
    }

    customer.dueAmount = 0
    await customer.save()

    return NextResponse.json({ success: true, message: 'Dues cleared successfully' })
  } catch (error) {
    console.error('Clear dues error:', error)
    return NextResponse.json({ success: false, message: 'Failed to clear dues' }, { status: 500 })
  }
}
