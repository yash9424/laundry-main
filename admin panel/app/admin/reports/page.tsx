'use client'

import { useState, useEffect } from 'react'
import ResponsiveLayout from '../../components/ResponsiveLayout'

export default function ReportsPage() {
  const [data, setData] = useState<{
    stats: { totalOrders: number; totalRevenue: number; activePartners: number; activeCustomers: number; avgDeliveryTime: string };
    ordersTrend: any[];
    revenueByDay: any[];
    partnerPerformance: any[];
  }>({
    stats: { totalOrders: 0, totalRevenue: 0, activePartners: 0, activeCustomers: 0, avgDeliveryTime: '0 mins' },
    ordersTrend: [],
    revenueByDay: [],
    partnerPerformance: [],
  })
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [hoveredData, setHoveredData] = useState<any>(null)
  const [exportModal, setExportModal] = useState(false)
  const [exportType, setExportType] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showFromCalendar, setShowFromCalendar] = useState(false)
  const [showToCalendar, setShowToCalendar] = useState(false)

  useEffect(() => {
    fetchReportsData()
  }, [fromDate, toDate])

  const fetchReportsData = async () => {
    setLoading(true)
    try {
      let url = '/api/reports'
      if (fromDate || toDate) {
        const params = new URLSearchParams()
        if (fromDate) {
          const convertedDate = fromDate.split('-').reverse().join('-')
          params.append('fromDate', convertedDate)
        }
        if (toDate) {
          const convertedDate = toDate.split('-').reverse().join('-')
          params.append('toDate', convertedDate)
        }
        url += `?${params.toString()}`
      }
      const response = await fetch(url)
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Error fetching reports data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateToDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  const handleDateSelect = (dateStr: string, isFromDate: boolean) => {
    const formatted = formatDateToDDMMYYYY(dateStr)
    if (isFromDate) {
      setFromDate(formatted)
      setShowFromCalendar(false)
    } else {
      setToDate(formatted)
      setShowToCalendar(false)
    }
  }

  const handleExport = async (type: string, period: string) => {
    try {
      let fromDateParam = ''
      let toDateParam = ''
      
      if (period === 'custom') {
        if (!fromDate || !toDate) {
          alert('Please select both from and to dates for custom range')
          return
        }
        fromDateParam = fromDate
        toDateParam = toDate
      } else if (period === 'month') {
        const firstDay = new Date(selectedYear, selectedMonth - 1, 1)
        const lastDay = new Date(selectedYear, selectedMonth, 0)
        fromDateParam = firstDay.toISOString().split('T')[0]
        toDateParam = lastDay.toISOString().split('T')[0]
      } else if (period === 'year') {
        const firstDay = new Date(selectedYear, 0, 1)
        const lastDay = new Date(selectedYear, 11, 31)
        fromDateParam = firstDay.toISOString().split('T')[0]
        toDateParam = lastDay.toISOString().split('T')[0]
      } else if (period === 'all') {
        // All time - no date filters
        fromDateParam = ''
        toDateParam = ''
      }
      
      const params = new URLSearchParams()
      if (fromDateParam) params.append('fromDate', fromDateParam)
      if (toDateParam) params.append('toDate', toDateParam)
      
      const response = await fetch(`/api/reports/export?${params.toString()}`)
      const result = await response.json()
      
      if (result.success) {
        if (type === 'csv') {
          const csvContent = generateCSV(result.data)
          downloadFile(csvContent, `laundry_report_${period}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
        } else {
          // Generate actual PDF
          generateAndDownloadPDF(result.data, period)
        }
      } else {
        alert('Export failed: ' + result.error)
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
    setExportModal(false)
  }

  const generateCSV = (data: any) => {
    const headers = [
      'Order ID', 'Customer Name', 'Customer Mobile', 'Customer Email', 'Customer Total Spend',
      'Partner Name', 'Partner Mobile', 'Order Date', 'Order Time', 'Order Amount',
      'Payment Method', 'Payment Status', 'Order Status', 'Items', 'Pickup Address', 'Delivery Address',
      'Pickup Slot', 'Delivery Slot', 'Special Instructions', 'Delivery Fee', 'Discount', 'Tax'
    ]
    
    let csvContent = headers.join(',') + '\n'
    
    // Add summary stats first
    csvContent += '\n=== SUMMARY STATISTICS ===\n'
    csvContent += `Total Orders,${data.stats.totalOrders}\n`
    csvContent += `Total Revenue,${data.stats.totalRevenue}\n`
    csvContent += `Total Customers,${data.stats.totalCustomers}\n`
    csvContent += `Active Partners,${data.stats.activePartners}\n`
    csvContent += `Average Order Value,${data.stats.avgOrderValue}\n`
    csvContent += `Completed Orders,${data.stats.completedOrders}\n`
    csvContent += `Pending Orders,${data.stats.pendingOrders}\n`
    csvContent += `Cancelled Orders,${data.stats.cancelledOrders}\n`
    csvContent += '\n=== ORDER DETAILS ===\n'
    csvContent += headers.join(',') + '\n'
    
    data.orders.forEach((order: any) => {
      const row = [
        order.orderId || '',
        `"${order.customerName || ''}"`,
        order.customerMobile || '',
        order.customerEmail || '',
        order.customerTotalSpend || 0,
        `"${order.partnerName || ''}"`,
        order.partnerMobile || '',
        order.orderDate || '',
        order.orderTime || '',
        order.orderAmount || 0,
        order.paymentMethod || '',
        order.paymentStatus || '',
        order.orderStatus || '',
        `"${order.items || ''}"`,
        `"${order.pickupAddress || ''}"`,
        `"${order.deliveryAddress || ''}"`,
        order.pickupSlot || '',
        order.deliverySlot || '',
        `"${order.specialInstructions || ''}"`,
        order.deliveryFee || 0,
        order.discount || 0,
        order.tax || 0
      ]
      csvContent += row.join(',') + '\n'
    })
    
    return csvContent
  }

  const generateAndDownloadPDF = (data: any, period: string) => {
    // Create HTML content for PDF
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Laundry Management Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #2563eb; }
        .stat-label { color: #6b7280; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #f8fafc; font-weight: bold; }
        .section-title { font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🧺 Urban Steam - Laundry Management Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <p>Period: ${period === 'all' ? 'All Time' : period === 'month' ? 'Current Month' : period === 'year' ? 'Current Year' : 'Custom Range'}</p>
      </div>
      
      <div class="stats">
        <div class="stat-card">
          <div class="stat-value">${data.stats.totalOrders}</div>
          <div class="stat-label">Total Orders</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">₹${data.stats.totalRevenue.toLocaleString()}</div>
          <div class="stat-label">Total Revenue</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.stats.totalCustomers}</div>
          <div class="stat-label">Total Customers</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.stats.activePartners}</div>
          <div class="stat-label">Active Partners</div>
        </div>
      </div>
      
      <div class="section-title">📋 Order Details</div>
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Mobile</th>
            <th>Partner</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Payment</th>
          </tr>
        </thead>
        <tbody>
          ${data.orders.map((order: any) => `
            <tr>
              <td>${order.orderId}</td>
              <td>${order.customerName}</td>
              <td>${order.customerMobile}</td>
              <td>${order.partnerName}</td>
              <td>${order.orderDate}</td>
              <td>₹${order.orderAmount}</td>
              <td>${order.orderStatus}</td>
              <td>${order.paymentStatus}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
    `
    
    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laundry_report_${period}_${new Date().toISOString().split('T')[0]}.html`
    a.click()
    window.URL.revokeObjectURL(url)
    
    // Also trigger print dialog for PDF conversion
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const renderOrdersTrend = () => {
    if (loading || !data.ordersTrend.length) {
      return (
        <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
          <div>Loading trend data...</div>
        </div>
      )
    }
    
    const maxOrders = Math.max(...data.ordersTrend.map(d => d.count))
    const points = data.ordersTrend.map((d, i) => {
      const x = 40 + (i * (320 / (data.ordersTrend.length - 1)))
      const y = 160 - (d.count / maxOrders) * 120
      return `${x},${y}`
    }).join(' ')
    
    return (
      <div style={{ position: 'relative', height: '200px' }}>
        <svg width="100%" height="200" viewBox="0 0 400 200" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', borderRadius: '8px' }}>
          <defs>
            <linearGradient id="orderGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          <polyline points={`40,160 ${points} ${360},160`} fill="url(#orderGradient)" stroke="none"/>
          <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round"/>
          {data.ordersTrend.map((d, i) => {
            const x = 40 + (i * (320 / (data.ordersTrend.length - 1)))
            const y = 160 - (d.count / maxOrders) * 120
            return (
              <circle 
                key={i} 
                cx={x} 
                cy={y} 
                r="4" 
                fill="#3b82f6" 
                stroke="white" 
                strokeWidth="2"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredData({ type: 'orders', data: d, x, y })}
                onMouseLeave={() => setHoveredData(null)}
              />
            )
          })}
        </svg>
        {hoveredData?.type === 'orders' && (
          <div style={{
            position: 'absolute',
            left: hoveredData.x - 50,
            top: hoveredData.y - 40,
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <div>Date: {hoveredData.data.date}</div>
            <div>Orders: {hoveredData.data.count}</div>
            <div>Revenue: ₹{hoveredData.data.revenue || 0}</div>
          </div>
        )}
        <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.9)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#6b7280' }}>
          📈 {data.ordersTrend.length} days
        </div>
      </div>
    )
  }

  const renderRevenueByDay = () => {
    if (loading || !data.revenueByDay.length) {
      return (
        <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
          <div>Loading revenue data...</div>
        </div>
      )
    }
    
    const maxRevenue = Math.max(...data.revenueByDay.map(d => d.revenue))
    
    return (
      <div style={{ position: 'relative', height: '200px' }}>
        <svg width="100%" height="200" viewBox="0 0 400 200" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', borderRadius: '8px' }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.3"/>
            </linearGradient>
          </defs>
          {data.revenueByDay.map((d, i) => {
            const height = (d.revenue / maxRevenue) * 140
            const x = 40 + (i * (320 / data.revenueByDay.length))
            const width = Math.max(20, 320 / data.revenueByDay.length - 5)
            return (
              <rect 
                key={i} 
                x={x} 
                y={160 - height} 
                width={width} 
                height={height} 
                fill="url(#revenueGradient)" 
                rx="2"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredData({ type: 'revenue', data: d, x: x + width/2, y: 160 - height })}
                onMouseLeave={() => setHoveredData(null)}
              />
            )
          })}
        </svg>
        {hoveredData?.type === 'revenue' && (
          <div style={{
            position: 'absolute',
            left: hoveredData.x - 50,
            top: hoveredData.y - 40,
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <div>Date: {hoveredData.data.date}</div>
            <div>Revenue: ₹{hoveredData.data.revenue.toLocaleString()}</div>
            <div>Orders: {hoveredData.data.orders || 0}</div>
          </div>
        )}
        <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.9)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#6b7280' }}>
          💵 ₹{data.revenueByDay.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}
        </div>
      </div>
    )
  }

  const renderPartnerPerformance = () => {
    if (loading || !data.partnerPerformance.length) {
      return (
        <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚚</div>
          <div>Loading partner data...</div>
        </div>
      )
    }
    
    const maxDeliveries = Math.max(...data.partnerPerformance.map(p => p.deliveries))
    
    return (
      <div style={{ position: 'relative', height: '200px', background: 'linear-gradient(135deg, #fef7ff 0%, #f3e8ff 100%)', borderRadius: '8px', padding: '20px' }}>
        <svg width="100%" height="160" viewBox="0 0 400 160">
          <defs>
            <linearGradient id="partnerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4"/>
            </linearGradient>
          </defs>
          {data.partnerPerformance.slice(0, 6).map((partner, i) => {
            const width = (partner.deliveries / maxDeliveries) * 300
            const y = 10 + (i * 25)
            return (
              <g key={i}>
                <rect x="80" y={y} width={width} height="18" fill="url(#partnerGradient)" rx="9"/>
                <text x="5" y={y + 13} fontSize="11" fill="#6b7280" fontWeight="500">
                  {partner.partner?.[0]?.name?.substring(0, 10) || `Partner ${i + 1}`}
                </text>
                <text x={85 + width} y={y + 13} fontSize="10" fill="#8b5cf6" fontWeight="600">
                  {partner.deliveries}
                </text>
              </g>
            )
          })}
        </svg>
        <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.9)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#6b7280' }}>
          🏆 Top {data.partnerPerformance.length}
        </div>
      </div>
    )
  }

  return (
    <ResponsiveLayout activePage="Reports" title="Reports & Analytics">
      <div style={{ backgroundColor: 'white', padding: '1rem 2rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>From:</span>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="DD-MM-YYYY"
              value={fromDate}
              onClick={() => setShowFromCalendar(!showFromCalendar)}
              readOnly
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                outline: 'none',
                fontSize: '0.9rem',
                width: '120px',
                cursor: 'pointer',
                backgroundColor: 'white'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            {showFromCalendar && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                zIndex: 1000,
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                padding: '0.5rem'
              }}>
                <input
                  type="date"
                  onChange={(e) => handleDateSelect(e.target.value, true)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    padding: '0.5rem'
                  }}
                />
                <button
                  onClick={() => {
                    setFromDate('')
                    setShowFromCalendar(false)
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.25rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    marginTop: '0.25rem'
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          <span style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>To:</span>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="DD-MM-YYYY"
              value={toDate}
              onClick={() => setShowToCalendar(!showToCalendar)}
              readOnly
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                outline: 'none',
                fontSize: '0.9rem',
                width: '120px',
                cursor: 'pointer',
                backgroundColor: 'white'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            {showToCalendar && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                zIndex: 1000,
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                padding: '0.5rem'
              }}>
                <input
                  type="date"
                  onChange={(e) => handleDateSelect(e.target.value, false)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    padding: '0.5rem'
                  }}
                />
                <button
                  onClick={() => {
                    setToDate('')
                    setShowToCalendar(false)
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.25rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    marginTop: '0.25rem'
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => { setExportType('pdf'); setExportModal(true) }}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#dc2626', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            📄 Export PDF
          </button>
          <button 
            onClick={() => { setExportType('csv'); setExportModal(true) }}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#059669', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            📊 Export CSV
          </button>
        </div>
      </div>
        
        <div style={{ padding: '1.5rem' }}>
          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Orders</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{loading ? '...' : data.stats.totalOrders.toLocaleString()}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Revenue</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{loading ? '...' : `₹${data.stats.totalRevenue.toLocaleString()}`}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Active Partners</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{loading ? '...' : data.stats.activePartners.toLocaleString()}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Active Customers</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{loading ? '...' : (data.stats.activeCustomers || 0).toLocaleString()}</div>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Average Delivery Time</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{loading ? '...' : data.stats.avgDeliveryTime}</div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>📈 Orders Trend</h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '12px' }}>Real-time</div>
              </div>
              {renderOrdersTrend()}
            </div>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>💰 Revenue by Day</h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '12px' }}>Live</div>
              </div>
              {renderRevenueByDay()}
            </div>
          </div>

          {/* Charts Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>🚚 Partner Performance</h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '12px' }}>Updated</div>
              </div>
              {renderPartnerPerformance()}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
              📊 Real-time analytics • Auto-refresh every 30 seconds
            </div>
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>

          {/* Export Modal */}
          {exportModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '500px', width: '90%' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Export {exportType.toUpperCase()} Report</h3>
                <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>Select the time period for your report:</p>
                
                {/* Month and Year Selectors */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: '#374151' }}>Month:</label>
                    <select 
                      value={selectedMonth} 
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                    >
                      <option value={1}>January</option>
                      <option value={2}>February</option>
                      <option value={3}>March</option>
                      <option value={4}>April</option>
                      <option value={5}>May</option>
                      <option value={6}>June</option>
                      <option value={7}>July</option>
                      <option value={8}>August</option>
                      <option value={9}>September</option>
                      <option value={10}>October</option>
                      <option value={11}>November</option>
                      <option value={12}>December</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: '#374151' }}>Year:</label>
                    <select 
                      value={selectedYear} 
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                    >
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - 5 + i
                        return <option key={year} value={year}>{year}</option>
                      })}
                    </select>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <button 
                    onClick={() => handleExport(exportType, 'custom')}
                    disabled={!fromDate || !toDate}
                    style={{ 
                      padding: '0.75rem 1rem', 
                      backgroundColor: (!fromDate || !toDate) ? '#d1d5db' : '#f3f4f6', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '6px', 
                      cursor: (!fromDate || !toDate) ? 'not-allowed' : 'pointer', 
                      textAlign: 'left',
                      opacity: (!fromDate || !toDate) ? 0.5 : 1
                    }}
                  >
                    📅 Custom Range ({fromDate || 'Select start'} to {toDate || 'Select end'})
                  </button>
                  <button 
                    onClick={() => handleExport(exportType, 'month')}
                    style={{ padding: '0.75rem 1rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' }}
                  >
                    📊 {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </button>
                  <button 
                    onClick={() => handleExport(exportType, 'year')}
                    style={{ padding: '0.75rem 1rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' }}
                  >
                    📈 Year {selectedYear}
                  </button>
                  <button 
                    onClick={() => handleExport(exportType, 'all')}
                    style={{ padding: '0.75rem 1rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' }}
                  >
                    🗂️ All Time Data
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => setExportModal(false)} 
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Close calendars when clicking outside */}
          {(showFromCalendar || showToCalendar) && (
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999
              }}
              onClick={() => {
                setShowFromCalendar(false)
                setShowToCalendar(false)
              }}
            />
          )}
      </div>
    </ResponsiveLayout>
  )
}