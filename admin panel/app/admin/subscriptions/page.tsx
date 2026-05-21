'use client'

import { useState, useEffect } from 'react'
import ResponsiveLayout from '../../components/ResponsiveLayout'

interface Plan {
  _id: string
  name: string
  benefits: string[]
  price: number
  walletCredit: number
  image: string
  isActive: boolean
  order: number
}

interface Subscriber {
  _id: string
  customerId: { name: string; mobile: string } | null
  planId: any
  planName: string
  price: number
  walletCredited: number
  razorpayOrderId: string
  razorpayPaymentId: string
  status: string
  purchasedAt: string
}

const emptyPlan = { name: '', benefits: [''], price: 0, walletCredit: 0, image: '', isActive: true }

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<'plans' | 'subscribers'>('plans')
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [form, setForm] = useState<any>(emptyPlan)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [receiptSub, setReceiptSub] = useState<Subscriber | null>(null)
  const [toast, setToast] = useState({ show: false, message: '', type: '' })

  useEffect(() => {
    fetchPlans()
    fetchSubscribers()
  }, [])

  const showToast = (message: string, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000)
  }

  const fetchPlans = async () => {
    const res = await fetch('/api/subscription-plans')
    const data = await res.json()
    if (data.success) setPlans(data.data)
  }

  const fetchSubscribers = async () => {
    const res = await fetch('/api/subscriptions')
    const data = await res.json()
    if (data.success) setSubscribers(data.data)
  }

  const openAddModal = () => {
    setEditingPlan(null)
    setForm(emptyPlan)
    setImagePreview('')
    setShowPlanModal(true)
  }

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan)
    setForm({ name: plan.name, benefits: plan.benefits.length ? plan.benefits : [''], price: plan.price, walletCredit: plan.walletCredit, image: plan.image, isActive: plan.isActive })
    setImagePreview(plan.image ? (plan.image.startsWith('http') ? plan.image : `${plan.image}`) : '')
    setShowPlanModal(true)
  }

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (data.url) {
      setForm((f: any) => ({ ...f, image: data.url }))
      setImagePreview(data.url)
    }
  }

  const addBenefit = () => setForm((f: any) => ({ ...f, benefits: [...f.benefits, ''] }))
  const removeBenefit = (i: number) => setForm((f: any) => ({ ...f, benefits: f.benefits.filter((_: string, idx: number) => idx !== i) }))
  const updateBenefit = (i: number, val: string) => setForm((f: any) => {
    const b = [...f.benefits]; b[i] = val; return { ...f, benefits: b }
  })

  const savePlan = async () => {
    const payload = { ...form, benefits: form.benefits.filter((b: string) => b.trim()) }
    if (editingPlan) {
      const res = await fetch('/api/subscription-plans', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingPlan._id, ...payload }) })
      const data = await res.json()
      if (data.success) { showToast('Plan updated'); fetchPlans(); setShowPlanModal(false) }
    } else {
      const res = await fetch('/api/subscription-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (data.success) { showToast('Plan created'); fetchPlans(); setShowPlanModal(false) }
    }
  }

  const deletePlan = async (id: string) => {
    if (!confirm('Delete this plan?')) return
    const res = await fetch(`/api/subscription-plans?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) { showToast('Plan deleted'); fetchPlans() }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <ResponsiveLayout activePage="Subscriptions" title="Subscriptions">
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>Subscriptions</h1>
          {activeTab === 'plans' && (
            <button onClick={openAddModal} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}>
              + Add Plan
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0' }}>
          {(['plans', 'subscribers'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '0.6rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', color: activeTab === tab ? '#2563eb' : '#64748b', borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent', marginBottom: '-2px', textTransform: 'capitalize' }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {plans.length === 0 && <p style={{ color: '#64748b' }}>No plans yet. Click "Add Plan" to create one.</p>}
            {plans.map(plan => (
              <div key={plan._id} style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                {plan.image && (
                  <img src={plan.image.startsWith('http') ? plan.image : `http://localhost:3000${plan.image}`} alt={plan.name} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                )}
                {!plan.image && (
                  <div style={{ width: '100%', height: '200px', background: 'linear-gradient(135deg, #452D9B, #07C8D0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'white', fontSize: '2.5rem' }}>💳</span>
                  </div>
                )}
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1e293b' }}>{plan.name}</h3>
                    <span style={{ fontSize: '0.75rem', background: plan.isActive ? '#dcfce7' : '#fee2e2', color: plan.isActive ? '#16a34a' : '#dc2626', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' }}>{plan.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div style={{ background: 'linear-gradient(to right, #452D9B, #07C8D0)', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', color: 'white', fontWeight: '700', fontSize: '1rem' }}>
                    Pay ₹{plan.price} → Get ₹{plan.walletCredit}
                  </div>
                  <ul style={{ marginBottom: '0.75rem', paddingLeft: '0' }}>
                    {plan.benefits.map((b, i) => (
                      <li key={i} style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#16a34a', fontWeight: '700' }}>✓</span>{b}
                      </li>
                    ))}
                  </ul>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => openEditModal(plan)} style={{ flex: 1, background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Edit</button>
                    <button onClick={() => deletePlan(plan._id)} style={{ flex: 1, background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Subscribers Tab */}
        {activeTab === 'subscribers' && (
          <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Customer', 'Mobile', 'Plan', 'Amount Paid', 'Wallet Credited', 'Date', 'Status', 'Receipt'].map(h => (
                      <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subscribers.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No subscribers yet</td></tr>
                  )}
                  {subscribers.map(sub => (
                    <tr key={sub._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>{sub.customerId?.name || 'N/A'}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#475569' }}>{sub.customerId?.mobile || 'N/A'}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#475569' }}>{sub.planName}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#475569' }}>₹{sub.price}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: '600' }}>₹{sub.walletCredited}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap' }}>{formatDate(sub.purchasedAt)}</td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{ background: sub.status === 'active' ? '#dcfce7' : sub.status === 'pending' ? '#fef3c7' : '#fee2e2', color: sub.status === 'active' ? '#16a34a' : sub.status === 'pending' ? '#d97706' : '#dc2626', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize' }}>{sub.status}</span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <button onClick={() => setReceiptSub(sub)} style={{ background: '#f1f5f9', color: '#2563eb', border: 'none', borderRadius: '6px', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>Receipt</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Plan Modal */}
      {showPlanModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '1.25rem' }}>{editingPlan ? 'Edit Plan' : 'Add Plan'}</h2>

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Plan Name</label>
            <input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '1rem', fontSize: '0.9rem' }} />

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Price (Pay Amount) ₹</label>
            <input type="number" value={form.price} onChange={e => setForm((f: any) => ({ ...f, price: Number(e.target.value) }))} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '1rem', fontSize: '0.9rem' }} />

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Wallet Credit (Get Amount) ₹</label>
            <input type="number" value={form.walletCredit} onChange={e => setForm((f: any) => ({ ...f, walletCredit: Number(e.target.value) }))} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '1rem', fontSize: '0.9rem' }} />

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Benefits</label>
            {form.benefits.map((b: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input value={b} onChange={e => updateBenefit(i, e.target.value)} placeholder="e.g. Free delivery" style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} />
                <button onClick={() => removeBenefit(i)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontWeight: '700' }}>✕</button>
              </div>
            ))}
            <button onClick={addBenefit} style={{ background: '#f1f5f9', color: '#2563eb', border: 'none', borderRadius: '6px', padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', marginBottom: '1rem' }}>+ Add Benefit</button>

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.3rem' }}>Image (recommended 400x400px square)</label>
            <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]) }} style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }} />
            {uploading && <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>Uploading...</p>}
            {imagePreview && (
              <img src={imagePreview.startsWith('http') ? imagePreview : `http://localhost:3000${imagePreview}`} alt="preview" style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }} />
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>Active</label>
              <div onClick={() => setForm((f: any) => ({ ...f, isActive: !f.isActive }))} style={{ width: '44px', height: '24px', borderRadius: '12px', background: form.isActive ? '#2563eb' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: '2px', left: form.isActive ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowPlanModal(false)} style={{ flex: 1, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '8px', padding: '0.625rem', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              <button onClick={savePlan} style={{ flex: 1, background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '0.625rem', cursor: 'pointer', fontWeight: '600' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptSub && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', background: 'linear-gradient(to right, #452D9B, #07C8D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Urban Steam</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Invoice / Receipt</div>
            </div>
            <div style={{ borderTop: '1px dashed #e2e8f0', borderBottom: '1px dashed #e2e8f0', padding: '1rem 0', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Order #</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{receiptSub._id.slice(-8).toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Customer</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{receiptSub.customerId?.name || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Mobile</span>
                <span style={{ fontSize: '0.85rem' }}>{receiptSub.customerId?.mobile || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Plan</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{receiptSub.planName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Date</span>
                <span style={{ fontSize: '0.85rem' }}>{formatDate(receiptSub.purchasedAt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Amount Paid</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>₹{receiptSub.price}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Wallet Credited</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#16a34a' }}>₹{receiptSub.walletCredited}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Status</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'capitalize', color: receiptSub.status === 'active' ? '#16a34a' : '#d97706' }}>{receiptSub.status}</span>
              </div>
            </div>
            <button onClick={() => setReceiptSub(null)} style={{ width: '100%', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '0.625rem', cursor: 'pointer', fontWeight: '600' }}>Close</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: toast.type === 'error' ? '#dc2626' : '#16a34a', color: 'white', borderRadius: '10px', padding: '0.75rem 1.25rem', fontWeight: '600', zIndex: 2000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toast.message}
        </div>
      )}
    </ResponsiveLayout>
  )
}
