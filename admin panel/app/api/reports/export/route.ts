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
    const type = searchParams.get('type') // 'csv' or 'pdf'
    
    // Build date filter
    const dateFilter: any = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate + 'T23:59:59.999Z')
    
    const orderFilter = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}
    
    // Fetch comprehensive data
    const orders = await Order.find(orderFilter)
      .populate('customerId', 'name mobile email totalSpend')
      .populate('partnerId', 'name mobile hub')
      .sort({ createdAt: -1 })
    
    const customers = await Customer.find({})
    const partners = await Partner.find({})
    
    // Calculate comprehensive stats
    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
      totalCustomers: customers.length,
      activePartners: partners.filter(p => p.isActive).length,
      avgOrderValue: orders.length > 0 ? Math.round(orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0) / orders.length) : 0,
      completedOrders: orders.filter(o => o.status === 'delivered').length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length
    }
    
    // Detailed order data for export
    const exportData = orders.map(order => ({
      orderId: order.orderId,
      customerName: order.customerId?.name || 'Unknown',
      customerMobile: order.customerId?.mobile || 'N/A',
      customerEmail: order.customerId?.email || 'N/A',
      customerTotalSpend: order.customerId?.totalSpend || 0,
      partnerName: order.partnerId?.name || 'Not Assigned',
      partnerMobile: order.partnerId?.mobile || 'N/A',
      partnerHub: order.partnerId?.hub || 'N/A',
      orderDate: order.createdAt?.toISOString().split('T')[0] || '',
      orderTime: order.createdAt?.toTimeString().split(' ')[0] || '',
      orderAmount: order.totalAmount || 0,
      paymentMethod: order.paymentMethod || 'COD',
      paymentStatus: order.paymentStatus || 'pending',
      orderStatus: order.status || 'pending',
      items: order.items?.map((item: any) => `${item.quantity}x ${item.name}`).join(', ') || 'No items',
      pickupAddress: order.pickupAddress?.fullAddress || 'N/A',
      deliveryAddress: order.deliveryAddress?.fullAddress || 'N/A',
      pickupSlot: order.pickupSlot?.timeSlot || 'Not scheduled',
      deliverySlot: order.deliverySlot?.timeSlot || 'Not scheduled',
      specialInstructions: order.specialInstructions || 'None',
      deliveryFee: order.deliveryFee || 0,
      discount: order.discount || 0,
      tax: order.tax || 0,
      createdAt: order.createdAt?.toISOString() || '',
      updatedAt: order.updatedAt?.toISOString() || ''
    }))
    
    // Customer summary data
    const customerSummary = customers.map(customer => ({
      customerId: customer._id,
      name: customer.name || 'Unknown',
      mobile: customer.mobile || 'N/A',
      email: customer.email || 'N/A',
      totalSpend: customer.totalSpend || 0,
      totalOrders: orders.filter(o => o.customerId?._id?.toString() === customer._id.toString()).length,
      lastOrderDate: orders.find(o => o.customerId?._id?.toString() === customer._id.toString())?.createdAt?.toISOString().split('T')[0] || 'Never',
      joinDate: customer.createdAt?.toISOString().split('T')[0] || '',
      isActive: customer.isActive || false
    }))
    
    // Partner summary data
    const partnerSummary = partners.map(partner => ({
      partnerId: partner._id,
      name: partner.name || 'Unknown',
      mobile: partner.mobile || 'N/A',
      email: partner.email || 'N/A',
      hub: partner.hub || 'N/A',
      totalDeliveries: orders.filter(o => o.partnerId?._id?.toString() === partner._id.toString()).length,
      totalEarnings: orders.filter(o => o.partnerId?._id?.toString() === partner._id.toString()).reduce((sum, o) => sum + (o.deliveryFee || 0), 0),
      rating: partner.rating || 0,
      isActive: partner.isActive || false,
      joinDate: partner.createdAt?.toISOString().split('T')[0] || ''
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        stats,
        orders: exportData,
        customers: customerSummary,
        partners: partnerSummary,
        exportInfo: {
          generatedAt: new Date().toISOString(),
          dateRange: {
            from: fromDate || 'All time',
            to: toDate || 'Present'
          },
          totalRecords: {
            orders: exportData.length,
            customers: customerSummary.length,
            partners: partnerSummary.length
          }
        }
      }
    })
    
  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to export data' }, { status: 500 })
  }
}