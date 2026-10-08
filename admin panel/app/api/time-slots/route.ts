import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import TimeSlot from '@/models/TimeSlot'

// Slot labels are free text an admin types, so they arrive in several shapes:
// "9:00 AM", "1-2pm", "10:00 AM - 12:00 PM". This pulls the start of the window
// out as minutes since midnight.
function slotStartMinutes(label: string): number | null {
  const matches = [...String(label).matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi)]
    .filter((m) => m[3] || m[2] || /\d/.test(m[1]))
  if (matches.length === 0) return null

  const first = matches[0]
  // A start with no am/pm ("1-2pm") borrows the period from the end of the range
  const period = (first[3] || matches[matches.length - 1][3] || '').toLowerCase()

  let hour = parseInt(first[1], 10)
  const minute = first[2] ? parseInt(first[2], 10) : 0
  if (Number.isNaN(hour)) return null

  if (period === 'pm' && hour !== 12) hour += 12
  if (period === 'am' && hour === 12) hour = 0

  return hour * 60 + minute
}

// Order by the clock, not by when the slot happened to be created. The stored
// `order` only ever counted upwards as slots were added, so a 5:00 PM window
// added after 6:30 PM sat below it in every list the customer sees. Labels that
// cannot be read fall back to that stored order and sit at the end.
function byClock<T extends { time: string; order?: number; createdAt?: Date }>(slots: T[]): T[] {
  return [...slots].sort((a, b) => {
    const ma = slotStartMinutes(a.time)
    const mb = slotStartMinutes(b.time)
    if (ma !== null && mb !== null && ma !== mb) return ma - mb
    if (ma === null && mb !== null) return 1
    if (mb === null && ma !== null) return -1
    return (a.order ?? 0) - (b.order ?? 0)
  })
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const day = searchParams.get('day')                 // 'today' | 'tomorrow' (older app builds)
    const dayOffset = searchParams.get('dayOffset')     // '0'..'3' - days from today
    const serviceType = searchParams.get('serviceType') // 'standard' | 'express'
    const admin = searchParams.get('admin')             // 'true' to get all slots

    if (admin === 'true') {
      const timeSlots = await TimeSlot.find({}).sort({ order: 1, createdAt: 1 }).lean()
      return NextResponse.json({ success: true, data: byClock(timeSlots as any) })
    }

    const query: any = { isActive: true }

    // dayOffset is what the current app sends; day= is kept so builds already on
    // people's phones carry on working untouched.
    const offset = dayOffset !== null ? Number(dayOffset) : (day === 'tomorrow' ? 1 : day === 'today' ? 0 : null)

    // Settings added after a slot was saved are simply absent on that document,
    // and an absent field matches no $in. Each one therefore has to allow for
    // the field not being there at all, or older slots quietly vanish from the
    // app -- which is what happened when Express got its own shifts: every slot
    // predating serviceType stopped being offered to anybody.
    const conditions: any[] = []

    if (offset === 0) {
      query.availableFor = { $in: ['today', 'both'] }
    } else if (offset !== null && offset >= 1) {
      query.availableFor = { $in: ['tomorrow', 'both'] }
      conditions.push({
        $or: [
          { maxDaysAhead: { $exists: false } },
          { maxDaysAhead: { $gte: offset } },
        ],
      })
    }

    if (serviceType === 'standard' || serviceType === 'express') {
      conditions.push({
        $or: [
          { serviceType: { $exists: false } },
          { serviceType: { $in: [serviceType, 'both'] } },
        ],
      })
    }

    if (conditions.length > 0) query.$and = conditions

    const timeSlots = await TimeSlot.find(query).sort({ order: 1, createdAt: 1 }).lean()
    return NextResponse.json({ success: true, data: byClock(timeSlots as any) })
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
