'use client'

import { useState, useEffect } from 'react'
import ResponsiveLayout from '../../components/ResponsiveLayout'

export default function WalletPointsPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [stats, setStats] = useState({ totalWalletBalance: 0, totalPoints: 0, totalReferrals: 0 })
  const [showModal, setShowModal] = useState(false)
  const [modalData, setModalData] = useState({ customerId: '', customerName: '', type: '', currentValue: 0 })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkType, setBulkType] = useState<'balance' | 'points'>('balance')
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  useEffect(() => { fetchCustomers() }, [])

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      const data = await response.json()
      if (data.success) {
        setCustomers(data.data)
        const totalBalance = data.data.reduce((s: number, c: any) => s + (c.walletBalance || 0), 0)
        const totalPts = data.data.reduce((s: number, c: any) => s + (c.loyaltyPoints || 0), 0)
        const totalRefs = data.data.reduce((s: number, c: any) => s + (c.referralCodes?.filter((r: any) => r.used).length || 0), 0)
        setStats({ totalWalletBalance: totalBalance, totalPoints: totalPts, totalReferrals: totalRefs })
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    }
  }

  const showToast = (message: string, type: string) => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(customers.map((c: any) => c._id)))
    }
  }

  const handleAdjust = async (action: string, amount: number, reason: string) => {
    try {
      const response = await fetch(`/api/customers/${modalData.customerId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: modalData.type, action, amount, reason })
      })
      if (response.ok) {
        showToast('Adjustment successful!', 'success')
        setShowModal(false)
        fetchCustomers()
      } else {
        const data = await response.json()
        showToast(data.error || 'Failed to adjust', 'error')
      }
    } catch {
      showToast('Failed to adjust', 'error')
    }
  }

  const handleBulkAdjust = async (action: string, amount: number, reason: string) => {
    try {
      const response = await fetch('/api/customers/bulk-adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds: Array.from(selectedIds), type: bulkType, action, amount, reason })
      })
      const data = await response.json()
      if (response.ok) {
        showToast(data.message || 'Bulk adjustment done!', 'success')
        setShowBulkModal(false)
        setSelectedIds(new Set())
        fetchCustomers()
      } else {
        showToast(data.error || 'Bulk adjust failed', 'error')
      }
    } catch {
      showToast('Bulk adjust failed', 'error')
    }
  }

  const allSelected = customers.length > 0 && selectedIds.size === customers.length
  const someSelected = selectedIds.size > 0

  return (
    <ResponsiveLayout activePage="Wallet & Points" title="Wallet & Points Management" searchPlaceholder="Search by Customer ID">
      <div style={{ padding: '1.5rem' }}>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#2563eb', marginBottom: '0.5rem' }}>₹{stats.totalWalletBalance.toLocaleString()}</div>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Total Wallet Balance in System</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#2563eb', marginBottom: '0.5rem' }}>{stats.totalPoints.toLocaleString()} pts</div>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Total Points in System</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#2563eb', marginBottom: '0.5rem' }}>{customers.length}</div>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Total Customers</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#2563eb', marginBottom: '0.5rem' }}>{stats.totalReferrals}</div>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Successful Referrals</div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {someSelected && (
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '0.75rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '600', color: '#1d4ed8', fontSize: '0.9rem' }}>{selectedIds.size} customer{selectedIds.size > 1 ? 's' : ''} selected</span>
            <button onClick={() => { setBulkType('balance'); setShowBulkModal(true) }} style={{ padding: '0.4rem 1rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '500' }}>
              Adjust Wallet Balance
            </button>
            <button onClick={() => { setBulkType('points'); setShowBulkModal(true) }} style={{ padding: '0.4rem 1rem', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '500' }}>
              Adjust Points
            </button>
            <button onClick={() => setSelectedIds(new Set())} style={{ padding: '0.4rem 0.75rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
              Clear
            </button>
          </div>
        )}

        {/* Customer Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#2563eb', padding: '1rem', display: 'grid', gridTemplateColumns: '40px 1fr 2fr 1.5fr 1.5fr 2fr 2fr', gap: '1rem', fontSize: '0.9rem', fontWeight: '600', color: 'white', alignItems: 'center' }}>
            <div>
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'white' }} title="Select all" />
            </div>
            <div>CUSTOMER ID</div>
            <div>NAME</div>
            <div>WALLET BALANCE (₹)</div>
            <div>POINTS BALANCE</div>
            <div>LAST TRANSACTION</div>
            <div>ACTIONS</div>
          </div>

          {customers.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No customers found</div>
          ) : customers.map((customer: any, index) => (
            <div key={customer._id} style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '40px 1fr 2fr 1.5fr 1.5fr 2fr 2fr', gap: '1rem', borderBottom: index < customers.length - 1 ? '1px solid #f3f4f6' : 'none', fontSize: '0.9rem', alignItems: 'center', backgroundColor: selectedIds.has(customer._id) ? '#eff6ff' : 'white' }}>
              <div>
                <input type="checkbox" checked={selectedIds.has(customer._id)} onChange={() => toggleSelect(customer._id)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563eb' }} />
              </div>
              <div style={{ fontWeight: '500' }}>#{customer._id.slice(-6)}</div>
              <div>{customer.name}</div>
              <div>₹{customer.walletBalance || 0}</div>
              <div>{customer.loyaltyPoints || 0} pts</div>
              <div>{customer.updatedAt ? new Date(customer.updatedAt).toLocaleString() : 'N/A'}</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => { setModalData({ customerId: customer._id, customerName: customer.name, type: 'balance', currentValue: customer.walletBalance || 0 }); setShowModal(true) }} style={{ padding: '0.25rem 0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Adjust Balance</button>
                <button onClick={() => { setModalData({ customerId: customer._id, customerName: customer.name, type: 'points', currentValue: customer.loyaltyPoints || 0 }); setShowModal(true) }} style={{ padding: '0.25rem 0.75rem', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Adjust Points</button>
              </div>
            </div>
          ))}
        </div>

        {/* Individual Adjust Modal */}
        {showModal && (
          <AdjustModal
            title={`Adjust ${modalData.type === 'balance' ? 'Balance' : 'Points'}`}
            subtitle={`${modalData.customerName} — Current: ${modalData.type === 'balance' ? '₹' : ''}${modalData.currentValue}${modalData.type === 'points' ? ' pts' : ''}`}
            onSubmit={handleAdjust}
            onClose={() => setShowModal(false)}
          />
        )}

        {/* Bulk Adjust Modal */}
        {showBulkModal && (
          <AdjustModal
            title={`Bulk Adjust ${bulkType === 'balance' ? 'Wallet Balance' : 'Points'} for ${selectedIds.size} customers`}
            subtitle={`This will apply to all ${selectedIds.size} selected customers`}
            onSubmit={handleBulkAdjust}
            onClose={() => setShowBulkModal(false)}
          />
        )}

        {toast.show && (
          <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: '1rem 1.5rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{toast.message}</span>
            <button onClick={() => setToast({ show: false, message: '', type: '' })} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
          </div>
        )}
      </div>
    </ResponsiveLayout>
  )
}

function AdjustModal({ title, subtitle, onSubmit, onClose }: { title: string; subtitle: string; onSubmit: (action: string, amount: number, reason: string) => void; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: '600' }}>{title}</h3>
        <p style={{ marginBottom: '1.25rem', color: '#6b7280', fontSize: '0.85rem' }}>{subtitle}</p>
        <form onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.target as HTMLFormElement)
          onSubmit(fd.get('action') as string, Number(fd.get('amount')), fd.get('reason') as string)
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Action</label>
            <select name="action" required style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}>
              <option value="increase">Increase (Add)</option>
              <option value="decrease">Decrease (Deduct)</option>
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Amount</label>
            <input name="amount" type="number" min="1" required placeholder="Enter amount" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Reason</label>
            <input name="reason" type="text" required placeholder="Enter reason" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.5rem 1rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Submit</button>
          </div>
        </form>
      </div>
    </div>
  )
}
