import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { useClerk } from '@clerk/react'
import {
  LayoutDashboard, FileText, Plus, CreditCard,
  AlertCircle, ShieldCheck, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react'
import { NAVIGATION_CONFIG } from '../../config/navigation'

export default function Sidebar({ role }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useClerk()
  const [collapsed, setCollapsed] = useState(false)

  const adminLinks = [
    { icon: LayoutDashboard, label: 'Dashboard',   path: '/dashboard' },
    { icon: ShieldCheck,     label: 'Admin Panel', path: '/admin' },
    { icon: AlertCircle,     label: 'All Disputes',path: '/disputes' },
    { icon: CreditCard,      label: 'Payments',    path: '/payments' },
  ]

  const links = role === 'admin' ? adminLinks : (NAVIGATION_CONFIG[role] || []);

  return (
    <div 
      className="fixed top-0 left-0 z-50 flex flex-col h-screen overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{
        width: collapsed ? 64 : 220,
        background: 'linear-gradient(180deg, rgba(20, 20, 24, 0.55) 0%, rgba(13, 13, 15, 0.8) 100%)',
        backdropFilter: 'blur(20px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.2), inset -1px 0 0 rgba(52,211,153,0.05)',
      }}
    >

      {/* Logo */}
      <div className="flex items-center border-b border-white/5 transition-all duration-300"
           style={{
             padding: collapsed ? '24px 0' : '24px 20px',
             justifyContent: collapsed ? 'center' : 'space-between',
           }}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="text-slate-100 font-extrabold tracking-tight text-xl"
            style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}
          >
            Pay<span className="text-[#34D399]">Sure</span>
          </motion.span>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="flex items-center justify-center p-1.5 rounded-lg border transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderColor: 'rgba(255,255,255,0.06)',
            color: '#6B7280',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.1)'; e.currentTarget.style.color = '#34D399'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Role badge */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="px-5 py-3"
        >
          <span className="inline-block px-2 py-1 text-[11px] font-semibold tracking-widest uppercase rounded-md border"
                style={{
                  color: '#34D399', 
                  background: 'rgba(52,211,153,0.08)',
                  borderColor: 'rgba(52,211,153,0.15)',
                }}>
            {role || 'loading...'}
          </span>
        </motion.div>
      )}

      {/* Nav links */}
      <nav className="flex-1 flex flex-col transition-all duration-300"
           style={{ padding: collapsed ? '12px 0' : '8px 10px', gap: '4px' }}>
        {links.map(({ icon: Icon, label, path }, i) => {
          const active = location.pathname === path
          return (
            <motion.button
              key={path}
              onClick={() => navigate(path)}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 + 0.1, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              whileHover={{ x: collapsed ? 0 : 4 }}
              className={`flex items-center w-full rounded-lg cursor-pointer transition-all duration-200 ${
                collapsed ? 'justify-center py-2.5' : 'justify-start px-3 py-2.5 gap-3'
              }`}
              style={{
                background: active ? 'rgba(52,211,153,0.12)' : 'transparent',
                border: active ? '1px solid rgba(52,211,153,0.2)' : '1px solid transparent',
                color: active ? '#FFFFFF' : '#6B7280',
                fontSize: '0.85rem', fontWeight: 500, fontFamily: 'Inter, sans-serif',
                textShadow: active ? '0 0 10px rgba(52,211,153,0.4)' : 'none',
                boxShadow: active ? 'inset 0 0 12px rgba(52,211,153,0.05), 0 4px 12px rgba(0,0,0,0.1)' : 'none'
              }}
              onMouseEnter={e => { 
                if (!active) { 
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; 
                  e.currentTarget.style.color = '#34D399';
                  e.currentTarget.style.backdropFilter = 'blur(4px)';
                }
              }}
              onMouseLeave={e => { 
                if (!active) { 
                  e.currentTarget.style.background = 'transparent'; 
                  e.currentTarget.style.color = '#6B7280';
                  e.currentTarget.style.backdropFilter = 'none';
                }
              }}
            >
              <Icon size={18} className={active ? 'drop-shadow-md' : ''} />
              {!collapsed && label}
            </motion.button>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t border-white/5 transition-all duration-300" style={{ padding: collapsed ? '16px 0' : '16px 10px' }}>
        <motion.button
          onClick={() => signOut(() => navigate('/'))}
          whileHover={{ x: collapsed ? 0 : 4 }}
          className={`flex items-center w-full rounded-lg cursor-pointer transition-all duration-200 ${
            collapsed ? 'justify-center py-3' : 'justify-start px-3 py-2.5 gap-3'
          }`}
          style={{
            background: 'transparent', border: '1px solid transparent',
            color: '#6B7280', fontSize: '0.85rem', fontWeight: 500, fontFamily: 'Inter, sans-serif'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={16} />
          {!collapsed && 'Sign Out'}
        </motion.button>
      </div>
    </div>
  )
}