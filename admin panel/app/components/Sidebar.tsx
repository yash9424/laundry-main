import React from 'react'

const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
  </svg>
)

const OrdersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
  </svg>
)

const UndeliveredIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
  </svg>
)

const CustomersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H17c-.8 0-1.54.37-2.01.99l-2.98 3.67a.5.5 0 0 0 .39.84H14v8h6zm-12.5 0v-7.5h1.75L7.91 7.85A1.5 1.5 0 0 0 6.5 7H5c-.8 0-1.54.37-2.01.99L.01 11.66a.5.5 0 0 0 .39.84H2v8.5h1.5z"/>
  </svg>
)

const DeliveryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
  </svg>
)

const PricingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
  </svg>
)

const WalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
  </svg>
)

const ReportsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
  </svg>
)

const NotificationsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
  </svg>
)

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
  </svg>
)

const RoleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
)

const AddOnIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
  </svg>
)

const ReviewsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12H7v-2h6v2zm3-4H7V8h9v2z"/>
  </svg>
)

const SubscriptionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
  </svg>
)

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
  </svg>
)

interface SidebarProps {
  activePage: string
  isMobileMenuOpen?: boolean
  onMobileMenuClose?: () => void
}

export default function Sidebar({ activePage, isMobileMenuOpen = false, onMobileMenuClose }: SidebarProps) {
  const [userRole, setUserRole] = React.useState('')

  React.useEffect(() => {
    const userData = localStorage.getItem('adminUser')
    if (userData) {
      const user = JSON.parse(userData)
      setUserRole(user.role || '')
    }
  }, [])

  const allMenuItems = [
    { icon: <DashboardIcon />, label: 'Dashboard', href: '/admin/dashboard', roles: ['Admin'] },
    { icon: <OrdersIcon />, label: 'Orders', href: '/admin/orders', roles: ['Admin', 'Store Manager'] },
    { icon: <UndeliveredIcon />, label: 'Undelivered Orders', href: '/admin/undelivered-orders', roles: ['Admin', 'Store Manager'] },
    { icon: <CustomersIcon />, label: 'Customers', href: '/admin/customers', roles: ['Admin'] },
    { icon: <DeliveryIcon />, label: 'Delivery Partners', href: '/admin/delivery-partners', roles: ['Admin'] },
    { icon: <RoleIcon />, label: 'Partner KYC', href: '/admin/partner-kyc', roles: ['Admin'] },
    { icon: <PricingIcon />, label: 'Pricing', href: '/admin/pricing', roles: ['Admin'] },
    { icon: <WalletIcon />, label: 'Wallet & Points', href: '/admin/wallet-points', roles: ['Admin'] },
    { icon: <SubscriptionIcon />, label: 'Subscriptions', href: '/admin/subscriptions', roles: ['Admin'] },
    { icon: <ReportsIcon />, label: 'Reports', href: '/admin/reports', roles: ['Admin'] },
    { icon: <NotificationsIcon />, label: 'Notifications', href: '/admin/notifications', roles: ['Admin'] },
    { icon: <AddOnIcon />, label: 'Add-On', href: '/admin/add-on', roles: ['Admin'] },
    // { icon: <SettingsIcon />, label: 'Settings', href: '/admin/settings', roles: ['Admin'] },
    { icon: <RoleIcon />, label: 'Role Management', href: '/admin/role-management', roles: ['Admin'] },
    { icon: <ReviewsIcon />, label: 'Reviews', href: '/admin/reviews', roles: ['Admin'] },
    { icon: <LogoutIcon />, label: 'Logout', href: '/admin/login', roles: ['Admin', 'Store Manager'] }
  ]

  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole))

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="sidebar-desktop" style={{
        padding: '1rem 0',
        color: 'white',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ flex: 1 }}>
        {menuItems.slice(0, -1).map((item, index) => (
          <a 
            key={index}
            href={item.href}
            style={{ textDecoration: 'none' }}
          >
            <div 
              style={{
                padding: '0.75rem 1.5rem',
                margin: '0.125rem 0.75rem',
                borderRadius: '20px',
                backgroundColor: item.label === activePage ? 'white' : 'transparent',
                color: item.label === activePage ? '#2563eb' : 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: '400',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (item.label !== activePage) {
                  (e.target as HTMLDivElement).style.backgroundColor = '#718096'
                }
              }}
              onMouseLeave={(e) => {
                if (item.label !== activePage) {
                  (e.target as HTMLDivElement).style.backgroundColor = 'transparent'
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
              {item.label}
            </div>
          </a>
        ))}
        </div>
        
        {/* Logout button at bottom */}
        <div style={{ padding: '0 0.75rem 0 0.75rem' }}>
          <a href="/admin/login" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '20px',
              backgroundColor: '#dc2626',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.9rem',
              fontWeight: '400',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLDivElement).style.backgroundColor = '#b91c1c'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLDivElement).style.backgroundColor = '#dc2626'
            }}>
              <span style={{ display: 'flex', alignItems: 'center' }}><LogoutIcon /></span>
              Logout
            </div>
          </a>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div 
        className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={onMobileMenuClose}
      />

      {/* Mobile Sidebar */}
      <div className={`sidebar-mobile ${isMobileMenuOpen ? 'active' : ''}`} style={{
        padding: '1rem 0',
        color: 'white',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #4a5568' }}>
          <button
            onClick={onMobileMenuClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '1.5rem',
              cursor: 'pointer',
              float: 'right'
            }}
          >
            ×
          </button>
          <div style={{ clear: 'both' }} />
        </div>
        
        <div style={{ flex: 1 }}>
        {menuItems.slice(0, -1).map((item, index) => (
          <a 
            key={index}
            href={item.href}
            style={{ textDecoration: 'none' }}
            onClick={onMobileMenuClose}
          >
            <div 
              style={{
                padding: '0.75rem 1.5rem',
                margin: '0.125rem 0.75rem',
                borderRadius: '20px',
                backgroundColor: item.label === activePage ? 'white' : 'transparent',
                color: item.label === activePage ? '#2563eb' : 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: '400',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
              {item.label}
            </div>
          </a>
        ))}
        </div>
        
        {/* Logout button at bottom */}
        <div style={{ padding: '0 0.75rem 0 0.75rem' }}>
          <a href="/admin/login" style={{ textDecoration: 'none' }} onClick={onMobileMenuClose}>
            <div style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '20px',
              backgroundColor: '#dc2626',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.9rem',
              fontWeight: '400',
              transition: 'all 0.2s ease'
            }}>
              <span style={{ display: 'flex', alignItems: 'center' }}><LogoutIcon /></span>
              Logout
            </div>
          </a>
        </div>
      </div>
    </>
  )
}