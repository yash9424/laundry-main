'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface ResponsiveLayoutProps {
  activePage: string
  title: string
  searchPlaceholder?: string
  children: React.ReactNode
}

export default function ResponsiveLayout({ 
  activePage, 
  title, 
  searchPlaceholder = "Search...", 
  children 
}: ResponsiveLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'var(--font-manrope), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <Sidebar 
        activePage={activePage} 
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuClose={closeMobileMenu}
      />
      <div className="main-content" style={{ backgroundColor: '#f8fafc' }}>
        <Header 
          title={title} 
          searchPlaceholder={searchPlaceholder}
          onMobileMenuToggle={toggleMobileMenu}
        />
        {children}
      </div>
    </div>
  )
}