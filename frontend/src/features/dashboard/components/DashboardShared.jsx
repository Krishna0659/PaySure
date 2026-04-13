import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, CheckCircle, Lock, AlertCircle, FileText } from 'lucide-react';
import BorderGlow from '../../../components/ui/BorderGlow';

export const FadeUp = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay, ease: [0.4, 0, 0.2, 1] }}
  >
    {children}
  </motion.div>
);

export function getIconForStat(label) {
  const map = {
    'Total Earned': TrendingUp,
    'Active Projects': FileText,
    'Pending Approval': Clock,
    'Escrow Locked': Lock,
    'Escrow Balance': Lock,
    'Awaiting Approval': Clock,
    'Total Paid Out': CheckCircle
  };
  return map[label] || AlertCircle;
}

export function getAccentForStat(label) {
  const map = {
    'Total Earned': '#34D399',
    'Total Paid Out': '#34D399',
    'Active Projects': '#34D399',
    'Pending Approval': '#FBBF24',
    'Awaiting Approval': '#FBBF24',
    'Escrow Locked': '#60A5FA',
    'Escrow Balance': '#60A5FA',
  };
  return map[label] || '#34D399';
}

function SkeletonBlock({ height, width = '100%', style }) {
  return (
    <motion.div
      animate={{ opacity: [0.1, 0.3, 0.1] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      style={{
        background: '#34D399', height, width,
        borderRadius: 8, ...style
      }}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <FadeUp>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[1,2,3,4].map(i => <SkeletonBlock key={i} height={120} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <SkeletonBlock height={250} />
        <SkeletonBlock height={250} />
      </div>
    </FadeUp>
  );
}

export function StatCard({ label, value, sub }) {
  const Icon = getIconForStat(label);
  const accent = getAccentForStat(label);
  return (
    <BorderGlow
      glowColor="196 71 95"
      backgroundColor="#0A1410"
      borderRadius={14}
      glowRadius={30}
      glowIntensity={0.8}
      coneSpread={20}
      colors={['#34D399', '#10B981', '#059669']}
    >
      <div style={{
        padding: '20px 22px',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 80, height: 80,
          background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
          borderRadius: '0 14px 0 0',
        }} />
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${accent}15`,
          border: `1px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent,
        }}>
          <Icon size={16} />
        </div>
        <div>
          <div style={{
            fontFamily: 'Cabinet Grotesk, sans-serif',
            fontSize: '1.65rem', fontWeight: 800,
            letterSpacing: '-0.02em', color: '#ECFDF5', lineHeight: 1,
            marginBottom: 4
          }}>{value}</div>
          <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 4 }}>{label}</div>
          {sub && <div style={{ fontSize: '0.72rem', color: accent, marginTop: 3 }}>{sub}</div>}
        </div>
      </div>
    </BorderGlow>
  );
}

export function Badge({ status }) {
  const map = {
    funded:    { bg: 'rgba(52,211,153,0.1)', color: '#34D399', border: 'rgba(52,211,153,0.2)', label: 'Funded' },
    submitted: { bg: 'rgba(251,191,36,0.1)',  color: '#FBBF24', border: 'rgba(251,191,36,0.2)',  label: 'Submitted' },
    approved:  { bg: 'rgba(52,211,153,0.1)',  color: '#34D399', border: 'rgba(52,211,153,0.2)',  label: 'Approved' },
    released:  { bg: 'rgba(52,211,153,0.1)',  color: '#34D399', border: 'rgba(52,211,153,0.2)',  label: 'Released' },
    captured:  { bg: 'rgba(52,211,153,0.1)',  color: '#34D399', border: 'rgba(52,211,153,0.2)',  label: 'Captured' },
    sent:      { bg: 'rgba(96,165,250,0.1)',  color: '#60A5FA', border: 'rgba(96,165,250,0.2)',  label: 'Sent' },
    in_progress: { bg: 'rgba(96,165,250,0.1)',  color: '#60A5FA', border: 'rgba(96,165,250,0.2)',  label: 'Active' },
    disputed:  { bg: 'rgba(248,113,113,0.1)', color: '#F87171', border: 'rgba(248,113,113,0.2)', label: 'Disputed' },
    draft:     { bg: 'rgba(107,114,128,0.1)', color: '#6B7280', border: 'rgba(107,114,128,0.2)', label: 'Draft' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{
      fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px',
      borderRadius: 6, background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      textTransform: 'capitalize'
    }}>{s.label}</span>
  );
}

export function SectionCard({ children }) {
  return (
    <BorderGlow
      backgroundColor="#0A1410" borderRadius={14}
      glowColor="196 71 95" glowRadius={25}
      glowIntensity={0.7} coneSpread={20}
      colors={['#34D399', '#10B981', '#059669']}
    >
      <div style={{ padding: '20px 22px' }}>
        {children}
      </div>
    </BorderGlow>
  );
}

export function EmptyState({ title, subtitle, icon: Icon = FileText }) {
  return (
     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', opacity: 0.6 }}>
       <Icon size={32} color="#6B7280" style={{ marginBottom: 12 }} />
       <p style={{ fontSize: '0.85rem', color: '#9CA3AF', fontWeight: 500 }}>{title}</p>
       <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 4 }}>{subtitle}</p>
     </div>
  );
}
