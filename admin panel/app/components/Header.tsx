import React, { useEffect, useState } from 'react'

interface HeaderProps {
  title: string
  searchPlaceholder?: string
  onMobileMenuToggle?: () => void
}

const HamburgerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
  </svg>
)

interface AdminAlert {
  _id: string
  title: string
  message: string
  sentAt?: string
  createdAt: string
}

const SEEN_KEY = 'adminAlertsSeenAt'

export default function Header({ title, searchPlaceholder = "Search...", onMobileMenuToggle }: HeaderProps) {
  const [userName, setUserName] = useState('John Doe')
  const [userRole, setUserRole] = useState('')
  const [alerts, setAlerts] = useState<AdminAlert[]>([])
  const [unread, setUnread] = useState(0)
  const [showAlerts, setShowAlerts] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('adminUser')
    if (userData) {
      const user = JSON.parse(userData)
      setUserName(user.username || user.name || 'User')
      setUserRole(user.role || '')
    }
  }, [])

  // Order events the server records (new order, cancelled, delivery failed)
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const response = await fetch('/api/notifications')
        const data = await response.json()
        if (!data.success || !Array.isArray(data.data)) return

        const adminAlerts: AdminAlert[] = data.data
          .filter((n: any) => n.audience === 'Admin')
          .sort((a: any, b: any) =>
            new Date(b.sentAt || b.createdAt).getTime() - new Date(a.sentAt || a.createdAt).getTime())
          .slice(0, 15)

        setAlerts(adminAlerts)

        const seenAt = Number(localStorage.getItem(SEEN_KEY) || 0)
        setUnread(adminAlerts.filter(a => new Date(a.sentAt || a.createdAt).getTime() > seenAt).length)
      } catch (error) {
        console.error('Failed to load admin alerts:', error)
      }
    }

    loadAlerts()
    const poll = setInterval(loadAlerts, 30000)
    return () => clearInterval(poll)
  }, [])

  const openAlerts = () => {
    const next = !showAlerts
    setShowAlerts(next)
    if (next) {
      localStorage.setItem(SEEN_KEY, String(Date.now()))
      setUnread(0)
    }
  }

  const timeAgo = (value?: string) => {
    if (!value) return ''
    const mins = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
    return `${Math.floor(mins / 1440)}d ago`
  }

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1rem 2rem',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          className="hamburger-btn"
          onClick={onMobileMenuToggle}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '4px',
            color: '#374151'
          }}
        >
          <HamburgerIcon />
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
          {title}
        </h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <input
          className="header-search"
          type="text"
          placeholder={searchPlaceholder}
          style={{
            padding: '0.5rem 1rem',
            border: '2px solid #e5e7eb',
            borderRadius: '25px',
            outline: 'none',
            width: '250px'
          }}
          onFocus={(e) => e.target.style.borderColor = '#2563eb'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        />
        <div className="header-user-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={openAlerts}
              title="Order alerts"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#2563eb', padding: '0.25rem', lineHeight: 1 }}
            >
              🔔
              {unread > 0 && (
                <span style={{
                  position: 'absolute', top: 0, right: 0, transform: 'translate(35%, -25%)',
                  backgroundColor: '#dc2626', color: 'white', borderRadius: '999px',
                  minWidth: '18px', height: '18px', fontSize: '0.68rem', fontWeight: '700',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px'
                }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {showAlerts && (
              <>
                <div onClick={() => setShowAlerts(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                <div style={{
                  position: 'absolute', top: '2.2rem', right: 0, width: '340px', maxHeight: '420px',
                  overflowY: 'auto', backgroundColor: 'white', borderRadius: '12px',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.18)', border: '1px solid #e5e7eb', zIndex: 50
                }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', fontWeight: '700', color: '#1f2937', fontSize: '0.9rem' }}>
                    Order Alerts
                  </div>
                  {alerts.length === 0 ? (
                    <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
                      No order alerts yet
                    </div>
                  ) : alerts.map(alert => (
                    <div key={alert._id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1f2937' }}>{alert.title}</span>
                        <span style={{ fontSize: '0.72rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>{timeAgo(alert.sentAt || alert.createdAt)}</span>
                      </div>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.4 }}>{alert.message}</p>
                    </div>
                  ))}
                  <a href="/admin/notifications" style={{ display: 'block', padding: '0.7rem 1rem', textAlign: 'center', color: '#2563eb', fontWeight: '600', fontSize: '0.85rem', textDecoration: 'none' }}>
                    View all notifications →
                  </a>
                </div>
              </>
            )}
          </div>
          <div style={{
            width: '35px',
            height: '35px',
            borderRadius: '50%',
            backgroundColor: '#d1d5db',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            👤
          </div>
          <span style={{ fontWeight: '500' }}>{userRole}: {userName}</span>
        </div>
      </div>
    </div>
  )
}