'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ResponsiveLayout from '../../../components/ResponsiveLayout'

interface Customer {
  _id: string
  name: string
  mobile: string
  email?: string
  totalSpend: number
  totalOrders: number
  walletBalance: number
  isActive: boolean
  lastOrderDate?: string
  address: Array<{
    street: string
    city: string
    state: string
    pincode: string
    isDefault: boolean
  }>
  createdAt: string
}

export default function CustomerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<any[]>([])

  useEffect(() => {
    fetchCustomer()
    fetchSubscriptions()
  }, [customerId])

  // What top-up plans this customer has bought (Admin > Subscriptions lists them all;
  // this shows only the ones belonging to this customer)
  const fetchSubscriptions = async () => {
    try {
      const response = await fetch(`/api/subscriptions?customerId=${customerId}`)
      const data = await response.json()
      if (data.success) setSubscriptions(data.data || [])
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error)
    }
  }

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`)
      const data = await response.json()
      if (data.success) {
        setCustomer(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch customer:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ResponsiveLayout activePage="Customers" title="Customer Profile">
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      </ResponsiveLayout>
    )
  }

  if (!customer) {
    return (
      <ResponsiveLayout activePage="Customers" title="Customer Profile">
        <div style={{ padding: '2rem', textAlign: 'center' }}>Customer not found</div>
      </ResponsiveLayout>
    )
  }

  return (
    <ResponsiveLayout activePage="Customers" title="Customer Profile">
      <div style={{ padding: '1.5rem' }}>
        <button 
          onClick={() => router.back()}
          style={{
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            cursor: 'pointer'
          }}
        >
          ← Back
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Customer Info */}
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Customer Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div><strong>ID:</strong> #{customer._id.slice(-6)}</div>
              <div><strong>Name:</strong> {customer.name}</div>
              <div><strong>Mobile:</strong> {customer.mobile}</div>
              <div><strong>Email:</strong> {customer.email || 'Not provided'}</div>
              <div><strong>Status:</strong> 
                <span style={{ 
                  color: customer.isActive ? '#16a34a' : '#dc2626',
                  fontWeight: 'bold'
                }}>
                  {customer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div><strong>Member Since:</strong> {new Date(customer.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>₹{customer.totalSpend}</div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Total Spend</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>{customer.totalOrders}</div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Total Orders</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>₹{customer.walletBalance}</div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Wallet Balance</div>
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        {customer.address && customer.address.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginTop: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Addresses</h3>
            {customer.address.map((addr, index) => (
              <div key={index} style={{
                padding: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                marginBottom: '0.5rem'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {addr.isDefault && <span style={{ color: '#2563eb' }}>[Default] </span>}
                  Address {index + 1}
                </div>
                <div>{addr.street}</div>
                <div>{addr.city}, {addr.state} - {addr.pincode}</div>
              </div>
            ))}
          </div>
        )}

        {/* Top-up plans this customer has purchased */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>Subscriptions</h3>
            {subscriptions.some(s => s.status === 'active') && (
              <span style={{ backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '20px', padding: '0.25rem 0.85rem', fontSize: '0.78rem', fontWeight: 700 }}>
                Active plan
              </span>
            )}
          </div>

          {subscriptions.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>This customer has not bought any top-up plan yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {subscriptions.map((sub: any) => {
                const active = sub.status === 'active'
                return (
                  <div key={sub._id} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ width: 46, height: 46, borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, #452D9B 0%, #07C8D0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem' }}>
                      {sub.planId?.image
                        ? <img src={sub.planId.image} alt={sub.planName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : '💳'}
                    </div>
                    <div style={{ flex: 1, minWidth: '140px' }}>
                      <div style={{ fontWeight: 700, color: '#1f2937' }}>{sub.planName || sub.planId?.name || 'Plan'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        Purchased {sub.purchasedAt ? new Date(sub.purchasedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '90px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Paid</div>
                      <div style={{ fontWeight: 700 }}>₹{sub.price ?? 0}</div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '110px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Wallet credited</div>
                      <div style={{ fontWeight: 700, color: '#16a34a' }}>₹{sub.walletCredited ?? 0}</div>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize',
                      backgroundColor: active ? '#dcfce7' : sub.status === 'pending' ? '#fef3c7' : '#fee2e2',
                      color: active ? '#15803d' : sub.status === 'pending' ? '#b45309' : '#b91c1c',
                    }}>
                      {sub.status || 'unknown'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        {(customer as any).paymentMethods && (customer as any).paymentMethods.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginTop: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Payment Methods</h3>
            {(customer as any).paymentMethods.map((pm: any, index: number) => (
              <div key={index} style={{
                padding: '1rem',
                backgroundColor: pm.isPrimary ? '#eff6ff' : '#f8fafc',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                border: pm.isPrimary ? '2px solid #2563eb' : '1px solid #e5e7eb'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {pm.type}
                  {pm.isPrimary && <span style={{ 
                    backgroundColor: '#2563eb', 
                    color: 'white', 
                    padding: '0.125rem 0.5rem', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}>Primary</span>}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  {pm.type === 'UPI' && pm.upiId && `UPI ID: ${pm.upiId}`}
                  {pm.type === 'Card' && pm.cardNumber && (
                    <>
                      <div>Card: ****{pm.cardNumber.slice(-4)}</div>
                      <div>Holder: {pm.cardHolder}</div>
                      <div>Expiry: {pm.expiryDate}</div>
                    </>
                  )}
                  {pm.type === 'Bank Transfer' && pm.accountNumber && (
                    <>
                      <div>Bank: {pm.bankName}</div>
                      <div>Account: ****{pm.accountNumber.slice(-4)}</div>
                      <div>IFSC: {pm.ifscCode}</div>
                    </>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                  Added: {new Date(pm.addedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ResponsiveLayout>
  )
}