import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Customer from '@/models/Customer'
import Order from '@/models/Order'

export async function GET() {
  try {
    await dbConnect()
    const customers = await Customer.find({}).sort({ createdAt: -1 }).lean()

    // One grouped pass over the orders instead of one query per customer.
    // This used to run `Order.find({ customerId })` inside a map over every
    // customer: five hundred customers meant five hundred separate queries,
    // every one of them a full scan of every order ever placed, on each load of
    // the admin customers page. It is the heaviest thing the panel did.
    const totals = await Order.aggregate([
      {
        $group: {
          _id: '$customerId',
          totalSpend: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          lastOrderDate: { $max: '$createdAt' }
        }
      }
    ])
    const byCustomer = new Map(
      totals.map((row: any) => [String(row._id), row])
    )

    const customersWithOrderData = customers.map((customer: any) => {
      const row = byCustomer.get(String(customer._id))
      return {
        ...customer,
        totalSpend: row?.totalSpend || 0,
        totalOrders: row?.totalOrders || 0,
        lastOrderDate: row?.lastOrderDate || null
      }
    })
    
    return NextResponse.json({ success: true, data: customersWithOrderData })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch customers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const body = await request.json()
    const customer = await Customer.create(body)
    return NextResponse.json({ success: true, data: customer }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create customer' }, { status: 500 })
  }
}