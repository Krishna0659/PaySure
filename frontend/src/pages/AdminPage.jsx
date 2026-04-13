import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Users, FileText, AlertTriangle, DollarSign, Shield,
  CheckCircle, XCircle, Clock, CreditCard, Activity, BarChart3,
  ChevronRight, ArrowDownRight, ArrowUpRight,
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

// ──────────────────────────────────────────────
// Admin Stat Card (compact)
// ──────────────────────────────────────────────
function MiniStat({ icon: Icon, label, value, accent = '#34D399' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
      background: 'rgba(10, 20, 16, 0.6)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12, transition: 'all 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${accent}30`}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${accent}12`, border: `1px solid ${accent}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent,
      }}>
        <Icon size={16} />
      </div>
      <div>
        <div style={{
          fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.25rem',
          fontWeight: 800, color: '#ECFDF5', lineHeight: 1,
        }}>
          {value}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Admin Dispute Row
// ──────────────────────────────────────────────
function AdminDisputeRow({ dispute, index, onResolve, onMarkReview }) {
  const [expanded, setExpanded] = useState(false);
  const [resolveType, setResolveType] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const isActionable = ['open', 'under_review'].includes(dispute.status);

  const handleResolve = async (type) => {
    setLoading(true);
    try {
      await onResolve(dispute.id, type, adminNotes);
      setResolveType(null);
      setAdminNotes('');
    } catch { /* handled upstream */ }
    finally { setLoading(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        padding: '14px 16px', cursor: 'pointer', transition: 'background 0.2s',
      }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Row header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={14} color={dispute.status === 'open' ? '#FBBF24' : '#60A5FA'} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ECFDF5' }}>
            {dispute.reason}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Badge status={dispute.status} />
          <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>
            {new Date(dispute.created_at).toLocaleDateString()}
          </span>
          <motion.div animate={{ rotate: expanded ? 90 : 0 }}>
            <ChevronRight size={14} color="#6B7280" />
          </motion.div>
        </div>
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              {dispute.description && (
                <p style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: '0 0 12px', lineHeight: 1.5 }}>
                  {dispute.description}
                </p>
              )}
              <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: 12 }}>
                Milestone ID: <span style={{ color: '#D1D5DB', fontFamily: 'monospace' }}>
                  {dispute.milestone_id}
                </span>
              </div>

              {/* Admin actions */}
              {isActionable && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {dispute.status === 'open' && (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => onMarkReview(dispute.id)}
                      style={{
                        padding: '8px 14px', borderRadius: 8,
                        background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)',
                        color: '#60A5FA', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <Clock size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                      Mark Under Review
                    </motion.button>
                  )}

                  {!resolveType ? (
                    <>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setResolveType('resolved_release')}
                        style={{
                          padding: '8px 14px', borderRadius: 8,
                          background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)',
                          color: '#34D399', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        <CheckCircle size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                        Release to Freelancer
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setResolveType('resolved_refund')}
                        style={{
                          padding: '8px 14px', borderRadius: 8,
                          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
                          color: '#F87171', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        <Shield size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                        Refund to Client
                      </motion.button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'center', marginTop: 8 }}>
                      <input placeholder="Admin notes (optional)..." value={adminNotes}
                        onChange={e => setAdminNotes(e.target.value)}
                        style={{
                          flex: 1, padding: '8px 12px', borderRadius: 8,
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#E2E8F0', fontSize: '0.8rem', outline: 'none',
                        }} />
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        disabled={loading}
                        onClick={() => handleResolve(resolveType)}
                        style={{
                          padding: '8px 14px', borderRadius: 8,
                          background: resolveType === 'resolved_release' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                          border: `1px solid ${resolveType === 'resolved_release' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
                          color: resolveType === 'resolved_release' ? '#34D399' : '#F87171',
                          fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {loading ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : 'Confirm'}
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => { setResolveType(null); setAdminNotes(''); }}
                        style={{
                          padding: '8px 14px', borderRadius: 8,
                          background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#9CA3AF', fontSize: '0.8rem', cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </motion.button>
                    </div>
                  )}
                </div>
              )}

              {dispute.admin_notes && (
                <div style={{
                  marginTop: 12, padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.1)',
                  fontSize: '0.78rem', color: '#D1D5DB',
                }}>
                  <strong style={{ color: '#34D399' }}>Resolution: </strong>{dispute.admin_notes}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ──────────────────────────────────────────────
// MAIN ADMIN PAGE
// ──────────────────────────────────────────────
export default function AdminPage() {
  const { profile, loading: profileLoading } = useUserContext();
  const { getToken } = useAuth();
  const role = profile?.role;

  const [stats, setStats] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('disputes');
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [statsData, disputesData, txnData] = await Promise.all([
        apiFetch('/admin/stats', { getToken }),
        apiFetch('/disputes/', { getToken }),
        apiFetch('/admin/transactions', { getToken }),
      ]);
      setStats(statsData);
      setDisputes(disputesData || []);
      setTransactions(txnData || []);
    } catch (e) {
      console.error('Admin fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!profileLoading && profile) fetchAll();
  }, [profile, profileLoading, fetchAll]);

  const handleResolve = async (disputeId, type, notes) => {
    await apiFetch(`/disputes/${disputeId}/resolve`, {
      getToken, method: 'POST',
      body: { status: type, admin_notes: notes || null },
    });
    await fetchAll();
  };

  const handleMarkReview = async (disputeId) => {
    await apiFetch(`/disputes/${disputeId}/review`, { getToken, method: 'POST' });
    await fetchAll();
  };

  if (profileLoading || !profile) return (
    <div style={{ minHeight: '100vh', background: '#050A07', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <RefreshCw size={20} color="#34D399" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  const TYPE_CONFIG = {
    deposit: { icon: ArrowDownRight, color: '#34D399', label: 'Deposit', prefix: '+' },
    release: { icon: ArrowUpRight, color: '#60A5FA', label: 'Release', prefix: '-' },
    refund:  { icon: Shield,       color: '#FBBF24', label: 'Refund', prefix: '+' },
  };

  return (
    <AppShell role={role}>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <FadeUp delay={0}>
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{
              fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.75rem', fontWeight: 800,
              letterSpacing: '-0.03em', color: '#ECFDF5', marginBottom: 4,
            }}>
              <BarChart3 size={22} style={{ marginRight: 8, verticalAlign: -4 }} />
              Admin Panel
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              Platform monitoring, dispute resolution, and system overview.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={fetchAll}
              style={{
                width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#9CA3AF', cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} />
            </motion.button>
            <div style={{ position: 'relative', height: 60, display: 'flex', alignItems: 'center' }}>
              <MinimalistDock />
            </div>
            <UserAvatarDropdown />
          </div>
        </div>
      </FadeUp>

      {loading ? (
        <FadeUp delay={0.1}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ height: 80, background: 'rgba(255,255,255,0.02)', borderRadius: 12, overflow: 'hidden' }}>
                <motion.div animate={{ opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ width: '100%', height: '100%', background: '#34D399', borderRadius: 8 }} />
              </div>
            ))}
          </div>
        </FadeUp>
      ) : (
        <>
          {/* Stats Grid */}
          {stats && (
            <FadeUp delay={0.05}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 24 }}>
                <MiniStat icon={Users} label="Total Users" value={stats.total_users} accent="#34D399" />
                <MiniStat icon={Users} label="Clients" value={stats.total_clients} accent="#60A5FA" />
                <MiniStat icon={Users} label="Freelancers" value={stats.total_freelancers} accent="#A78BFA" />
                <MiniStat icon={FileText} label="Invoices" value={stats.total_invoices} accent="#34D399" />
                <MiniStat icon={Activity} label="Active" value={stats.active_invoices} accent="#FBBF24" />
                <MiniStat icon={CheckCircle} label="Completed" value={stats.completed_invoices} accent="#34D399" />
                <MiniStat icon={AlertTriangle} label="Open Disputes" value={stats.open_disputes} accent="#F87171" />
                <MiniStat icon={DollarSign} label="Total Volume" value={`₹${Number(stats.total_volume).toLocaleString()}`} accent="#34D399" />
              </div>
            </FadeUp>
          )}

          {/* Tabs */}
          <FadeUp delay={0.1}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {[
                { key: 'disputes', label: 'Disputes', icon: AlertTriangle },
                { key: 'transactions', label: 'Transactions', icon: CreditCard },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 18px', borderRadius: 10,
                  background: activeTab === tab.key ? 'rgba(52,211,153,0.12)' : 'transparent',
                  border: activeTab === tab.key ? '1px solid rgba(52,211,153,0.3)' : '1px solid transparent',
                  color: activeTab === tab.key ? '#34D399' : '#9CA3AF',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  <tab.icon size={14} /> {tab.label}
                  {tab.key === 'disputes' && stats?.open_disputes > 0 && (
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'rgba(248,113,113,0.2)', color: '#F87171',
                      fontSize: '0.65rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {stats.open_disputes}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </FadeUp>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {activeTab === 'disputes' && (
              <motion.div key="disputes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <SectionCard>
                  <h3 style={{
                    fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700,
                    color: '#ECFDF5', marginBottom: 14,
                  }}>
                    <AlertTriangle size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
                    All Disputes ({disputes.length})
                  </h3>
                  {disputes.length === 0 ? (
                    <EmptyState title="No disputes" subtitle="The platform has no disputes at this time." icon={Shield} />
                  ) : (
                    <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                      {disputes.map((d, i) => (
                        <AdminDisputeRow key={d.id} dispute={d} index={i}
                          onResolve={handleResolve} onMarkReview={handleMarkReview} />
                      ))}
                    </div>
                  )}
                </SectionCard>
              </motion.div>
            )}

            {activeTab === 'transactions' && (
              <motion.div key="transactions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <SectionCard>
                  <h3 style={{
                    fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700,
                    color: '#ECFDF5', marginBottom: 14,
                  }}>
                    <CreditCard size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
                    All Transactions ({transactions.length})
                  </h3>
                  {transactions.length === 0 ? (
                    <EmptyState title="No transactions" subtitle="No payment activity recorded yet." icon={CreditCard} />
                  ) : (
                    <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                      {transactions.map((txn, i) => {
                        const cfg = TYPE_CONFIG[txn.payment_type] || TYPE_CONFIG.deposit;
                        const Icon = cfg.icon;
                        return (
                          <motion.div key={txn.id}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03, duration: 0.3 }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: 8,
                                background: `${cfg.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: cfg.color,
                              }}>
                                <Icon size={14} />
                              </div>
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ECFDF5' }}>{cfg.label}</div>
                                <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>
                                  {new Date(txn.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Badge status={txn.status} />
                              <span style={{
                                fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '0.95rem',
                                fontWeight: 700, color: cfg.color,
                              }}>
                                {cfg.prefix}₹{Number(txn.amount).toLocaleString()}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AppShell>
  );
}
