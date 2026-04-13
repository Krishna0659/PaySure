import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, DollarSign, Lock, TrendingUp, ArrowDownRight, ArrowUpRight,
  CreditCard, Shield, Wallet, Clock, CheckCircle,
} from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { useUserContext } from '../context/UserContext';
import { apiFetch } from '../lib/api';
import MinimalistDock from '../components/ui/minimal-dock';
import UserAvatarDropdown from '../components/ui/UserAvatarDropdown';
import BorderGlow from '../components/ui/BorderGlow';
import {
  FadeUp, StatCard, SectionCard, EmptyState, Badge,
} from '../features/dashboard/components/DashboardShared';

const TYPE_CONFIG = {
  deposit: { icon: ArrowDownRight, color: '#34D399', label: 'Deposit', prefix: '+' },
  release: { icon: ArrowUpRight, color: '#60A5FA', label: 'Release', prefix: '-' },
  refund:  { icon: Shield,       color: '#FBBF24', label: 'Refund', prefix: '+' },
};

function TransactionRow({ txn, index }) {
  const cfg = TYPE_CONFIG[txn.payment_type] || TYPE_CONFIG.deposit;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${cfg.color}15`, border: `1px solid ${cfg.color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: cfg.color,
        }}>
          <Icon size={16} />
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ECFDF5' }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: 2 }}>
            {new Date(txn.created_at).toLocaleString()}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Badge status={txn.status} />
        <div style={{
          fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem',
          fontWeight: 700, color: cfg.color,
        }}>
          {cfg.prefix}₹{Number(txn.amount).toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
}

export default function PaymentsPage() {
  const { profile, loading: profileLoading } = useUserContext();
  const { getToken } = useAuth();
  const role = profile?.role;

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!profileLoading && profile) {
      const fetchSummary = async () => {
        try {
          const data = await apiFetch('/payments/summary', { getToken });
          setSummary(data);
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      };
      fetchSummary();
    }
  }, [profile, profileLoading, getToken]);

  if (profileLoading || !profile) return (
    <div style={{ minHeight: '100vh', background: '#050A07', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <RefreshCw size={20} color="#34D399" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <AppShell role={role}>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <FadeUp delay={0}>
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{
              fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.75rem', fontWeight: 800,
              letterSpacing: '-0.03em', color: '#ECFDF5', marginBottom: 4,
            }}>
              <Wallet size={22} style={{ marginRight: 8, verticalAlign: -4 }} />
              Payments
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              {role === 'client'
                ? 'Track your deposits, escrow locks, and released payments.'
                : 'Monitor your earnings, escrow funds, and payment releases.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', height: 60, display: 'flex', alignItems: 'center' }}>
              <MinimalistDock />
            </div>
            <UserAvatarDropdown />
          </div>
        </div>
      </FadeUp>

      {error ? (
        <div style={{ padding: 24, border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12, background: 'rgba(248,113,113,0.05)', color: '#F87171' }}>
          {error}
        </div>
      ) : loading ? (
        <FadeUp delay={0.1}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 120, background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <motion.div animate={{ opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: '100%', height: '100%', background: '#34D399', borderRadius: 8 }} />
              </div>
            ))}
          </div>
        </FadeUp>
      ) : summary ? (
        <>
          {/* Stat Cards */}
          <FadeUp delay={0.05}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
              {role === 'client' ? (
                <>
                  <StatCard label="Total Deposited" value={`₹${summary.total_deposited?.toLocaleString() || '0'}`} />
                  <StatCard label="Escrow Locked" value={`₹${summary.locked_in_escrow?.toLocaleString() || '0'}`} />
                  <StatCard label="Total Paid Out" value={`₹${summary.total_released?.toLocaleString() || '0'}`} />
                  <StatCard label="Total Refunded" value={`₹${summary.total_refunded?.toLocaleString() || '0'}`} sub="Returned funds" />
                </>
              ) : (
                <>
                  <StatCard label="Total Earned" value={`₹${summary.total_earned?.toLocaleString() || '0'}`} />
                  <StatCard label="Escrow Balance" value={`₹${summary.in_escrow?.toLocaleString() || '0'}`} />
                  <StatCard label="Total Paid Out" value={`₹${summary.total_released?.toLocaleString() || '0'}`} />
                </>
              )}
            </div>
          </FadeUp>

          {/* Transactions */}
          <FadeUp delay={0.12}>
            <SectionCard>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{
                  fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#ECFDF5',
                }}>
                  <CreditCard size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
                  Transaction History
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                  {(summary.transactions || []).length} transactions
                </span>
              </div>
              {(summary.transactions || []).length === 0 ? (
                <EmptyState title="No transactions yet" subtitle="Your payment history will appear here." icon={CreditCard} />
              ) : (
                <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                  {(summary.transactions || []).map((txn, i) => (
                    <TransactionRow key={txn.id} txn={txn} index={i} />
                  ))}
                </div>
              )}
            </SectionCard>
          </FadeUp>
        </>
      ) : null}
    </AppShell>
  );
}
