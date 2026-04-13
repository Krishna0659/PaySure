import { useState, useRef, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Settings, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function UserAvatarDropdown() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (!user) return null

  const initials = user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          padding: 0,
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(13,13,15,0.6)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 15px rgba(52,211,153,0.3)' : 'none',
          borderColor: isOpen ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.06)',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.boxShadow = '0 0 10px rgba(52,211,153,0.2)'
            e.currentTarget.style.borderColor = 'rgba(52,211,153,0.3)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
          }
        }}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {user.hasImage ? (
          <img 
            src={user.imageUrl} 
            alt="User avatar" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        ) : (
          <span style={{ 
            fontFamily: 'Cabinet Grotesk, sans-serif', 
            fontWeight: 700, 
            fontSize: '1.2rem', 
            color: '#ECFDF5' 
          }}>
            {initials}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 12,
              width: 220,
              background: 'rgba(13,13,15,0.85)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              padding: '8px',
              zIndex: 50,
              boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02) inset',
            }}
          >
            {/* User Info Header */}
            <div style={{ 
              padding: '12px', 
              borderBottom: '1px solid rgba(255,255,255,0.06)', 
              marginBottom: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ECFDF5', fontFamily: 'Inter, sans-serif' }}>
                {user.fullName || user.firstName || 'User'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.primaryEmailAddress?.emailAddress}
              </span>
            </div>

            {/* Menu Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <MenuItem icon={User} label="Profile" onClick={() => setIsOpen(false)} />
              <MenuItem icon={Settings} label="Settings" onClick={() => setIsOpen(false)} />
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
              <MenuItem icon={LogOut} label="Log out" onClick={handleLogout} danger />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger = false }) {
  const [isHovered, setIsHovered] = useState(false)
  const color = danger ? '#F87171' : '#E2E8F0'
  const hoverBg = danger ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)'
  const hoverColor = danger ? '#FCA5A5' : '#34D399'

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '10px 12px',
        borderRadius: 8,
        border: 'none',
        background: isHovered ? hoverBg : 'transparent',
        color: isHovered ? hoverColor : color,
        fontSize: '0.85rem',
        fontWeight: 500,
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textAlign: 'left',
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  )
}
