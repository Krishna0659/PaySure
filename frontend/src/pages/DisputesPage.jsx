import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, AlertTriangle, Shield, CheckCircle, Clock, Search,
  Plus, MessageSquare, XCircle, FileText, ChevronRight,
} from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { useUserContext } from '../context/UserContext';
import { apiFetch } from '../lib/api';
import MinimalistDock from '../components/ui/minimal-dock';
import UserAvatarDropdown from '../components/ui/UserAvatarDropdown';
import BorderGlow from '../components/ui/BorderGlow';
import {
  FadeUp, Badge, SectionCard, EmptyState,
} from '../features/dashboard/components/DashboardShared';

// ──────────────────────────────────────────────
// Dispute Status Config
// ──────────────────────────────────────────────
const DISPUTE_STATUS = {
  open:             { icon: AlertTriangle, color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  label: 'Open' },
  under_review:     { icon: Clock,         color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  label: 'Under Review' },
  resolved:         { icon: CheckCircle,   color: '#34D399', bg: 'rgba(52,211,153,0.1)',  label: 'Resolved' },
  resolved_release: { icon: CheckCircle,   color: '#34D399', bg: 'rgba(52,211,153,0.1)',  label: 'Resolved (Released)' },
  resolved_refund:  { icon: Shield,        color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  label: 'Resolved (Refunded)' },
  closed:           { icon: XCircle,       color: '#6B7280', bg: 'rgba(107,114,128,0.1)', label: 'Closed' },
};

