'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ResponsiveLayout from '../../components/ResponsiveLayout'
import Modal from '../../components/Modal'

/**
 * This page used to be a mock-up: currency and timezone dropdowns, 2FA, fake
 * sessions and "Reset System Data" / "Delete Admin Account" buttons that did
 * nothing. Controls that look real but do nothing are worse than no controls,
 * so it now does two real jobs: change your own password, and point at where
 * each setting actually lives.
 */

interface AdminUser {
  _id?: string
  username?: string
  email: string
  role: string
  mobile?: string
  hub?: string | null
}

const SETTINGS_MAP = [
  {
    group: 'Orders & delivery',
    icon: '📦',
    href: '/admin/add-on#Charges',
    items: ['Express Delivery ON/OFF and fee', 'Delivery turnaround hours (12 / 24)', 'Cancellation and failed-delivery charges', 'Cancellation policy text', 'Garment care & damage/loss policies', '"Before your pickup" card', 'Home screen and How To Order wording', 'Brand fonts', 'Invoice GST number and support email'],
  },
  {
    group: 'Pickup time slots',
    icon: '🕐',
    href: '/admin/add-on#TimeSlot',
    items: ['Add, edit and remove slots', 'Today / Tomorrow booking ON/OFF'],
  },
  {
    group: 'Service areas & hubs',
    icon: '📍',
    href: '/admin/add-on#Pincode',
    items: ['Serviceable pincodes', 'Hubs and their service pincodes'],
  },
  {
    group: 'Catalogue',
    icon: '👕',
    href: '/admin/pricing',
    items: ['Garment categories and images', 'Garment prices', 'Garment descriptions'],
  },
  {
    group: 'Wallet, points & vouchers',
    icon: '💰',
    href: '/admin/add-on#Wallet',
    items: ['Points per rupee, redemption minimum', 'Referral and signup bonus', 'Minimum order value', 'Vouchers (Add-On → Voucher)'],
  },
  {
    group: 'Customer balances',
    icon: '⚖️',
    href: '/admin/wallet-points',
    items: ['Adjust a customer wallet or points', 'Bulk adjustments'],
  },
  {
    group: 'Top-up plans',
    icon: '💳',
    href: '/admin/subscriptions',
    items: ['Plan price, wallet credit, benefits, image'],
  },
  {
    group: 'Home banners',
    icon: '🖼️',
    href: '/admin/add-on#Hero',
    items: ['Hero images and videos'],
  },
  {
    group: 'Admin users & roles',
    icon: '👥',
    href: '/admin/role-management',
    items: ['Add or remove admins and store managers', 'Assign a hub to a store manager'],
  },
]

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' as 'info' | 'success' | 'error' })

  useEffect(() => {
    const stored = localStorage.getItem('adminUser')
    if (!stored) {
      router.push('/admin/login')
      return
    }
    const parsed = JSON.parse(stored)
    setUser(parsed)

    // The stored session has no _id, so look the record up by email for the password change
    fetch(`/api/admin-users?email=${encodeURIComponent(parsed.email)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.[0]) setUser((u) => ({ ...(u as AdminUser), ...data.data[0] }))
      })
      .catch(error => console.error('Could not load admin profile:', error))
  }, [router])

  const changePassword = async () => {
    if (!oldPassword || !newPassword) {
      setModal({ isOpen: true, title: 'Missing details', message: 'Enter your current password and the new one.', type: 'error' })
      return
    }
    if (newPassword.length < 6) {
      setModal({ isOpen: true, title: 'Password too short', message: 'Use at least 6 characters.', type: 'error' })
      return
    }
    if (newPassword !== confirmPassword) {
      setModal({ isOpen: true, title: 'Passwords do not match', message: 'The new password and confirmation are different.', type: 'error' })
      return
    }
    if (!user?._id) {
      setModal({ isOpen: true, title: 'Cannot change password', message: 'Your admin record could not be loaded. Please sign in again.', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/admin-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: user._id, oldPassword, password: newPassword }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not change the password')

      setOldPassword(''); setNewPassword(''); setConfirmPassword('')
      setModal({ isOpen: true, title: 'Password changed', message: 'Use your new password the next time you sign in.', type: 'success' })
    } catch (error: any) {
      setModal({ isOpen: true, title: 'Password not changed', message: error.message || 'Please try again.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', padding: '0.7rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '0.75rem' }
  const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }

  return (
    <ResponsiveLayout activePage="Settings" title="Settings" searchPlaceholder="Search...">
      <div style={{ padding: '2rem', maxWidth: '1240px' }}>

        {/* Account header */}
        <div style={{ background: 'linear-gradient(120deg, #1e3a8a 0%, #2563eb 60%, #0ea5e9 100%)', borderRadius: '16px', padding: '1.75rem 2rem', color: 'white', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -60, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', bottom: -70, right: 120, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', position: 'relative' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 700, flexShrink: 0 }}>
              {(user?.username || 'A').charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0 }}>{user?.username || 'Admin'}</h2>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)' }}>{user?.email || '—'}</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: '20px', padding: '0.2rem 0.8rem', fontSize: '0.75rem', fontWeight: 700 }}>{user?.role || 'Admin'}</span>
                <span style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: '20px', padding: '0.2rem 0.8rem', fontSize: '0.75rem', fontWeight: 700 }}>{user?.hub || 'All hubs'}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 340px) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }} className="settings-grid">

          {/* Change password */}
          <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #eef2f7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '1.1rem' }}>🔑</span>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 700, margin: 0 }}>Change password</h3>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0 0 1.1rem' }}>You will need your current password.</p>

            <label style={labelStyle}>Current password</label>
            <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} style={inputStyle} placeholder="Current password" />
            <label style={labelStyle}>New password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} placeholder="At least 6 characters" />
            <label style={labelStyle}>Confirm new password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} placeholder="Repeat the new password" />
            <button
              onClick={changePassword}
              disabled={saving}
              style={{ width: '100%', padding: '0.75rem', backgroundColor: saving ? '#9ca3af' : '#2563eb', color: 'white', border: 'none', borderRadius: '9px', fontWeight: 700, fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer', marginTop: '0.25rem' }}
            >
              {saving ? 'Saving...' : 'Change password'}
            </button>
          </div>

          {/* Where everything else lives */}
          <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #eef2f7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '1.1rem' }}>🧭</span>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 700, margin: 0 }}>Where settings live</h3>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0 0 1.25rem' }}>
              Everything below can be changed without a developer or an app update.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.9rem' }}>
              {SETTINGS_MAP.map(section => (
                <button
                  key={section.group}
                  onClick={() => router.push(section.href)}
                  style={{
                    textAlign: 'left', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem',
                    backgroundColor: '#fbfdff', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    transition: 'border-color .15s, box-shadow .15s, transform .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.55rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.92rem', fontWeight: 700, color: '#1f2937' }}>
                      <span style={{ fontSize: '1rem' }}>{section.icon}</span>{section.group}
                    </span>
                    <span style={{ color: '#2563eb', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>→</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1rem', color: '#6b7280', fontSize: '0.78rem', lineHeight: 1.65 }}>
                    {section.items.slice(0, 4).map(item => <li key={item}>{item}</li>)}
                    {section.items.length > 4 && (
                      <li style={{ listStyle: 'none', marginLeft: '-1rem', color: '#9ca3af' }}>+ {section.items.length - 4} more</li>
                    )}
                  </ul>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .settings-grid { grid-template-columns: minmax(0, 1fr) !important; }
        }
      `}</style>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </ResponsiveLayout>
  )
}
