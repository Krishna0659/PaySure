import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, RefreshCw, Plus, ArrowDownRight, ArrowUpRight,
  Lock, Shield, CheckCircle, Clock,
} from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { useUserContext } from '../context/UserContext';
import { apiFetch } from '../lib/api';
import MinimalistDock from '../components/ui/minimal-dock';
import UserAvatarDropdown from '../components/ui/UserAvatarDropdown';
import BorderGlow from '../components/ui/BorderGlow';
import {
  FadeUp, SectionCard, EmptyState,
} from '../features/dashboard/components/DashboardShared';

// ── Transaction type config ──────────────────────────────────────────────────
const TXN_CONFIG = {
  deposit:     { icon: ArrowDownRight, color: '#34D399', label: 'Deposit',      prefix: '+', bg: 'rgba(52,211,153,0.1)' },
  escrow_lock: { icon: Lock,           color: '#60A5FA', label: 'Escrow Lock',  prefix: '-', bg: 'rgba(96,165,250,0.1)' },
  release:     { icon: ArrowUpRight,   color: '#34D399', label: 'Payment In',   prefix: '+', bg: 'rgba(52,211,153,0.1)' },
  refund:      { icon: Shield,         color: '#FBBF24', label: 'Refund',       prefix: '+', bg: 'rgba(251,191,36,0.1)' },
};

const STATUS_ICON = {
  completed: <CheckCircle size={12} color="#34D399" />,
  pending:   <Clock size={12} color="#FBBF24" />,
  failed:    <RefreshCw size={12} color="#F87171" />,
};

function TransactionRow({ txn, index }) {
  const cfg = TXN_CONFIG[txn.transaction_type] || TXN_CONFIG.deposit;
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: cfg.color, flexShrink: 0,
        }}>
          <Icon size={16} />
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ECFDF5', display: 'flex', alignItems: 'center', gap: 6 }}>
            {cfg.label}
            {STATUS_ICON[txn.status]}
          </div>
          {txn.description && (
            <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>{txn.description}</div>
          )}
          <div style={{ fontSize: '0.68rem', color: '#4B5563', marginTop: 2 }}>
            {new Date(txn.created_at).toLocaleString()}
          </div>
        </div>
      </div>
      <div style={{
        fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem',
        fontWeight: 700, color: cfg.color, flexShrink: 0,
      }}>
        {cfg.prefix}₹{Number(txn.amount).toLocaleString()}
      </div>
    </motion.div>
  );
}

