'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ResponsiveLayout from '../../components/ResponsiveLayout'
import Modal from '../../components/Modal'

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [filteredOrders, setFilteredOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' as 'info' | 'success' | 'error' | 'confirm', onConfirm: () => {} })
  const [showFromCalendar, setShowFromCalendar] = useState(false)
  const [showToCalendar, setShowToCalendar] = useState(false)

  const statusFilters = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Picked Up', value: 'picked_up' },
    { label: 'At Hub', value: 'delivered_to_hub' },
    { label: 'Out for Delivery', value: 'out_for_delivery' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Delivery Failed', value: 'delivery_failed' },
    { label: 'Suspended', value: 'suspended' },
    { label: 'Cancelled', value: 'cancelled' }
  ]

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [orders, activeFilter, fromDate, toDate, searchQuery])

  const fetchOrders = async () => {
    try {
      const userData = localStorage.getItem('adminUser')
      let url = '/api/orders'
      
      if (userData) {
        const user = JSON.parse(userData)
        if (user.role === 'Store Manager') {
          // Fetch latest user data from database to get current hub
          const userResponse = await fetch(`/api/admin-users?email=${encodeURIComponent(user.email)}`)
          const userDataFromDB = await userResponse.json()
          
          if (userDataFromDB.success && userDataFromDB.data.length > 0) {
            const currentUser = userDataFromDB.data[0]
            if (currentUser.hub) {
              url = `/api/orders?hub=${encodeURIComponent(currentUser.hub)}`
              console.log('Store Manager fetching orders for hub:', currentUser.hub)
            }
          }
        }
      }
      
      const response = await fetch(url)
      const data = await response.json()
      
      console.log('Orders fetched:', data.data?.length || 0)
      
      if (data.success) {
        // Sort orders by creation date (most recent first)
        const sortedOrders = data.data.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setOrders(sortedOrders)
        setFilteredOrders(sortedOrders)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }



  const applyFilters = () => {
    let filtered = [...orders]

    // Status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(order => order.status === activeFilter)
    }

    // Date range filter
    if (fromDate || toDate) {
      filtered = filtered.filter((order: any) => {
        const orderDate = new Date(order.createdAt)
        const from = fromDate ? new Date(fromDate.split('-').reverse().join('-')) : null
        const to = toDate ? new Date(toDate.split('-').reverse().join('-')) : null
        
        if (from && orderDate < from) return false
        if (to && orderDate > to) return false
        return true
      })
    }

    // Search filter (customer name and mobile)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((order: any) => {
        const customerName = (order.customerId?.name || '').toLowerCase()
        const customerMobile = (order.customerId?.mobile || '').toLowerCase()
        const orderId = (order.orderId || '').toLowerCase()
        return customerName.includes(query) || customerMobile.includes(query) || orderId.includes(query)
      })
    }

    // Keep most recent orders at top after filtering
    filtered.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    setFilteredOrders(filtered)
  }

  const formatOrderForDisplay = (order: any) => {
    const formatStatus = (status: string) => {
      return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }
    
    const formatPaymentStatus = (status: string) => {
      return status.charAt(0).toUpperCase() + status.slice(1)
    }
    
    const formatDate = (dateString: string) => {
      if (!dateString) return 'N/A'
      const date = new Date(dateString)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}-${month}-${year}`
    }
    
    return {
      id: order.orderId,
      customer: order.customerId?.name || 'Unknown Customer',
      mobile: order.customerId?.mobile || 'N/A',
      items: order.items?.map((item: any) => `${item.quantity} ${item.name}`).join(', ') || 'No items',
      price: `₹${order.totalAmount}`,
      status: formatStatus(order.status),
      paymentMethod: order.paymentMethod || 'Cash on Delivery',
      paymentStatus: formatPaymentStatus(order.paymentStatus || 'pending'),
      partner: order.partnerId?.name || 'Not Assigned',
      time: order.pickupSlot?.timeSlot || 'Not Scheduled',
      date: formatDate(order.createdAt)
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

  return (
    <ResponsiveLayout activePage="Orders" title="Orders Management" searchPlaceholder="Search by Order ID / Customer">
        {/* Orders Content */}
        <div style={{ padding: '1.5rem' }}>
          {/* Search Bar */}
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Search by Order ID, Customer Name, or Mobile Number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                outline: 'none',
                fontSize: '0.9rem'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          {/* Bulk Delete Button */}
          {selectedOrders.length > 0 && (
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                {selectedOrders.length} order(s) selected
              </span>
              <button
                onClick={() => {
                  setModal({
                    isOpen: true,
                    title: 'Delete Orders',
                    message: `Are you sure you want to delete ${selectedOrders.length} order(s)? This action cannot be undone.`,
                    type: 'confirm',
                    onConfirm: async () => {
                      try {
                        await Promise.all(
                          selectedOrders.map(orderId => 
                            fetch(`/api/orders/${orderId}`, { method: 'DELETE' })
                          )
                        )
                        setSelectedOrders([])
                        fetchOrders()
                      } catch (error) {
                        console.error('Failed to delete orders:', error)
                      }
                    }
                  })
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Delete Selected
              </button>
            </div>
          )}

          {/* Filter Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
            {statusFilters.map((filter, index) => (
              <button
                key={index}
                onClick={() => setActiveFilter(filter.value)}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: activeFilter === filter.value ? 'none' : '1px solid #d1d5db',
                  backgroundColor: activeFilter === filter.value ? '#2563eb' : 'white',
                  color: activeFilter === filter.value ? 'white' : '#6b7280',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {filter.label}
              </button>
            ))}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '1rem' }}>
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>From:</span>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="DD-MM-YYYY"
                  value={fromDate}
                  onClick={() => setShowFromCalendar(!showFromCalendar)}
                  readOnly
                  style={{
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    width: '140px',
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
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>To:</span>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="DD-MM-YYYY"
                  value={toDate}
                  onClick={() => setShowToCalendar(!showToCalendar)}
                  readOnly
                  style={{
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    outline: 'none',
                    width: '140px',
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
          </div>

          {/* Orders Table */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {/* Table Header */}
            <div style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '1rem',
              display: 'grid',
              gridTemplateColumns: '50px 1fr 1.5fr 1fr 2fr 1fr 1fr 1fr 1fr 1.5fr 1fr 1.5fr',
              gap: '1rem',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              <div>
                <input
                  type="checkbox"
                  checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOrders(filteredOrders.map((o: any) => o._id))
                    } else {
                      setSelectedOrders([])
                    }
                  }}
                  aria-label="Select all orders"
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
              </div>
              <div>ORDER ID</div>
              <div>CUSTOMER NAME</div>
              <div>MOBILE</div>
              <div>ITEMS</div>
              <div>PRICE</div>
              <div>STATUS</div>
              <div>PAYMENT METHOD</div>
              <div>PAYMENT STATUS</div>
              <div>DELIVERY PARTNER</div>
              <div>DATE</div>
              <div>ACTIONS</div>
            </div>

            {/* Table Rows */}
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                Loading orders...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No orders found
              </div>
            ) : filteredOrders.map((dbOrder, index) => {
              const order = formatOrderForDisplay(dbOrder)
              return (
              <div
                key={index}
                style={{
                  padding: '1rem',
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr 1.5fr 1fr 2fr 1fr 1fr 1fr 1fr 1.5fr 1fr 1.5fr',
                  gap: '1rem',
                  borderBottom: index < filteredOrders.length - 1 ? '1px solid #f3f4f6' : 'none',
                  fontSize: '0.9rem',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedOrders.includes(dbOrder._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrders([...selectedOrders, dbOrder._id])
                      } else {
                        setSelectedOrders(selectedOrders.filter(id => id !== dbOrder._id))
                      }
                    }}
                    aria-label={`Select order ${order.id}`}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ fontWeight: '500' }} onClick={() => router.push(`/admin/orders/${order.id.replace('#', '')}`)}>
                  {order.id}
                  {dbOrder.expressDelivery && <span style={{ marginLeft: '4px', fontSize: '0.7rem', backgroundColor: '#fef3c7', color: '#d97706', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>⚡ Express</span>}
                </div>
                <div onClick={() => router.push(`/admin/orders/${order.id.replace('#', '')}`)}>{order.customer}</div>
                <div onClick={() => router.push(`/admin/orders/${order.id.replace('#', '')}`)}>{order.mobile}</div>
                <div onClick={() => router.push(`/admin/orders/${order.id.replace('#', '')}`)}>{order.items}</div>
                <div onClick={() => router.push(`/admin/orders/${order.id.replace('#', '')}`)}>{order.price}</div>
                <div onClick={() => router.push(`/admin/orders/${order.id.replace('#', '')}`)}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    backgroundColor: 
                      order.status === 'Delivered' ? '#dcfce7' :
                      order.status === 'Delivery Failed' ? '#fee2e2' :
                      order.status === 'Pending' ? '#fef3c7' : '#fee2e2',
                    color: 
                      order.status === 'Delivered' ? '#166534' :
                      order.status === 'Delivery Failed' ? '#dc2626' :
                      order.status === 'Pending' ? '#92400e' : '#dc2626'
                  }}>
                    {order.status}
                  </span>
                  {(dbOrder.deliveryFailureFee > 0 || dbOrder.cancellationFee > 0) && (
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem', fontWeight: '500' }}>
                      {dbOrder.deliveryFailureFee > 0 && `Delivery Fee: ₹${dbOrder.deliveryFailureFee}`}
                      {dbOrder.cancellationFee > 0 && `Cancellation Fee: ₹${dbOrder.cancellationFee}`}
                    </div>
                  )}
                </div>
                <div onClick={() => router.push(`/admin/orders/${order.id.replace('#', '')}`)}>{order.paymentMethod}</div>
                <div onClick={() => router.push(`/admin/orders/${order.id.replace('#', '')}`)}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    backgroundColor: order.paymentStatus === 'Paid' ? '#dcfce7' : '#fef3c7',
                    color: order.paymentStatus === 'Paid' ? '#166534' : '#92400e'
                  }}>
                    {order.paymentStatus}
                  </span>
                </div>
                <div onClick={() => router.push(`/admin/orders/${order.id.replace('#', '')}`)}>{order.partner}</div>
                <div onClick={() => router.push(`/admin/orders/${order.id.replace('#', '')}`)}>{order.date}</div>
                <div onClick={(e) => e.stopPropagation()}>
                  {dbOrder.status === 'delivered_to_hub' ? (
                    <button
                      onClick={async () => {
                        const response = await fetch(`/api/orders/${dbOrder._id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            status: 'ready',
                            hubApprovedAt: new Date().toISOString()
                          })
                        });
                        if (response.ok) fetchOrders();
                      }}
                      style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      APPROVE
                    </button>
                  ) : dbOrder.status === 'ready' ? (
                    <button
                      onClick={async () => {
                        const response = await fetch(`/api/orders/${dbOrder._id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'processing' })
                        });
                        if (response.ok) fetchOrders();
                      }}
                      style={{
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      IN PROGRESS
                    </button>
                  ) : dbOrder.status === 'processing' ? (
                    <button
                      onClick={async () => {
                        const response = await fetch(`/api/orders/${dbOrder._id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            status: 'ironing',
                            ironingAt: new Date().toISOString()
                          })
                        });
                        if (response.ok) fetchOrders();
                      }}
                      style={{
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      IRONING
                    </button>
                  ) : dbOrder.status === 'ironing' ? (
                    <button
                      onClick={async () => {
                        const response = await fetch(`/api/orders/${dbOrder._id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            status: 'process_completed',
                            processCompletedAt: new Date().toISOString()
                          })
                        });
                        if (response.ok) fetchOrders();
                      }}
                      style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      COMPLETED
                    </button>
                  ) : dbOrder.status === 'process_completed' ? (
                    <span style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '500'
                    }}>
                      COMPLETED
                    </span>
                  ) : (
                    <button 
                      onClick={() => {
                        setModal({
                          isOpen: true,
                          title: 'Cancel Order',
                          message: 'Are you sure you want to cancel this order?',
                          type: 'confirm',
                          onConfirm: async () => {
                            const response = await fetch(`/api/orders/${dbOrder._id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'cancelled' })
                            });
                            if (response.ok) fetchOrders();
                          }
                        })
                      }}
                      style={{
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      CANCEL ORDER
                    </button>
                  )}
                </div>
              </div>
            )})}
          </div>

          {/* Pagination */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.5rem'
          }}>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              Showing {filteredOrders.length} of {orders.length} orders
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                Prev
              </button>
              <button style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                Next
              </button>
            </div>
          </div>

          <Modal
            isOpen={modal.isOpen}
            onClose={() => setModal({ ...modal, isOpen: false })}
            onConfirm={modal.type === 'confirm' ? modal.onConfirm : undefined}
            title={modal.title}
            message={modal.message}
            type={modal.type}
            confirmText={modal.type === 'confirm' ? 'Yes, Proceed' : 'OK'}
          />

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