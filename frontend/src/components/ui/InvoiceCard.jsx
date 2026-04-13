import React, { useRef, useState, useCallback, useMemo } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import BorderGlow from './BorderGlow';
import { Badge } from '../../features/dashboard/components/DashboardShared';

function getInvoiceAction(invoice, role) {
  if (role === 'client') {
    switch (invoice.status) {
      case 'draft':
      case 'sent': return { label: 'Fund Project', primary: true, disabled: false };
      case 'in_progress': return { label: 'View Progress', primary: false, disabled: false };
      case 'funded': return { label: 'View Details', primary: false, disabled: false };
      case 'completed': return { label: 'Completed', primary: false, disabled: true };
      case 'cancelled': return { label: 'Cancelled', primary: false, disabled: true };
      default: return { label: 'View', primary: false, disabled: false };
    }
  } else {
    switch (invoice.status) {
      case 'funded': return { label: 'Start Work', primary: true, disabled: false };
      case 'in_progress': return { label: 'View Work', primary: true, disabled: false };
      case 'submitted': return { label: 'Awaiting Approval', primary: false, disabled: true };
      case 'completed': return { label: 'Completed', primary: false, disabled: true };
      case 'cancelled': return { label: 'Cancelled', primary: false, disabled: true };
      default: return { label: 'View', primary: false, disabled: false };
    }
  }
}

export default function InvoiceCard({ invoice, role, onClick }) {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Optimized HoloTilt Transform Logic
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const springConfig = { damping: 20, stiffness: 200, mass: 0.5 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  // Restricted max rotate to ±6deg to keep it subtle
  const rotateX = useTransform(springY, [0, 1], [6, -6]);
  const rotateY = useTransform(springX, [0, 1], [-6, 6]);

  const handlePointerMove = useCallback((e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const mouseX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const mouseY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    x.set(mouseX / (rect.width || 1));
    y.set(mouseY / (rect.height || 1));
  }, [x, y]);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    x.set(0.5);
    y.set(0.5);
  }, [x, y]);

  const handlePointerEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const otherParty = role === "client" ? invoice.freelancer_name : invoice.client_name;
  const formattedDate = new Date(invoice.created_at).toLocaleDateString();
  const action = useMemo(() => getInvoiceAction(invoice, role), [invoice.status, role]);

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      style={{
        perspective: 800,
        transformStyle: 'preserve-3d',
        width: '100%',
        cursor: 'pointer'
      }}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          scale: isHovered ? 1.02 : 1,
          translateZ: isHovered ? 10 : 0,
          transformStyle: 'preserve-3d',
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <BorderGlow
          backgroundColor="#0A1410"
          borderRadius={16}
          glowColor="196 71 95"
          glowRadius={25}
          glowIntensity={isHovered ? 1.0 : 0.6}
          coneSpread={isHovered ? 25 : 15}
          colors={['#34D399', '#10B981', '#059669']}
          animated={false}
          className="h-full"
        >
          <div
            style={{
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '16px',
              background: 'rgba(10, 20, 16, 0.6)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '220px',
              transformStyle: 'preserve-3d'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', transform: 'translateZ(10px)' }}>
              <div>
                <h3 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.15rem', fontWeight: 800, color: '#ECFDF5', marginBottom: '4px' }}>
                  {invoice.title}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
                  {role === 'client' ? 'Freelancer' : 'Client'}: <span style={{ color: '#E2E8F0', fontWeight: 500 }}>{otherParty || 'Pending Assignment'}</span>
                </p>
                <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px' }}>
                  {formattedDate}
                </p>
              </div>
              <div style={{ transform: 'translateZ(15px)' }}>
                <Badge status={invoice.status} />
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '24px', transform: 'translateZ(12px)' }}>
              <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.85rem', fontWeight: 800, color: '#34D399' }}>
                {invoice.currency} {invoice.total_amount?.toLocaleString() || '0'}
              </div>
            </div>

            <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', transform: 'translateZ(8px)' }}>
              <button
                disabled={action.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: action.disabled 
                    ? 'rgba(255,255,255,0.03)' 
                    : action.primary ? 'rgba(52,211,153,0.1)' : 'transparent',
                  border: action.disabled
                    ? '1px solid transparent'
                    : action.primary ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  color: action.disabled ? '#6B7280' : action.primary ? '#34D399' : '#D1D5DB',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: action.disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center'
                }}
                onMouseEnter={e => {
                  if (action.disabled) return;
                  if (action.primary) {
                    e.currentTarget.style.background = 'rgba(52,211,153,0.15)';
                  } else {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }
                }}
                onMouseLeave={e => {
                  if (action.disabled) return;
                  if (action.primary) {
                    e.currentTarget.style.background = 'rgba(52,211,153,0.1)';
                  } else {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {action.label}
              </button>
            </div>
          </div>
        </BorderGlow>
      </motion.div>
    </motion.div>
  );
}
