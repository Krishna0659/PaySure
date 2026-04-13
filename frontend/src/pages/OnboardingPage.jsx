import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserContext } from '../context/UserContext'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { getToken } = useAuth()
  const { profile, loading: profileLoading, setProfile } = useUserContext()
  
  const [name, setName] = useState(user?.fullName || '')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect if already onboarded
  useEffect(() => {
    if (profile && profile.is_onboarded) {
      navigate('/dashboard', { replace: true })
    }
  }, [profile, navigate])

  const handleSubmit = async () => {
    if (!name.trim()) return setError('Please enter your full name')
    if (!phone.trim()) return setError('Please enter your phone number')
    if (!role) return setError('Please select your role')

    setLoading(true)
    setError('')

    try {
      const token = await getToken()
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          full_name: name, 
          phone: phone, 
          role: role,
          is_onboarded: true 
        }),
      })

      if (res.ok) {
        // Optimistically update the context so we don't have to reload from APIs
        setProfile({ ...profile, is_onboarded: true, full_name: name, role: role, phone: phone })
        navigate('/dashboard')
      } else {
        const data = await res.json()
        setError(data?.detail || 'Setup failed. Please try again.')
      }
    } catch (err) {
      setError('Network error. Failed to reach server.')
    } finally {
      setLoading(false)
    }
  }

  const roles = [
    {
      id: 'freelancer',
      icon: '🧑‍💻',
      title: 'Freelancer',
      desc: 'I deliver work & get paid per milestone',
    },
    {
      id: 'client',
      icon: '🏢',
      title: 'Client',
      desc: 'I hire talent & approve deliverables',
    },
  ]

  if (profileLoading) {
    return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#050A07', color: '#6B7280' }}>Loading profile context...</div>
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#050A07',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'absolute', width: 500, height: 500,
        borderRadius: '50%', filter: 'blur(100px)',
        background: 'radial-gradient(circle, rgba(52,211,153,0.1), transparent)',
        top: -100, left: -100, pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400,
        borderRadius: '50%', filter: 'blur(100px)',
        background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent)',
        bottom: -100, right: -100, pointerEvents: 'none'
      }} />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        style={{
          width: '100%', maxWidth: 520,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(52,211,153,0.12)',
          backdropFilter: 'blur(24px)',
          borderRadius: 24, padding: '48px 44px',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          style={{ marginBottom: 36, textAlign: 'center' }}
        >
          <div style={{
            fontFamily: 'Cabinet Grotesk, sans-serif',
            fontSize: '1.6rem', fontWeight: 800,
            letterSpacing: '-0.03em', marginBottom: 8
          }}>
            Welcome to Pay<span style={{ color: '#34D399' }}>Sure</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            Let's set up your account in 30 seconds
          </p>
        </motion.div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name */}
          <div>
            <label style={{
              fontSize: '0.78rem', color: '#6B7280',
              fontWeight: 500, marginBottom: 6,
              display: 'block', letterSpacing: '0.03em'
            }}>FULL NAME</label>
            <input
              className="input"
              placeholder="Full Name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Phone */}
          <div>
            <label style={{
              fontSize: '0.78rem', color: '#6B7280',
              fontWeight: 500, marginBottom: 6,
              display: 'block', letterSpacing: '0.03em'
            }}>PHONE NUMBER</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%',
                transform: 'translateY(-50%)',
                color: '#6B7280', fontSize: '0.875rem',
                fontWeight: 500, zIndex: 1
              }}>+91</span>
              <input
                className="input"
                placeholder="98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{ paddingLeft: 44 }}
              />
            </div>
          </div>

          {/* Role selector */}
          <div>
            <label style={{
              fontSize: '0.78rem', color: '#6B7280',
              fontWeight: 500, marginBottom: 10,
              display: 'block', letterSpacing: '0.03em'
            }}>I AM A...</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {roles.map(({ id, icon, title, desc }) => (
                <motion.button
                  key={id}
                  onClick={() => setRole(id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    background: role === id
                      ? 'rgba(52,211,153,0.1)'
                      : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${role === id
                      ? 'rgba(52,211,153,0.4)'
                      : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 14, padding: '20px 16px',
                    textAlign: 'left', cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {role === id && (
                    <motion.div
                      layoutId="roleGlow"
                      style={{
                        position: 'absolute', inset: 0,
                        background: 'radial-gradient(ellipse at top left, rgba(52,211,153,0.12), transparent 70%)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  <div style={{ fontSize: '1.6rem', marginBottom: 10 }}>{icon}</div>
                  <div style={{
                    fontFamily: 'Cabinet Grotesk, sans-serif',
                    fontWeight: 700, fontSize: '0.95rem',
                    marginBottom: 4,
                    color: role === id ? '#34D399' : '#ECFDF5'
                  }}>{title}</div>
                  <div style={{
                    fontSize: '0.75rem', color: '#6B7280',
                    lineHeight: 1.5
                  }}>{desc}</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: 8, padding: '10px 14px',
                  fontSize: '0.8rem', color: '#F87171'
                }}
              >{error}</motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            onClick={handleSubmit}
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="btn-primary"
            style={{
              width: '100%', justifyContent: 'center',
              marginTop: 8, padding: '14px',
              fontSize: '0.95rem'
            }}
          >
            {loading ? 'Saving...' : 'Complete Setup →'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}