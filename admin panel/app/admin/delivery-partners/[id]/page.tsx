'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ResponsiveLayout from '../../../components/ResponsiveLayout'

interface Partner {
  _id: string
  name: string
  mobile: string
  email?: string
  profileImage?: string
  vehicleNumber?: string
  vehicleType?: string
  aadharNumber?: string
  panNumber?: string
  drivingLicenseNumber?: string
  aadharImage?: string
  drivingLicenseImage?: string
  kycStatus?: string
  kycRejectionReason?: string
  bankDetails?: {
    accountHolderName?: string
    accountNumber: string
    ifscCode: string
    bankName: string
    branch?: string
  }
  address?: {
    street: string
    city: string
    state: string
    pincode: string
  }
  pincodes?: string[]
  isVerified: boolean
  isActive: boolean
  rating: number
  totalPickups: number
  totalDeliveries: number
  totalEarnings: number
  createdAt: string
}

const PICKUP_STATUSES = ['picked_up', 'delivered_to_hub', 'processing', 'ironing', 'process_completed', 'ready', 'out_for_delivery', 'delivered']
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', reached_location: 'Reached', picked_up: 'Picked Up',
  delivered_to_hub: 'At Hub', processing: 'Processing', ironing: 'Ironing',
  process_completed: 'Done', ready: 'Ready', out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered', cancelled: 'Cancelled', delivery_failed: 'Failed'
}
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fef3c7', color: '#92400e' },
  picked_up: { bg: '#dbeafe', color: '#1e40af' },
  delivered_to_hub: { bg: '#e0e7ff', color: '#3730a3' },
  processing: { bg: '#fce7f3', color: '#9d174d' },
  ironing: { bg: '#fef9c3', color: '#854d0e' },
  process_completed: { bg: '#d1fae5', color: '#065f46' },
  ready: { bg: '#ccfbf1', color: '#0f766e' },
  out_for_delivery: { bg: '#bfdbfe', color: '#1d4ed8' },
  delivered: { bg: '#dcfce7', color: '#15803d' },
  cancelled: { bg: '#fee2e2', color: '#991b1b' },
  delivery_failed: { bg: '#ffe4e6', color: '#be123c' },
}

