import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'
import Customer from '@/models/Customer'
import Partner from '@/models/Partner'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    
    // Build date filter
    const dateFilter: any = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate + 'T23:59:59.999Z')
    
    const orderFilter = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}
    
    // Fetch orders with customer and partner data
    const orders = await Order.find(orderFilter)
      .populate('customerId', 'name mobile')
      .populate('partnerId', 'name')
      .sort({ createdAt: -1 })
    
    // Calculate stats
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    const activePartners = await Partner.countDocuments({ isActive: true })
    
    // Calculate average delivery time
    const deliveredOrders = orders.filter(order => order.status === 'delivered' && order.deliveredAt && order.createdAt)
    const avgDeliveryTime = deliveredOrders.length > 0 
      ? Math.round(deliveredOrders.reduce((sum, order) => {
          const deliveryTime = new Date(order.deliveredAt).getTime() - new Date(order.createdAt).getTime()
          return sum + (deliveryTime / (1000 * 60)) // Convert to minutes
        }, 0) / deliveredOrders.length)
      : 0
    
    // Generate orders trend (last 7 days or date range)
    const trendDays = 7
    const ordersTrend = []
    for (let i = trendDays - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayOrders = orders.filter(order => 
        order.createdAt.toISOString().split('T')[0] === dateStr
      )
      
      ordersTrend.push({
        date: dateStr,
        count: dayOrders.length,
        revenue: dayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
      })
    }
    
    // Generate revenue by day
    const revenueByDay = ordersTrend.map(day => ({
      date: day.date,
      revenue: day.revenue,
      orders: day.count
    }))
    
    // Partner performance
    const partnerStats = await Order.aggregate([
      { $match: orderFilter },
      { $group: { _id: '$partnerId', deliveries: { $sum: 1 } } },
      { $lookup: { from: 'partners', localField: '_id', foreignField: '_id', as: 'partner' } },
      { $sort: { deliveries: -1 } },
      { $limit: 10 }
    ])
    
    // Loyalty data (mock for now)
    const totalCustomers = await Customer.countDocuments()
    
    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalOrders,
          totalRevenue,
          activePartners,
          avgDeliveryTime: `${avgDeliveryTime} mins`
        },
        ordersTrend,
        revenueByDay,
        partnerPerformance: partnerStats,
        orders // Include orders for export
      }
    })
    
  } catch (error) {
    console.error('Reports API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch reports data' }, { status: 500 })
  }
}