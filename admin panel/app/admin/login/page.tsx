'use client'

import { useState } from 'react'
import Modal from '../../components/Modal'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' as 'info' | 'success' | 'error' })

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('adminUser', JSON.stringify(data.data));
        window.location.href = '/admin/dashboard';
      } else {
        setModal({ isOpen: true, title: 'Login Failed', message: 'Invalid email or password', type: 'error' });
      }
    } catch (error) {
      setModal({ isOpen: true, title: 'Login Failed', message: 'An error occurred during login. Please try again.', type: 'error' });
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'var(--font-manrope), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Left Side - Blue Background with Image */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        color: 'white'
      }}>
        {/* Urban Steam Logo */}
        <div style={{
          width: '120px',
          height: '120px',
          marginBottom: '2rem',
          borderRadius: '50%',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3), 0 0 0 3px rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
          border: '2px solid rgba(255,255,255,0.2)',
          transform: 'translateZ(0)',
          transition: 'transform 0.3s ease'
        }}>
          <img 
            src="/assets/APP ICON WHITE WITH GRADIENT BG.png" 
            alt="Urban Steam Logo" 
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          textAlign: 'center'
        }}>
          Urban Steam - Admin Panel
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '1rem',
          opacity: 0.9,
          marginBottom: '3rem',
          textAlign: 'center'
        }}>
          Manage orders, partners & operations
        </p>

        {/* Illustration */}
        <div style={{
          width: '400px',
          height: '280px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img 
            src="/login page.svg" 
            alt="Admin Dashboard" 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: 'white'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px'
        }}>
          {/* Login Title */}
          <h2 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Admin Login
          </h2>

          {/* Email Field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.9rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#2563eb',
                fontSize: '1.2rem'
              }}>
                ✉
              </span>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.9rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#2563eb',
                fontSize: '1.2rem'
              }}>
                🔒
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 45px 12px 40px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.2rem'
                }}
              >
                {showPassword ? '👁️' : '👁️🗨️'}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.9rem',
              color: '#6b7280',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  marginRight: '8px',
                  width: '16px',
                  height: '16px'
                }}
              />
              Remember me
            </label>
            <a href="#" style={{
              fontSize: '0.9rem',
              color: '#2563eb',
              textDecoration: 'none'
            }}>
              Forgot Password?
            </a>
          </div>

          {/* Login Button */}
          <button 
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '1.5rem',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#2563eb'}
          >
            Login
          </button>

          {/* Divider */}
          <div style={{
            textAlign: 'center',
            margin: '1.5rem 0',
            color: '#9ca3af',
            fontSize: '0.9rem'
          }}>
            or
          </div>

          {/* Google Login Button */}
          <button style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'white',
            color: '#374151',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'border-color 0.2s'
          }}
          onMouseOver={(e) => (e.target as HTMLButtonElement).style.borderColor = '#d1d5db'}
          onMouseOut={(e) => (e.target as HTMLButtonElement).style.borderColor = '#e5e7eb'}
          >
            <span style={{ color: '#4285f4', fontWeight: 'bold' }}>G</span>
            Login with Google
          </button>
        </div>
      </div>
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  )
}