export default function PartnerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const partnerId = params.id as string
  const [partner, setPartner] = useState<Partner | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pickups' | 'deliveries'>('pickups')

  useEffect(() => {
    fetchPartner()
    fetchOrders()
  }, [partnerId])

  const fetchPartner = async () => {
    try {
      const response = await fetch(`/api/mobile/partners/${partnerId}`)
      const data = await response.json()
      if (data.success) setPartner(data.data)
    } catch (error) {
      console.error('Failed to fetch partner:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch(`/api/orders?partnerId=${partnerId}`)
      const data = await response.json()
      if (data.success) setOrders(data.data)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setOrdersLoading(false)
    }
  }

  const pickupOrders = orders.filter(o => PICKUP_STATUSES.includes(o.status))
  const deliveryOrders = orders.filter(o => o.status === 'delivered')
  const displayOrders = activeTab === 'pickups' ? pickupOrders : deliveryOrders

  if (loading) {
    return (
      <ResponsiveLayout activePage="Delivery Partners" title="Partner Profile">
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      </ResponsiveLayout>
    )
  }

  if (!partner) {
    return (
      <ResponsiveLayout activePage="Delivery Partners" title="Partner Profile">
        <div style={{ padding: '2rem', textAlign: 'center' }}>Partner not found</div>
      </ResponsiveLayout>
    )
  }

  return (
    <ResponsiveLayout activePage="Delivery Partners" title="Partner Profile">
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

        {/* Partner Info */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#2563eb' }}>Partner Information</h3>
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
            {partner.profileImage ? (
              <img src={partner.profileImage} alt="Profile" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #2563eb' }} />
            ) : (
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: '#6b7280' }}>
                {partner.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><strong>ID:</strong> #{partner._id.slice(-6)}</div>
                <div><strong>Name:</strong> {partner.name}</div>
                <div><strong>Mobile:</strong> {partner.mobile}</div>
                <div><strong>Email:</strong> {partner.email || 'Not provided'}</div>
                <div><strong>Rating:</strong> ⭐ {partner.rating.toFixed(1)}</div>
                <div><strong>Status:</strong> 
                  <span style={{ color: partner.isActive ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                    {partner.isActive ? ' Active' : ' Inactive'}
                  </span>
                </div>
                <div><strong>Verified:</strong> 
                  <span style={{ color: partner.isVerified ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                    {partner.isVerified ? ' Yes' : ' No'}
                  </span>
                </div>
                <div><strong>Joined:</strong> {new Date(partner.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#2563eb' }}>Statistics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ca8a04' }}>{ordersLoading ? '...' : pickupOrders.length}</div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '0.5rem' }}>Total Pickups</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{ordersLoading ? '...' : deliveryOrders.length}</div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '0.5rem' }}>Total Deliveries</div>
            </div>
          </div>
        </div>

        {/* Pickups & Deliveries */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#2563eb' }}>Order History</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {(['pickups', 'deliveries'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.5rem 1.25rem', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem',
                  background: activeTab === tab ? '#2563eb' : '#f1f5f9',
                  color: activeTab === tab ? 'white' : '#475569',
                }}
              >
                {tab === 'pickups' ? `Pickups (${ordersLoading ? '...' : pickupOrders.length})` : `Deliveries (${ordersLoading ? '...' : deliveryOrders.length})`}
              </button>
            ))}
          </div>

          {ordersLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading orders...</div>
          ) : displayOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              No {activeTab} found for this partner.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Order ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Customer</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Date</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Amount</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayOrders.map((order: any, i: number) => {
                    const sc = STATUS_COLORS[order.status] || { bg: '#f1f5f9', color: '#475569' }
                    return (
                      <tr key={order._id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '0.75rem', fontWeight: '600', color: '#1e40af' }}>#{order.orderId}</td>
                        <td style={{ padding: '0.75rem', color: '#1e293b' }}>
                          <div>{order.customerId?.name || 'Unknown'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{order.customerId?.mobile || ''}</div>
                        </td>
                        <td style={{ padding: '0.75rem', color: '#475569' }}>
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: '600', color: '#1e293b' }}>₹{order.totalAmount}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', background: sc.bg, color: sc.color }}>
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <button
                            onClick={() => router.push(`/admin/orders/${order.orderId}`)}
                            style={{ padding: '0.3rem 0.75rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vehicle Details */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#2563eb' }}>Vehicle Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><strong>Vehicle Type:</strong> {partner.vehicleType || 'Not provided'}</div>
            <div><strong>Vehicle Number:</strong> {partner.vehicleNumber || 'Not provided'}</div>
          </div>
        </div>

        {/* KYC Details */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2563eb' }}>KYC Details</h3>
            <span style={{
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              backgroundColor: partner.kycStatus === 'approved' ? '#dcfce7' : partner.kycStatus === 'rejected' ? '#fee2e2' : '#fef3c7',
              color: partner.kycStatus === 'approved' ? '#16a34a' : partner.kycStatus === 'rejected' ? '#dc2626' : '#ca8a04'
            }}>
              {partner.kycStatus?.toUpperCase() || 'PENDING'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><strong>Aadhar Number:</strong> {partner.aadharNumber || 'Not provided'}</div>
            <div><strong>Driving License:</strong> {partner.drivingLicenseNumber || 'Not provided'}</div>
          </div>
          {partner.kycRejectionReason && (
            <div style={{ padding: '1rem', backgroundColor: '#fee2e2', borderRadius: '8px', marginBottom: '1rem' }}>
              <strong style={{ color: '#dc2626' }}>Rejection Reason:</strong>
              <div style={{ color: '#991b1b', marginTop: '0.5rem' }}>{partner.kycRejectionReason}</div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {partner.aadharImage && (
              <div>
                <strong>Aadhar Card Image:</strong>
                <img src={partner.aadharImage} alt="Aadhar" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', marginTop: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              </div>
            )}
            {partner.drivingLicenseImage && (
              <div>
                <strong>Driving License Image:</strong>
                <img src={partner.drivingLicenseImage} alt="License" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', marginTop: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              </div>
            )}
          </div>
        </div>

        {/* Bank Details */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#2563eb' }}>Bank Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><strong>Account Holder Name:</strong> {partner.bankDetails?.accountHolderName || 'Not provided'}</div>
            <div><strong>Account Number:</strong> {partner.bankDetails?.accountNumber || 'Not provided'}</div>
            <div><strong>IFSC Code:</strong> {partner.bankDetails?.ifscCode || 'Not provided'}</div>
            <div><strong>Bank Name:</strong> {partner.bankDetails?.bankName || 'Not provided'}</div>
            <div><strong>Branch:</strong> {partner.bankDetails?.branch || 'Not provided'}</div>
          </div>
        </div>

        {/* Address & Service Areas */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#2563eb' }}>Address & Service Areas</h3>
          
          {/* Address */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>Registered Address</h4>
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              {partner.address?.street ? (
                <>
                  <div>{partner.address.street}</div>
                  <div>{partner.address.city}, {partner.address.state} - {partner.address.pincode}</div>
                </>
              ) : (
                <div>Not provided</div>
              )}
            </div>
          </div>

          {/* Service Pincodes */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>Service Areas (Pincodes)</h4>
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              {partner.pincodes && partner.pincodes.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {partner.pincodes.map((pincode, index) => (
                    <span 
                      key={index}
                      style={{
                        backgroundColor: '#2563eb',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}
                    >
                      {pincode}
                    </span>
                  ))}
                </div>
              ) : (
                <div>No service areas specified</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  )
}