// ──────────────────────────────────────────────
// Dispute Card
// ──────────────────────────────────────────────
function DisputeCard({ dispute, index }) {
  const cfg = DISPUTE_STATUS[dispute.status] || DISPUTE_STATUS.open;
  const Icon = cfg.icon;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
    >
      <BorderGlow backgroundColor="#0A1410" borderRadius={14}
        glowColor="196 71 95" glowRadius={20} glowIntensity={0.5}
        coneSpread={15} colors={['#34D399', '#10B981', '#059669']}>
        <div
          style={{ padding: '18px 22px', cursor: 'pointer', transition: 'all 0.2s' }}
          onClick={() => setExpanded(!expanded)}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: cfg.bg, border: `1px solid ${cfg.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: cfg.color, flexShrink: 0,
              }}>
                <Icon size={16} />
              </div>
              <div>
                <h4 style={{
                  fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '0.95rem',
                  fontWeight: 700, color: '#ECFDF5', margin: 0, marginBottom: 4,
                }}>
                  {dispute.reason}
                </h4>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                    background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}25`,
                  }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                    Filed: {new Date(dispute.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight size={16} color="#6B7280" />
            </motion.div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {dispute.description && (
                    <p style={{ fontSize: '0.82rem', color: '#9CA3AF', lineHeight: 1.6, margin: '0 0 12px' }}>
                      {dispute.description}
                    </p>
                  )}

                  {/* Timeline */}
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <TimelineStep label="Filed" date={dispute.created_at} active />
                    <TimelineStep label="Under Review"
                      date={dispute.status !== 'open' ? dispute.updated_at : null}
                      active={dispute.status !== 'open'} />
                    <TimelineStep label="Resolved"
                      date={dispute.resolved_at}
                      active={dispute.status.startsWith('resolved') || dispute.status === 'closed'} />
                  </div>

                  {dispute.admin_notes && (
                    <div style={{
                      marginTop: 12, padding: '10px 14px', borderRadius: 8,
                      background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)',
                    }}>
                      <div style={{ fontSize: '0.7rem', color: '#34D399', fontWeight: 600, marginBottom: 4 }}>
                        Admin Resolution
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#D1D5DB', margin: 0 }}>
                        {dispute.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </BorderGlow>
    </motion.div>
  );
}

function TimelineStep({ label, date, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: active ? '#34D399' : 'rgba(255,255,255,0.1)',
        border: active ? '2px solid rgba(52,211,153,0.3)' : '2px solid transparent',
        transition: 'all 0.3s',
      }} />
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: active ? '#ECFDF5' : '#6B7280' }}>
          {label}
        </div>
        {date && (
          <div style={{ fontSize: '0.62rem', color: '#4B5563' }}>
            {new Date(date).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Raise Dispute Modal
// ──────────────────────────────────────────────
function RaiseDisputeForm({ onSubmit, onCancel, loading }) {
  const [milestoneId, setMilestoneId] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    color: '#E2E8F0', fontSize: '0.85rem', outline: 'none', fontFamily: 'Inter, sans-serif',
    marginBottom: 12,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      style={{
        padding: 24, borderRadius: 16,
        background: 'rgba(10, 20, 16, 0.9)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(248,113,113,0.15)', marginBottom: 20,
      }}
    >
      <h3 style={{
        fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700,
        color: '#F87171', marginBottom: 16,
      }}>
        <AlertTriangle size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
        Raise a Dispute
      </h3>
      <input placeholder="Milestone ID (UUID)" value={milestoneId}
        onChange={e => setMilestoneId(e.target.value)} style={inputStyle}
        onFocus={e => e.target.style.borderColor = 'rgba(248,113,113,0.3)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
      <input placeholder="Reason for dispute" value={reason}
        onChange={e => setReason(e.target.value)} style={inputStyle}
        onFocus={e => e.target.style.borderColor = 'rgba(248,113,113,0.3)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
      <textarea placeholder="Detailed description (optional)" value={description}
        onChange={e => setDescription(e.target.value)} rows={3}
        style={{ ...inputStyle, resize: 'vertical' }}
        onFocus={e => e.target.style.borderColor = 'rgba(248,113,113,0.3)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
      <div style={{ display: 'flex', gap: 8 }}>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          disabled={!milestoneId || !reason || loading}
          onClick={() => onSubmit({ milestone_id: milestoneId, reason, description: description || null })}
          style={{
            padding: '10px 18px', borderRadius: 10,
            background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)',
            color: '#F87171', fontSize: '0.85rem', fontWeight: 600,
            cursor: !milestoneId || !reason ? 'not-allowed' : 'pointer',
            opacity: !milestoneId || !reason ? 0.5 : 1,
          }}
        >
          {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          Submit Dispute
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={onCancel}
          style={{
            padding: '10px 18px', borderRadius: 10,
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
            color: '#9CA3AF', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Cancel
        </motion.button>
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────
export default function DisputesPage() {
  const { profile, loading: profileLoading } = useUserContext();
  const { getToken } = useAuth();
  const role = profile?.role;

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchDisputes = useCallback(async () => {
    try {
      const data = await apiFetch('/disputes/my', { getToken });
      setDisputes(data || []);
      setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => {
    if (!profileLoading && profile) fetchDisputes();
  }, [profile, profileLoading, fetchDisputes]);

  const handleRaiseDispute = async (body) => {
    setSubmitting(true);
    try {
      await apiFetch('/disputes/', { getToken, method: 'POST', body });
      setShowForm(false);
      await fetchDisputes();
    } catch (e) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  const filtered = filter === 'all' ? disputes
    : disputes.filter(d => {
        if (filter === 'active') return ['open', 'under_review'].includes(d.status);
        if (filter === 'resolved') return d.status.startsWith('resolved') || d.status === 'closed';
        return true;
      });

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
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{
              fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.75rem', fontWeight: 800,
              letterSpacing: '-0.03em', color: '#ECFDF5', marginBottom: 4,
            }}>
              <Shield size={22} style={{ marginRight: 8, verticalAlign: -4 }} />
              Disputes
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              {role === 'client'
                ? 'Raise and track disputes against milestone submissions.'
                : 'View disputes raised against your work and track resolutions.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {role === 'client' && (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => setShowForm(!showForm)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 18px', borderRadius: 12,
                  background: showForm ? 'rgba(248,113,113,0.1)' : 'rgba(248,113,113,0.08)',
                  color: '#F87171', border: '1px solid rgba(248,113,113,0.25)',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {showForm ? <XCircle size={16} /> : <Plus size={16} />}
                {showForm ? 'Cancel' : 'Raise Dispute'}
              </motion.button>
            )}
            <div style={{ position: 'relative', height: 60, display: 'flex', alignItems: 'center' }}>
              <MinimalistDock />
            </div>
            <UserAvatarDropdown />
          </div>
        </div>
      </FadeUp>

      {/* Raise Dispute Form */}
      <AnimatePresence>
        {showForm && (
          <RaiseDisputeForm
            onSubmit={handleRaiseDispute} onCancel={() => setShowForm(false)}
            loading={submitting}
          />
        )}
      </AnimatePresence>

      {/* Filters */}
      <FadeUp delay={0.05}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['all', 'active', 'resolved'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '8px 16px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600,
              background: filter === f ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.03)',
              color: filter === f ? '#34D399' : '#9CA3AF',
              border: filter === f ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(255,255,255,0.05)',
              cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize',
            }}>
              {f}
            </button>
          ))}
          <span style={{ fontSize: '0.75rem', color: '#6B7280', alignSelf: 'center', marginLeft: 8 }}>
            {filtered.length} dispute{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </FadeUp>

      {/* Content */}
      {error ? (
        <div style={{ padding: 24, border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12, background: 'rgba(248,113,113,0.05)', color: '#F87171' }}>
          {error}
        </div>
      ) : loading ? (
        <FadeUp delay={0.1}>
          <div style={{ display: 'grid', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 80, background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <motion.div animate={{ opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ width: '100%', height: '100%', background: '#34D399', borderRadius: 8 }} />
              </div>
            ))}
          </div>
        </FadeUp>
      ) : filtered.length === 0 ? (
        <FadeUp delay={0.1}>
          <EmptyState title="No disputes found"
            subtitle={role === 'client'
              ? "No disputes raised yet. Use the 'Raise Dispute' button if needed."
              : "No disputes against your work. Keep up the great quality!"}
            icon={Shield} />
        </FadeUp>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map((d, i) => <DisputeCard key={d.id} dispute={d} index={i} />)}
        </div>
      )}
    </AppShell>
  );
}
