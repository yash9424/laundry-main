'use client'

import { useState, useEffect } from 'react'
import ResponsiveLayout from '../../components/ResponsiveLayout'

interface Customer {
  _id: string
  name: string
  mobile: string
  totalSpend: number
  totalOrders: number
  lastOrderDate?: string
  isActive: boolean
  createdAt: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    highValueCustomers: 0
  })
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const customersPerPage = 20
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: '' })
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFromCalendar, setShowFromCalendar] = useState(false)
  const [showToCalendar, setShowToCalendar] = useState(false)
  const [sortBy, setSortBy] = useState('most_orders')
  const [statusFilter, setStatusFilter] = useState('all')
  const [spendingFilter, setSpendingFilter] = useState('all')
  const [orderCountFilter, setOrderCountFilter] = useState('all')
  const [showHighValueModal, setShowHighValueModal] = useState(false)
  const [highValueType, setHighValueType] = useState('')
  const [minOrderValue, setMinOrderValue] = useState('')
  const [minSpendValue, setMinSpendValue] = useState('')
  const [highValueCustomers, setHighValueCustomers] = useState<Customer[]>([])
  const [showHighValueResults, setShowHighValueResults] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      const data = await response.json()
      if (data.success) {
        setCustomers(data.data)
        calculateStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchHighValueCustomers = async (type: string, value: number) => {
    try {
      const response = await fetch(`/api/customers/high-value?type=${type}&value=${value}`)
      const data = await response.json()
      if (data.success) {
        setHighValueCustomers(data.data)
        setShowHighValueResults(true)
      }
    } catch (error) {
      console.error('Failed to fetch high value customers:', error)
    }
  }

  const handleHighValueFilter = () => {
    if (highValueType === 'orders' && minOrderValue) {
      fetchHighValueCustomers('orders', parseInt(minOrderValue))
    } else if (highValueType === 'spending' && minSpendValue) {
      fetchHighValueCustomers('spending', parseInt(minSpendValue))
    }
    setShowHighValueModal(false)
  }

  const calculateStats = (customerData: any[]) => {
    const total = customerData.length
    const active = customerData.filter(c => c.isActive).length
    const highValue = customerData.filter(c => (c.totalSpend || 0) > 10000).length
    setStats({ totalCustomers: total, activeCustomers: active, highValueCustomers: highValue })
  }

  // Filter customers based on search and date range
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchQuery || 
      customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.mobile?.includes(searchQuery)
    
    const matchesDateRange = () => {
      if (!fromDate && !toDate) return true
      if (!customer.createdAt) return false
      
      const customerDate = new Date(customer.createdAt)
      const from = fromDate ? new Date(fromDate.split('-').reverse().join('-')) : null
      const to = toDate ? new Date(toDate.split('-').reverse().join('-')) : null
      
      if (from && customerDate < from) return false
      if (to && customerDate > to) return false
      return true
    }
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && customer.isActive) ||
      (statusFilter === 'inactive' && !customer.isActive)
    
    const matchesSpending = () => {
      const spend = customer.totalSpend || 0
      if (spendingFilter === 'all') return true
      if (spendingFilter === 'high' && spend >= 10000) return true
      if (spendingFilter === 'medium' && spend >= 5000 && spend < 10000) return true
      if (spendingFilter === 'low' && spend < 5000) return true
      return false
    }
    
    const matchesOrderCount = () => {
      const orders = customer.totalOrders || 0
      if (orderCountFilter === 'all') return true
      if (orderCountFilter === 'high' && orders >= 10) return true
      if (orderCountFilter === 'medium' && orders >= 5 && orders < 10) return true
      if (orderCountFilter === 'low' && orders < 5) return true
      return false
    }
    
    return matchesSearch && matchesDateRange() && matchesStatus && matchesSpending() && matchesOrderCount()
  }).sort((a, b) => {
    if (sortBy === 'most_orders') {
      return (b.totalOrders || 0) - (a.totalOrders || 0)
    }
    if (sortBy === 'most_spend') {
      return (b.totalSpend || 0) - (a.totalSpend || 0)
    }
    return 0
  })

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
    setCurrentPage(1)
  }

  const toggleSelection = (customerId: string) => {
    const newSelected = new Set(selectedCustomers)
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId)
    } else {
      newSelected.add(customerId)
    }
    setSelectedCustomers(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(customers.map(c => c._id)))
    }
  }

  const indexOfLastCustomer = currentPage * customersPerPage
  const indexOfFirstCustomer = indexOfLastCustomer - customersPerPage
  const currentCustomers = filteredCustomers.slice(indexOfFirstCustomer, indexOfLastCustomer)
  const totalPages = Math.ceil(filteredCustomers.length / customersPerPage)

  const handleBulkDelete = async () => {
    if (selectedCustomers.size === 0) return
    setShowConfirmModal(false)
    
    try {
      const deletePromises = Array.from(selectedCustomers).map(async (id) => {
        const response = await fetch(`/api/customers/${id}`, { 
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })
        if (!response.ok) {
          throw new Error(`Failed to delete customer ${id}`)
        }
        return response.json()
      })
      
      await Promise.all(deletePromises)
      setToast({ show: true, message: `Successfully deleted ${selectedCustomers.size} customer(s)`, type: 'success' })
      setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000)
      setSelectedCustomers(new Set())
      setSelectionMode(false)
      fetchCustomers()
    } catch (error) {
      console.error('Failed to delete customers:', error)
      setToast({ show: true, message: 'Failed to delete some customers. Please try again.', type: 'error' })
      setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000)
    }
  }

  return (
    <ResponsiveLayout activePage="Customers" title="Customers" searchPlaceholder="Search by Name / Mobile">
        {/* Customers Content */}
        <div style={{ padding: '1.5rem' }}>
          {/* Search Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="Search by name or mobile number..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              outline: 'none',
              fontSize: '0.9rem'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2563eb'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
        </div>

        {/* Filter Section */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '25px',
                outline: 'none',
                backgroundColor: 'white',
                minWidth: '200px'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            >
              <option value="most_orders">Sort by Most Orders</option>
              <option value="most_spend">Sort by Most Spend</option>
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                outline: 'none',
                backgroundColor: 'white',
                minWidth: '120px'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <select
              value={spendingFilter}
              onChange={(e) => setSpendingFilter(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                outline: 'none',
                backgroundColor: 'white',
                minWidth: '140px'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            >
              <option value="all">All Spending</option>
              <option value="high">High (₹10k+)</option>
              <option value="medium">Medium (₹5k-10k)</option>
              <option value="low">Low (&lt;₹5k)</option>
            </select>
            
            <select
              value={orderCountFilter}
              onChange={(e) => setOrderCountFilter(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                outline: 'none',
                backgroundColor: 'white',
                minWidth: '130px'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            >
              <option value="all">All Orders</option>
              <option value="high">High (10+)</option>
              <option value="medium">Medium (5-9)</option>
              <option value="low">Low (&lt;5)</option>
            </select>
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
                      setCurrentPage(1)
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
                      setCurrentPage(1)
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
                onClick={() => {
                  setSelectionMode(!selectionMode)
                  setSelectedCustomers(new Set())
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: selectionMode ? '#dc2626' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {selectionMode ? 'Cancel Selection' : 'Select Customers'}
              </button>
              {selectionMode && selectedCustomers.size > 0 && (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Delete Selected ({selectedCustomers.size})
                </button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Customers</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#2563eb', fontSize: '1.2rem' }}>👥</span>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{stats.totalCustomers}</span>
              </div>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Active Customers</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#2563eb', fontSize: '1.2rem' }}>👥</span>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{stats.activeCustomers}</span>
              </div>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              position: 'relative'
            }}>
              <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>High Value Customers</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ color: '#f59e0b', fontSize: '1.2rem' }}>⭐</span>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{stats.highValueCustomers}</span>
              </div>
              <button
                onClick={() => setShowHighValueModal(true)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Filter High Value
              </button>
            </div>
          </div>

          {/* Customers Table */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {/* Table Header */}
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '1rem',
              display: 'grid',
              gridTemplateColumns: selectionMode ? '50px 1fr 2fr 2fr 1.5fr 1.5fr 2fr' : '1fr 2fr 2fr 1.5fr 1.5fr 2fr',
              gap: '1rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#6b7280',
              borderBottom: '1px solid #e5e7eb'
            }}>
              {selectionMode && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedCustomers.size === currentCustomers.length && currentCustomers.length > 0}
                    onChange={() => {
                      if (selectedCustomers.size === currentCustomers.length) {
                        setSelectedCustomers(new Set())
                      } else {
                        setSelectedCustomers(new Set(currentCustomers.map(c => c._id)))
                      }
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>
              )}
              <div>Customer ID</div>
              <div>Name</div>
              <div>Mobile</div>
              <div>Last Order</div>
              <div>Total Spend</div>
              <div>Actions</div>
            </div>

            {/* Table Rows */}
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                Loading customers...
              </div>
            ) : customers.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '1rem',
                  textAlign: 'left'
                }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.5rem',
                    flexShrink: 0
                  }}>
                    ●
                  </div>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                      No customers found.
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                      Try adjusting your search or filter criteria.
                    </div>
                  </div>
                </div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '1rem',
                  textAlign: 'left'
                }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    backgroundColor: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.5rem',
                    flexShrink: 0
                  }}>
                    🔍
                  </div>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                      No customers match your search.
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                      Try different search terms or date range.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              currentCustomers.map((customer, index) => (
                <div
                  key={customer._id}
                  style={{
                    padding: '1rem',
                    display: 'grid',
                    gridTemplateColumns: selectionMode ? '50px 1fr 2fr 2fr 1.5fr 1.5fr 2fr' : '1fr 2fr 2fr 1.5fr 1.5fr 2fr',
                    gap: '1rem',
                    borderBottom: index < currentCustomers.length - 1 ? '1px solid #f3f4f6' : 'none',
                    fontSize: '0.9rem',
                    alignItems: 'center',
                    backgroundColor: selectedCustomers.has(customer._id) ? '#eff6ff' : 'white'
                  }}
                >
                  {selectionMode && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedCustomers.has(customer._id)}
                        onChange={() => toggleSelection(customer._id)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </div>
                  )}
                  <div style={{ fontWeight: '500' }}>#{customer._id.slice(-6)}</div>
                  <div>{customer.name || 'User'}</div>
                  <div>{customer.mobile}</div>
                  <div>{customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'No orders'}</div>
                  <div>₹{customer.totalSpend || 0}</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => window.location.href = `/admin/customers/${customer._id}`}
                    style={{
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}>
                    View Profile
                  </button>
                  <button style={{
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}>
                    Block
                  </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {filteredCustomers.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1.5rem'
            }}>
              <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Showing {indexOfFirstCustomer + 1}-{Math.min(indexOfLastCustomer, filteredCustomers.length)} of {filteredCustomers.length} customers
                {(searchQuery || fromDate || toDate || statusFilter !== 'all' || spendingFilter !== 'all' || orderCountFilter !== 'all') && (
                  <span style={{ color: '#2563eb', marginLeft: '0.5rem' }}>
                    (filtered from {customers.length} total)
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: currentPage === 1 ? '#d1d5db' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  Prev
                </button>
                <span style={{ color: '#6b7280', fontSize: '0.9rem', padding: '0 0.5rem' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: currentPage === totalPages ? '#d1d5db' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {showConfirmModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '400px' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Confirm Delete</h3>
                <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>Are you sure you want to delete {selectedCustomers.size} customer(s)? This action cannot be undone.</p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowConfirmModal(false)} style={{ padding: '0.5rem 1rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleBulkDelete} style={{ padding: '0.5rem 1rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            </div>
          )}

          {toast.show && (
            <div style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
              color: 'white',
              padding: '1rem 1.5rem',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>{toast.message}</span>
              <button onClick={() => setToast({ show: false, message: '', type: '' })} style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '1.25rem',
                cursor: 'pointer',
                padding: '0 0.25rem'
              }}>×</button>
            </div>
          )}

          {/* High Value Customers Modal */}
          {showHighValueModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '400px', width: '90%' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>High Value Customer Filter</h3>
                <p style={{ marginBottom: '1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>Filter customers based on monthly performance</p>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Filter Type:</label>
                  <select
                    value={highValueType}
                    onChange={(e) => setHighValueType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      outline: 'none'
                    }}
                  >
                    <option value="">Select filter type</option>
                    <option value="orders">Based on Monthly Orders</option>
                    <option value="spending">Based on Monthly Spending</option>
                  </select>
                </div>

                {highValueType === 'orders' && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Minimum Orders per Month:</label>
                    <input
                      type="number"
                      placeholder="Enter minimum orders"
                      value={minOrderValue}
                      onChange={(e) => setMinOrderValue(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}

                {highValueType === 'spending' && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Minimum Spending per Month (₹):</label>
                    <input
                      type="number"
                      placeholder="Enter minimum amount"
                      value={minSpendValue}
                      onChange={(e) => setMinSpendValue(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => {
                      setShowHighValueModal(false)
                      setHighValueType('')
                      setMinOrderValue('')
                      setMinSpendValue('')
                    }} 
                    style={{ 
                      padding: '0.75rem 1.5rem', 
                      backgroundColor: '#6b7280', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer' 
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleHighValueFilter}
                    disabled={!highValueType || (!minOrderValue && !minSpendValue)}
                    style={{ 
                      padding: '0.75rem 1.5rem', 
                      backgroundColor: (!highValueType || (!minOrderValue && !minSpendValue)) ? '#d1d5db' : '#f59e0b', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: (!highValueType || (!minOrderValue && !minSpendValue)) ? 'not-allowed' : 'pointer' 
                    }}
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* High Value Results Modal */}
          {showHighValueResults && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '1000px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>High Value Customers</h3>
                  <button 
                    onClick={() => setShowHighValueResults(false)}
                    style={{ 
                      backgroundColor: '#ef4444', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      padding: '0.5rem 1rem', 
                      cursor: 'pointer' 
                    }}
                  >
                    Close
                  </button>
                </div>
                
                <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                  Found {highValueCustomers.length} customers with {highValueType === 'orders' ? `${minOrderValue}+ orders` : `₹${minSpendValue}+ spending`} per month
                </p>

                {highValueCustomers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    No customers found matching the criteria
                  </div>
                ) : (
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{
                      backgroundColor: '#f8fafc',
                      padding: '1rem',
                      display: 'grid',
                      gridTemplateColumns: '1fr 2fr 2fr 1.5fr 1.5fr 2fr',
                      gap: '1rem',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#6b7280'
                    }}>
                      <div>ID</div>
                      <div>Name</div>
                      <div>Mobile</div>
                      <div>Monthly Orders</div>
                      <div>Monthly Spend</div>
                      <div>Actions</div>
                    </div>
                    {highValueCustomers.map((customer, index) => (
                      <div
                        key={customer._id}
                        style={{
                          padding: '1rem',
                          display: 'grid',
                          gridTemplateColumns: '1fr 2fr 2fr 1.5fr 1.5fr 2fr',
                          gap: '1rem',
                          borderBottom: index < highValueCustomers.length - 1 ? '1px solid #f3f4f6' : 'none',
                          fontSize: '0.9rem',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ fontWeight: '500' }}>#{customer._id.slice(-6)}</div>
                        <div>{customer.name || 'User'}</div>
                        <div>{customer.mobile}</div>
                        <div>{(customer as any).monthlyOrders || 0}</div>
                        <div>₹{(customer as any).monthlySpend || 0}</div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => {
                              setShowHighValueResults(false)
                              window.location.href = `/admin/customers/${customer._id}`
                            }}
                            style={{
                              backgroundColor: '#2563eb',
                              color: 'white',
                              border: 'none',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}>
                            View Profile
                          </button>
                          <button style={{
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}>
                            Block
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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