// ── Add Money Modal ──────────────────────────────────────────────────────────
function AddMoneyModal({ onClose, onSuccess }) {
  const { getToken } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const PRESETS = [500, 1000, 2000, 5000, 10000];

  const handleDeposit = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { setError('Enter a valid amount'); return; }
    setLoading(true);
    setError('');
    try {
      await apiFetch('/wallet/deposit', {
        getToken, method: 'POST',
        body: { amount: val, currency: 'INR' },
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(10,20,16,0.97)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(52,211,153,0.2)', borderRadius: 20,
          padding: 32, width: '100%', maxWidth: 420,
        }}
      >
        <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.3rem', fontWeight: 800, color: '#ECFDF5', marginBottom: 6 }}>
          Add Money
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: 24 }}>
          Funds are added instantly to your wallet balance.
        </p>

        {/* Preset amounts */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {PRESETS.map(p => (
            <button key={p} onClick={() => setAmount(String(p))}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                background: amount === String(p) ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)',
                border: amount === String(p) ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: amount === String(p) ? '#34D399' : '#9CA3AF',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              ₹{p.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '1rem' }}>₹</span>
          <input
            type="number" min="1" placeholder="Enter amount"
            value={amount} onChange={e => setAmount(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px 12px 30px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#ECFDF5', fontSize: '1rem', outline: 'none', fontFamily: 'Inter, sans-serif',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,0.4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>

        {error && <p style={{ color: '#F87171', fontSize: '0.8rem', marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{
              flex: 1, padding: '12px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: '#9CA3AF', cursor: 'pointer',
            }}>
            Cancel
          </button>
          <button onClick={handleDeposit} disabled={loading || !amount}
            style={{
              flex: 2, padding: '12px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700,
              background: loading || !amount ? 'rgba(52,211,153,0.1)' : '#059669',
              border: '1px solid #10B981', color: '#fff',
              cursor: loading || !amount ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}>
            {loading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
            {loading ? 'Processing...' : 'Add Money'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function WalletPage() {
  const { profile, loading: profileLoading } = useUserContext();
  const { getToken } = useAuth();
  const role = profile?.role;

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddMoney, setShowAddMoney] = useState(false);

  const fetchWallet = useCallback(async () => {
    try {
      const [walletData, txnData] = await Promise.all([
        apiFetch('/wallet', { getToken }),
        apiFetch('/wallet/transactions', { getToken }),
      ]);
      setWallet(walletData);
      setTransactions(txnData || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!profileLoading && profile) fetchWallet();
  }, [profile, profileLoading, fetchWallet]);

  if (profileLoading || !profile) return (
    <div style={{ minHeight: '100vh', background: '#050A07', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <RefreshCw size={20} color="#34D399" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  const totalBalance = wallet ? (parseFloat(wallet.balance) + parseFloat(wallet.escrow_balance)) : 0;

  return (
    <AppShell role={role}>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      <AnimatePresence>
        {showAddMoney && (
          <AddMoneyModal
            onClose={() => setShowAddMoney(false)}
            onSuccess={() => { setLoading(true); fetchWallet(); }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <FadeUp delay={0}>
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{
              fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.75rem', fontWeight: 800,
              letterSpacing: '-0.03em', color: '#ECFDF5', marginBottom: 4,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Wallet size={24} color="#34D399" /> Wallet
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              {role === 'client'
                ? 'Manage your balance and fund projects.'
                : 'Track your earnings and available balance.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {role === 'client' && (
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setShowAddMoney(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 18px', borderRadius: 12,
                  background: '#059669', color: '#fff',
                  border: '1px solid #10B981', fontSize: '0.85rem', fontWeight: 600,
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                }}
              >
                <Plus size={16} /> Add Money
              </motion.button>
            )}
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
        <FadeUp delay={0.05}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 130, background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        </FadeUp>
      ) : wallet ? (
        <>
          {/* Balance Cards */}
          <FadeUp delay={0.05}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>

              {/* Total */}
              <BorderGlow backgroundColor="#0A1410" borderRadius={16} glowColor="196 71 95"
                glowRadius={30} glowIntensity={0.8} coneSpread={20}
                colors={['#34D399', '#10B981', '#059669']}>
                <div style={{ padding: '22px 24px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Total Balance
                  </div>
                  <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '2rem', fontWeight: 800, color: '#34D399', lineHeight: 1 }}>
                    ₹{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 8 }}>{wallet.currency}</div>
                </div>
              </BorderGlow>

              {/* Available */}
              <div style={{
                background: 'rgba(10,20,16,0.6)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 24px',
              }}>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Available
                </div>
                <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.6rem', fontWeight: 800, color: '#ECFDF5' }}>
                  ₹{parseFloat(wallet.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#34D399', marginTop: 8 }}>
                  {role === 'client' ? 'Ready to fund projects' : 'Ready to withdraw'}
                </div>
              </div>

              {/* Escrow Locked */}
              <div style={{
                background: 'rgba(10,20,16,0.6)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 24px',
              }}>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  In Escrow
                </div>
                <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.6rem', fontWeight: 800, color: '#60A5FA' }}>
                  ₹{parseFloat(wallet.escrow_balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#60A5FA', marginTop: 8 }}>
                  Locked in active projects
                </div>
              </div>
            </div>
          </FadeUp>

          {/* Client: Add Money CTA if balance is zero */}
          {role === 'client' && parseFloat(wallet.balance) === 0 && (
            <FadeUp delay={0.1}>
              <div style={{
                padding: '20px 24px', borderRadius: 14, marginBottom: 24,
                background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ECFDF5', marginBottom: 4 }}>
                    Your wallet is empty
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                    Add money to fund projects and pay freelancers.
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAddMoney(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '10px 18px', borderRadius: 10,
                    background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)',
                    color: '#34D399', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                    flexShrink: 0, marginLeft: 16,
                  }}>
                  <Plus size={14} /> Add Money
                </motion.button>
              </div>
            </FadeUp>
          )}

          {/* Transaction History */}
          <FadeUp delay={0.15}>
            <SectionCard>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#ECFDF5' }}>
                  Transaction History
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                  {transactions.length} transactions
                </span>
              </div>
              {transactions.length === 0 ? (
                <EmptyState
                  title="No transactions yet"
                  subtitle={role === 'client' ? 'Add money to get started.' : 'Your earnings will appear here.'}
                  icon={Wallet}
                />
              ) : (
                <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                  {transactions.map((txn, i) => (
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
