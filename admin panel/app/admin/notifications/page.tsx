'use client'

import { useState, useEffect } from 'react'
import ResponsiveLayout from '../../components/ResponsiveLayout'

interface Notification {
  _id: string;
  title: string;
  message: string;
  audience: string;
  status: string;
  sentAt?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('Customers')
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [audienceFilter, setAudienceFilter] = useState('all')

  // Auto-generated order events carry audience 'Admin'; everything else is a broadcast
  const adminAlertCount = notifications.filter(n => n.audience === 'Admin').length
  const visibleNotifications = audienceFilter === 'all'
    ? notifications
    : notifications.filter(n => n.audience === audienceFilter || (audienceFilter !== 'Admin' && n.audience === 'Both'))

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      const data = await response.json()
      if (data.success) {
        setNotifications(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setFetchLoading(false)
    }
  }

  const sendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      alert('Please fill in both title and message')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          audience,
          status: 'sent',
          sentAt: new Date().toISOString()
        })
      })

      const data = await response.json()
      if (data.success) {
        setTitle('')
        setMessage('')
        setAudience('Customers')
        fetchNotifications()
        alert('Notification sent successfully!')
      } else {
        alert('Failed to send notification')
      }
    } catch (error) {
      console.error('Failed to send notification:', error)
      alert('Failed to send notification')
    } finally {
      setLoading(false)
    }
  }

  const saveAsDraft = async () => {
    if (!title.trim() || !message.trim()) {
      alert('Please fill in both title and message')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          audience,
          status: 'draft',
          createdAt: new Date().toISOString()
        })
      })

      const data = await response.json()
      if (data.success) {
        setTitle('')
        setMessage('')
        setAudience('Customers')
        fetchNotifications()
        alert('Notification saved as draft!')
      } else {
        alert('Failed to save draft')
      }
    } catch (error) {
      console.error('Failed to save draft:', error)
      alert('Failed to save draft')
    } finally {
      setLoading(false)
    }
  }

  const deleteNotification = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return

    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchNotifications()
        alert('Notification deleted successfully!')
      } else {
        alert('Failed to delete notification')
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
      alert('Failed to delete notification')
    }
  }

  return (
    <ResponsiveLayout activePage="Notifications" title="Notifications" searchPlaceholder="Search notifications">
      <div style={{ padding: '1.5rem' }}>
        {/* Create Notification Section */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem', margin: '0 0 1rem 0' }}>Create Notification</h3>
          
          <input 
            type="text" 
            placeholder="Title" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              border: '1px solid #d1d5db', 
              borderRadius: '8px', 
              outline: 'none', 
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}
          />
          
          <textarea 
            placeholder="Message Body" 
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              border: '1px solid #d1d5db', 
              borderRadius: '8px', 
              outline: 'none', 
              marginBottom: '1rem',
              fontSize: '0.9rem',
              resize: 'vertical'
            }}
          />
          
          <select 
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              border: '1px solid #d1d5db', 
              borderRadius: '8px', 
              outline: 'none', 
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}
          >
            <option value="Customers">Audience: Customers</option>
            <option value="Partners">Audience: Partners</option>
            <option value="Both">Audience: Both</option>
          </select>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={sendNotification}
              disabled={loading}
              style={{ 
                padding: '0.75rem 1.5rem', 
                backgroundColor: loading ? '#9ca3af' : '#2563eb', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                fontSize: '0.9rem', 
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Sending...' : 'Send Notification'}
            </button>
            <button 
              onClick={saveAsDraft}
              disabled={loading}
              style={{ 
                padding: '0.75rem 1.5rem', 
                backgroundColor: 'white', 
                color: '#2563eb', 
                border: '1px solid #2563eb', 
                borderRadius: '8px', 
                fontSize: '0.9rem', 
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Saving...' : 'Save as Draft'}
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2563eb', margin: 0 }}>Notifications List</h3>
            {/* "Order Alerts" are the records the server writes on new / cancelled / failed orders */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All' },
                { key: 'Admin', label: `Order Alerts${adminAlertCount > 0 ? ` (${adminAlertCount})` : ''}` },
                { key: 'Customers', label: 'To Customers' },
                { key: 'Partners', label: 'To Captains' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setAudienceFilter(tab.key)}
                  style={{
                    padding: '0.4rem 0.9rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer',
                    border: audienceFilter === tab.key ? 'none' : '1px solid #d1d5db',
                    backgroundColor: audienceFilter === tab.key ? '#2563eb' : 'white',
                    color: audienceFilter === tab.key ? 'white' : '#6b7280',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1.5fr 1fr', gap: '1rem', fontSize: '0.9rem', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
            <div>Notification Title</div>
            <div>Message Preview</div>
            <div>Audience</div>
            <div>Status</div>
            <div>Created / Sent On</div>
            <div>Actions</div>
          </div>

          {fetchLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading notifications...</div>
          ) : visibleNotifications.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No notifications found</div>
          ) : (
            visibleNotifications.map((notification, index) => (
              <div key={notification._id} style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1.5fr 1fr', gap: '1rem', borderBottom: index < visibleNotifications.length - 1 ? '1px solid #f3f4f6' : 'none', fontSize: '0.9rem', alignItems: 'center' }}>
                <div style={{ fontWeight: '500' }}>{notification.title}</div>
                <div style={{ color: '#6b7280' }}>{notification.message.substring(0, 50)}...</div>
                <div>{notification.audience}</div>
                <div>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem', 
                    fontWeight: '500',
                    backgroundColor: notification.status === 'sent' ? '#dcfce7' : '#dbeafe',
                    color: notification.status === 'sent' ? '#16a34a' : '#2563eb'
                  }}>
                    {notification.status === 'sent' ? 'Sent' : 'Draft'}
                  </span>
                </div>
                <div>{new Date(notification.sentAt || notification.createdAt).toLocaleDateString()}</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => deleteNotification(notification._id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6"/>
                      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </ResponsiveLayout>
  )
}