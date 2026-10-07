import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import TimeSlot from '@/models/TimeSlot'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const day = searchParams.get('day')                 // 'today' | 'tomorrow' (older app builds)
    const dayOffset = searchParams.get('dayOffset')     // '0'..'3' - days from today
    const serviceType = searchParams.get('serviceType') // 'standard' | 'express'
    const admin = searchParams.get('admin')             // 'true' to get all slots

    if (admin === 'true') {
      const timeSlots = await TimeSlot.find({}).sort({ order: 1, createdAt: 1 })
      return NextResponse.json({ success: true, data: timeSlots })
    }

    const query: any = { isActive: true }

    // dayOffset is what the current app sends; day= is kept so builds already on
    // people's phones carry on working untouched.
    const offset = dayOffset !== null ? Number(dayOffset) : (day === 'tomorrow' ? 1 : day === 'today' ? 0 : null)

    if (offset === 0) {
      query.availableFor = { $in: ['today', 'both'] }
    } else if (offset !== null && offset >= 1) {
      query.availableFor = { $in: ['tomorrow', 'both'] }
      query.$or = [
        { maxDaysAhead: { $exists: false } },
        { maxDaysAhead: { $gte: offset } },
      ]
    }

    if (serviceType === 'standard' || serviceType === 'express') {
      query.serviceType = { $in: [serviceType, 'both'] }
    }

    const timeSlots = await TimeSlot.find(query).sort({ order: 1, createdAt: 1 })
    return NextResponse.json({ success: true, data: timeSlots })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch time slots' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const { time, type, availableFor, serviceType, maxDaysAhead } = await request.json()

    if (!time || !type) {
      return NextResponse.json({ success: false, error: 'Time and type are required' }, { status: 400 })
    }

    const lastSlot = await TimeSlot.findOne().sort({ order: -1 })
    const order = lastSlot ? lastSlot.order + 1 : 0

    const timeSlot = await TimeSlot.create({
      time,
      type,
      availableFor: availableFor || 'both',
      serviceType: serviceType || 'both',
      maxDaysAhead: Number(maxDaysAhead) > 0 ? Number(maxDaysAhead) : 4,
      order,
    })
    return NextResponse.json({ success: true, data: timeSlot }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create time slot' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()
    const { time, type, isActive, availableFor, serviceType, maxDaysAhead } = body

    const updateData: any = {}
    if (time !== undefined) updateData.time = time
    if (type !== undefined) updateData.type = type
    if (isActive !== undefined) updateData.isActive = isActive
    if (availableFor !== undefined) updateData.availableFor = availableFor
    if (serviceType !== undefined) updateData.serviceType = serviceType
    if (maxDaysAhead !== undefined) updateData.maxDaysAhead = Number(maxDaysAhead) > 0 ? Number(maxDaysAhead) : 4

    const timeSlot = await TimeSlot.findByIdAndUpdate(id, updateData, { new: true })
    return NextResponse.json({ success: true, data: timeSlot })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update time slot' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    await TimeSlot.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete time slot' }, { status: 500 })
  }
}
