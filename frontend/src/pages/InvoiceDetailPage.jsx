import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { useWebSocketChat } from '../hooks/useWebSocketChat';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock, Lock, Send,
  AlertTriangle, DollarSign, MessageCircle, FileText, Star, Upload,
  ChevronDown, Zap, Shield, ExternalLink, Users, UserCheck,
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
// Milestone status configuration
// ──────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:      { icon: Lock,          color: '#6B7280', bg: 'rgba(107,114,128,0.1)', label: 'Locked' },
  in_progress:  { icon: Zap,           color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  label: 'Active' },
  submitted:    { icon: Clock,         color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  label: 'Submitted' },
  approved:     { icon: CheckCircle,   color: '#34D399', bg: 'rgba(52,211,153,0.1)',  label: 'Approved' },
  released:     { icon: DollarSign,    color: '#34D399', bg: 'rgba(52,211,153,0.15)', label: 'Released' },
  disputed:     { icon: AlertTriangle, color: '#F87171', bg: 'rgba(248,113,113,0.1)', label: 'Disputed' },
  refunded:     { icon: Shield,        color: '#F87171', bg: 'rgba(248,113,113,0.1)', label: 'Refunded' },
};

// ──────────────────────────────────────────────
// Reusable small components
// ──────────────────────────────────────────────
function GlassCard({ children, style, ...props }) {
  return (
    <div style={{
      background: 'rgba(10, 20, 16, 0.6)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16,
      padding: 24, ...style,
    }} {...props}>
      {children}
    </div>
  );
}

function ActionButton({ children, onClick, variant = 'primary', disabled, loading, style }) {
  const variants = {
    primary:  { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)', color: '#34D399', hover: 'rgba(52,211,153,0.2)' },
    danger:   { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', color: '#F87171', hover: 'rgba(248,113,113,0.2)' },
    warning:  { bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)',  color: '#FBBF24', hover: 'rgba(251,191,36,0.2)' },
    ghost:    { bg: 'transparent',            border: 'rgba(255,255,255,0.1)', color: '#D1D5DB', hover: 'rgba(255,255,255,0.05)' },
  };
  const v = variants[variant];
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }} whileTap={{ scale: disabled ? 1 : 0.97 }}
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 18px', borderRadius: 10,
        background: v.bg, border: `1px solid ${v.border}`, color: v.color,
        fontSize: '0.85rem', fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s', ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = v.hover; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = v.bg; }}
    >
      {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
      {children}
    </motion.button>
  );
}

function TabButton({ active, onClick, children, icon: Icon }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '10px 18px', borderRadius: 10,
      background: active ? 'rgba(52,211,153,0.12)' : 'transparent',
      border: active ? '1px solid rgba(52,211,153,0.3)' : '1px solid transparent',
      color: active ? '#34D399' : '#9CA3AF',
      fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
    }}>
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

// ──────────────────────────────────────────────
// Milestone Timeline Node
// ──────────────────────────────────────────────
function MilestoneNode({ milestone, index, total, role, onAction, actionLoading }) {
  const cfg = STATUS_CONFIG[milestone.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const isLast = index === total - 1;
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitUrl, setSubmitUrl] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      style={{ display: 'flex', gap: 20 }}
    >
      {/* Timeline track */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44 }}>
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: index * 0.08 + 0.1, type: 'spring', stiffness: 300 }}
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: cfg.bg, border: `2px solid ${cfg.color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: cfg.color, flexShrink: 0,
          }}
        >
          <Icon size={18} />
        </motion.div>
        {!isLast && (
          <div style={{
            width: 2, flex: 1, minHeight: 40,
            background: milestone.status === 'released' || milestone.status === 'approved'
              ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.06)',
            transition: 'background 0.3s',
          }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
        <BorderGlow backgroundColor="#0A1410" borderRadius={14}
          glowColor="196 71 95" glowRadius={20} glowIntensity={0.5}
          coneSpread={15} colors={['#34D399', '#10B981', '#059669']}>
          <div style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: 500 }}>
                    #{index + 1}
                  </span>
                  <h4 style={{
                    fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700,
                    color: '#ECFDF5', margin: 0,
                  }}>
                    {milestone.title}
                  </h4>
                </div>
                {milestone.description && (
                  <p style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: 0, lineHeight: 1.5, maxWidth: 400 }}>
                    {milestone.description}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <Badge status={milestone.status} />
                <span style={{
                  fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.1rem',
                  fontWeight: 800, color: '#34D399',
                }}>
                  ₹{Number(milestone.amount).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Meta row */}
            <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
              {milestone.due_date && (
                <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                  Due: {new Date(milestone.due_date).toLocaleDateString()}
                </span>
              )}
              {milestone.submitted_at && (
                <span style={{ fontSize: '0.72rem', color: '#FBBF24' }}>
                  Submitted: {new Date(milestone.submitted_at).toLocaleString()}
                </span>
              )}
              {milestone.approved_at && (
                <span style={{ fontSize: '0.72rem', color: '#34D399' }}>
                  Approved: {new Date(milestone.approved_at).toLocaleString()}
                </span>
              )}
              {milestone.released_at && (
                <span style={{ fontSize: '0.72rem', color: '#34D399' }}>
                  Released: {new Date(milestone.released_at).toLocaleString()}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}
              >
                {/* Freelancer: Submit */}
                {role === 'freelancer' && milestone.status === 'in_progress' && !showSubmit && (
                  <ActionButton variant="primary" onClick={() => setShowSubmit(true)}>
                    <Upload size={14} /> Submit Work
                  </ActionButton>
                )}
                {role === 'freelancer' && milestone.status === 'in_progress' && showSubmit && (
                  <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'center' }}>
                    <input
                      placeholder="Deliverable URL or notes..."
                      value={submitUrl} onChange={e => setSubmitUrl(e.target.value)}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#E2E8F0', fontSize: '0.82rem', outline: 'none',
                      }}
                    />
                    <ActionButton variant="primary" loading={actionLoading}
                      onClick={() => onAction('submit', milestone.id, submitUrl)}>
                      <Send size={14} /> Submit
                    </ActionButton>
                    <ActionButton variant="ghost" onClick={() => setShowSubmit(false)}>Cancel</ActionButton>
                  </div>
                )}

                {/* Client: Approve / Reject / Release */}
                {role === 'client' && milestone.status === 'submitted' && (
                  <>
                    <ActionButton variant="primary" loading={actionLoading}
                      onClick={() => onAction('release', milestone.id)}>
                      <CheckCircle size={14} /> Approve & Pay
                    </ActionButton>
                    {!showReject ? (
                      <ActionButton variant="danger" onClick={() => setShowReject(true)}>
                        <XCircle size={14} /> Reject
                      </ActionButton>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'center' }}>
                        <input
                          placeholder="Reason for rejection..."
                          value={rejectFeedback} onChange={e => setRejectFeedback(e.target.value)}
                          style={{
                            flex: 1, padding: '8px 12px', borderRadius: 8,
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(248,113,113,0.2)',
                            color: '#E2E8F0', fontSize: '0.82rem', outline: 'none',
                          }}
                        />
                        <ActionButton variant="danger" loading={actionLoading}
                          onClick={() => onAction('reject', milestone.id, rejectFeedback)}>
                          Confirm Reject
                        </ActionButton>
                        <ActionButton variant="ghost" onClick={() => setShowReject(false)}>Cancel</ActionButton>
                      </div>
                    )}
                  </>
                )}

                {/* Client: Approve if auto-approved */}
                {role === 'client' && milestone.status === 'approved' && (
                  <ActionButton variant="primary" loading={actionLoading}
                    onClick={() => onAction('release', milestone.id)}>
                    <DollarSign size={14} /> Release Payment
                  </ActionButton>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </BorderGlow>
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────
// Chat Message Component
// ──────────────────────────────────────────────
function ChatBubble({ msg, isOwn }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: 8,
      }}
    >
      <div style={{
        maxWidth: '70%', padding: '10px 14px', borderRadius: 12,
        background: isOwn ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isOwn ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: isOwn ? '#34D399' : '#60A5FA' }}>
            {msg.sender_name || 'User'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#6B7280' }}>
            {msg.sender_role === 'client' ? 'Client' : 'Freelancer'}
          </span>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#E2E8F0', margin: 0, lineHeight: 1.5 }}>
          {msg.content}
        </p>
        {msg.file_url && (
          <a href={msg.file_url} target="_blank" rel="noreferrer"
            style={{ fontSize: '0.72rem', color: '#60A5FA', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <ExternalLink size={10} /> {msg.file_name || 'Attachment'}
          </a>
        )}
        <div style={{ fontSize: '0.62rem', color: '#4B5563', marginTop: 4, textAlign: 'right' }}>
          {new Date(msg.created_at).toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────
// Rating Component
// ──────────────────────────────────────────────
function RatingSection({ invoiceId, role, status, getToken }) {
  const [rating, setRating] = useState(null);
  const [hoverStar, setHoverStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const data = await apiFetch(`/ratings/invoice/${invoiceId}`, { getToken });
        if (data) { setRating(data); setSubmitted(true); }
      } catch { /* no rating yet */ }
    };
    if (status === 'completed') fetch_();
  }, [invoiceId, status, getToken]);

  const handleSubmit = async () => {
    if (selectedStar === 0) return;
    setSubmitting(true);
    try {
      const data = await apiFetch('/ratings/', {
        getToken, method: 'POST',
        body: { invoice_id: invoiceId, rating: selectedStar, review: review || null },
      });
      setRating(data);
      setSubmitted(true);
    } catch (e) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  if (status !== 'completed') return null;

  return (
    <GlassCard style={{ marginTop: 20 }}>
      <h3 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#ECFDF5', marginBottom: 12 }}>
        <Star size={16} style={{ marginRight: 6, verticalAlign: -2, color: '#FBBF24' }} />
        {submitted ? 'Project Rating' : 'Rate this project'}
      </h3>
      {submitted && rating ? (
        <div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={20} fill={s <= rating.rating ? '#FBBF24' : 'transparent'}
                color={s <= rating.rating ? '#FBBF24' : '#4B5563'} />
            ))}
          </div>
          {rating.review && <p style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>{rating.review}</p>}
        </div>
      ) : role === 'client' ? (
        <div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={24} style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                fill={s <= (hoverStar || selectedStar) ? '#FBBF24' : 'transparent'}
                color={s <= (hoverStar || selectedStar) ? '#FBBF24' : '#4B5563'}
                onMouseEnter={() => setHoverStar(s)} onMouseLeave={() => setHoverStar(0)}
                onClick={() => setSelectedStar(s)} />
            ))}
          </div>
          <textarea placeholder="Write a review (optional)..." value={review}
            onChange={e => setReview(e.target.value)} rows={2}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8, resize: 'vertical',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#E2E8F0', fontSize: '0.82rem', outline: 'none', marginBottom: 10,
              fontFamily: 'Inter, sans-serif',
            }}
          />
          <ActionButton onClick={handleSubmit} loading={submitting} disabled={selectedStar === 0}>
            Submit Rating
          </ActionButton>
        </div>
      ) : (
        <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>Waiting for client review...</p>
      )}
    </GlassCard>
  );
}

// ──────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ──────────────────────────────────────────────
export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { profile, loading: profileLoading } = useUserContext();
  const role = profile?.role;

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('milestones');
  const [actionLoading, setActionLoading] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  // Applications state
  const [applications, setApplications] = useState([]);
  const [myApplication, setMyApplication] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [proposalText, setProposalText] = useState('');
  const [rulesAccepted, setRulesAccepted] = useState(false);

  // ── Fetch invoice data ──
  const fetchInvoice = useCallback(async () => {
    try {
      const data = await apiFetch(`/invoices/${id}`, { getToken });
      setInvoice(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => {
    if (!profileLoading && profile) fetchInvoice();
  }, [profile, profileLoading, fetchInvoice]);

  // ── Fetch applications (client) ──
  const fetchApplications = useCallback(async () => {
    if (role !== 'client') return;
    try {
      const data = await apiFetch(`/applications/invoice/${id}`, { getToken });
      setApplications(data || []);
    } catch { /* silent */ }
  }, [id, getToken, role]);

  const fetchMyApplication = useCallback(async () => {
    if (role !== 'freelancer') return;
    try {
      const data = await apiFetch('/applications/mine', { getToken });
      const mine = (data || []).find(a => a.invoice_id === id);
      setMyApplication(mine || null);
    } catch { /* silent */ }
  }, [id, getToken, role]);

  useEffect(() => {
    if (activeTab === 'applications' && profile) fetchApplications();
  }, [activeTab, profile, fetchApplications]);

  useEffect(() => {
    if (activeTab === 'my-application' && profile) fetchMyApplication();
  }, [activeTab, profile, fetchMyApplication]);

  // ── WebSocket chat ──
  const { connected: chatConnected, sendMessage: wsSendMessage } = useWebSocketChat(id, {
    enabled: activeTab === 'chat' && !!profile,
    getToken,
    onMessage: (msg) => setMessages(prev => [...prev, msg]),
  });

  useEffect(() => {
    if (activeTab === 'chat' && profile) {
      apiFetch(`/messages/invoice/${id}`, { getToken })
        .then(data => setMessages(data || []))
        .catch(() => {});
    }
  }, [activeTab, profile, id, getToken]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Milestone Actions ──
  const handleMilestoneAction = async (action, milestoneId, extra) => {
    setActionLoading(true);
    try {
      if (action === 'submit') {
        await apiFetch(`/milestones/${milestoneId}/submit`, { getToken, method: 'POST' });
      } else if (action === 'release') {
        await apiFetch(`/milestones/${milestoneId}/release`, { getToken, method: 'POST' });
      } else if (action === 'reject') {
        await apiFetch(`/milestones/${milestoneId}/reject`, {
          getToken, method: 'POST', body: { feedback: extra },
        });
      }
      await fetchInvoice();
    } catch (e) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Terminate Project ──
  const handleTerminate = async () => {
    if (!confirm('Are you sure? Remaining escrow will be refunded and the project will be cancelled.')) return;
    setActionLoading(true);
    try {
      await apiFetch(`/invoices/${id}/terminate`, { getToken, method: 'POST' });
      await fetchInvoice();
    } catch (e) { alert(e.message); }
    finally { setActionLoading(false); }
  };

  // ── Fund Project ──
  const handleFundProject = async () => {
    setActionLoading(true);
    try {
      await apiFetch(`/invoices/${id}/fund`, { getToken, method: 'POST' });
      await fetchInvoice();
    } catch (e) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Apply to project ──
  const handleApply = async () => {
    if (!rulesAccepted) { alert('Please accept the project rules to apply.'); return; }
    setApplyLoading(true);
    try {
      await apiFetch('/applications/', {
        getToken, method: 'POST',
        body: { invoice_id: id, proposal_text: proposalText || null },
      });
      setShowApplyModal(false);
      setProposalText('');
      setRulesAccepted(false);
      await fetchMyApplication();
      await fetchInvoice();
    } catch (e) { alert(e.message); }
    finally { setApplyLoading(false); }
  };

  const handleApproveApplication = async (applicationId) => {
    setActionLoading(true);
    try {
      await apiFetch(`/applications/${applicationId}/approve`, { getToken, method: 'POST' });
      await fetchApplications();
      await fetchInvoice();
    } catch (e) { alert(e.message); }
    finally { setActionLoading(false); }
  };

  const handleRejectApplication = async (applicationId) => {
    setActionLoading(true);
    try {
      await apiFetch(`/applications/${applicationId}/reject`, { getToken, method: 'POST' });
      await fetchApplications();
    } catch (e) { alert(e.message); }
    finally { setActionLoading(false); }
  };

  // ── Send Chat ──
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    wsSendMessage(chatInput.trim());
    setChatInput('');
  };

  // ── Loading / Error ──
  if (profileLoading || !profile) return (
    <div style={{ minHeight: '100vh', background: '#050A07', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <RefreshCw size={20} color="#34D399" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <AppShell role={role}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 8px rgba(52,211,153,0.2); } 50% { box-shadow: 0 0 20px rgba(52,211,153,0.4); } }
      `}</style>

      {/* Back + Header */}
      <FadeUp delay={0}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/invoices')}
              style={{
                width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#9CA3AF', cursor: 'pointer',
              }}
            >
              <ArrowLeft size={16} />
            </motion.button>
            <div>
              <h1 style={{
                fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 800,
                letterSpacing: '-0.03em', color: '#ECFDF5', margin: 0,
              }}>
                {loading ? '...' : invoice?.title || 'Invoice'}
              </h1>
              {invoice && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    {invoice.invoice_number}
                  </span>
                  <Badge status={invoice.status} />
                </div>
              )}
            </div>
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
          <div style={{ display: 'grid', gap: 16 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 120, background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 50%, transparent 100%)', animation: 'shimmer 1.5s infinite' }} />
              </div>
            ))}
          </div>
          <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
        </FadeUp>
      ) : invoice ? (
        <>
          {/* Overview Cards */}
          <FadeUp delay={0.05}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
              <GlassCard style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: 6 }}>Total Value</div>
                <div style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: '#34D399' }}>
                  ₹{Number(invoice.total_amount).toLocaleString()}
                </div>
              </GlassCard>
              <GlassCard style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: 6 }}>
                  {role === 'client' ? 'Freelancer' : 'Client'}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ECFDF5' }}>
                  {role === 'client' ? (invoice.freelancer_name || 'Unassigned') : (invoice.client_name || 'Unknown')}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>
                  {role === 'client' ? invoice.freelancer_email : invoice.client_email}
                </div>
              </GlassCard>
              <GlassCard style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: 6 }}>Milestones</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ECFDF5' }}>
                  {(invoice.milestones || []).filter(m => m.status === 'released').length} / {(invoice.milestones || []).length} completed
                </div>
                <div style={{
                  height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginTop: 8, overflow: 'hidden',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((invoice.milestones || []).filter(m => m.status === 'released').length /
                        Math.max((invoice.milestones || []).length, 1)) * 100}%`
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ height: '100%', background: 'linear-gradient(90deg, #059669, #34D399)', borderRadius: 2 }}
                  />
                </div>
              </GlassCard>
              {invoice.escrow && (
                <GlassCard style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: 6 }}>Escrow</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#60A5FA' }}>
                    ₹{Number(invoice.escrow.remaining_amount).toLocaleString()} locked
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#34D399', marginTop: 2 }}>
                    ₹{Number(invoice.escrow.released_amount).toLocaleString()} released
                  </div>
                </GlassCard>
              )}
            </div>
          </FadeUp>

          {/* Tabs */}
          <FadeUp delay={0.1}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
              <TabButton active={activeTab === 'milestones'} onClick={() => setActiveTab('milestones')} icon={FileText}>
                Milestones
              </TabButton>
              <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={MessageCircle}>
                Chat
              </TabButton>
              {invoice.description && (
                <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={FileText}>
                  Overview
                </TabButton>
              )}
              {/* Client: Applications tab — only when funded or in_progress */}
              {role === 'client' && ['funded', 'in_progress'].includes(invoice.status) && (
                <TabButton active={activeTab === 'applications'} onClick={() => setActiveTab('applications')} icon={Users}>
                  Applications
                </TabButton>
              )}
              {/* Freelancer: My Application tab */}
              {role === 'freelancer' && (
                <TabButton active={activeTab === 'my-application'} onClick={() => setActiveTab('my-application')} icon={UserCheck}>
                  My Application
                </TabButton>
              )}
            </div>
          </FadeUp>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'milestones' && (
              <motion.div key="milestones" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {/* Client: Fund Project button */}
                {role === 'client' && ['draft', 'sent'].includes(invoice.status) && (
                  <div style={{ marginBottom: 24 }}>
                    <GlassCard style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <h3 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#ECFDF5', marginBottom: 4 }}>
                            Ready to start this project?
                          </h3>
                          <p style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: 0 }}>
                            Fund the escrow to lock ₹{Number(invoice.total_amount).toLocaleString()} and activate the first milestone.
                          </p>
                        </div>
                        <ActionButton
                          variant="primary"
                          loading={actionLoading}
                          onClick={handleFundProject}
                          style={{ flexShrink: 0, marginLeft: 16 }}
                        >
                          <DollarSign size={14} /> Fund Project
                        </ActionButton>
                      </div>
                    </GlassCard>
                  </div>
                )}

                {/* Freelancer: Apply button for funded projects */}
                {role === 'freelancer' && invoice.status === 'funded' && !myApplication && (
                  <div style={{ marginBottom: 24 }}>
                    <GlassCard style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <h3 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#ECFDF5', marginBottom: 4 }}>
                            Interested in this project?
                          </h3>
                          <p style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: 0 }}>
                            Submit your proposal to the client. Budget: ₹{Number(invoice.total_amount).toLocaleString()}
                          </p>
                        </div>
                        <ActionButton variant="primary" onClick={() => setShowApplyModal(true)} style={{ flexShrink: 0, marginLeft: 16 }}>
                          <UserCheck size={14} /> Apply Now
                        </ActionButton>
                      </div>
                    </GlassCard>
                  </div>
                )}
                {role === 'freelancer' && myApplication && invoice.status === 'funded' && (
                  <div style={{ marginBottom: 24 }}>
                    <GlassCard style={{ padding: '16px 20px', borderColor: myApplication.status === 'accepted' ? 'rgba(52,211,153,0.3)' : myApplication.status === 'rejected' ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.3)' }}>
                      <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: 4 }}>Your Application</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: myApplication.status === 'accepted' ? '#34D399' : myApplication.status === 'rejected' ? '#F87171' : '#FBBF24' }}>
                        {myApplication.status === 'accepted' ? '✓ Accepted' : myApplication.status === 'rejected' ? '✗ Not selected' : '⏳ Pending review'}
                      </div>
                    </GlassCard>
                  </div>
                )}

                {(invoice.milestones || []).length === 0 ? (
                  <EmptyState title="No milestones" subtitle="This project has no milestones defined yet." icon={FileText} />
                ) : (
                  <div style={{ maxWidth: 720 }}>
                    {(invoice.milestones || [])
                      .sort((a, b) => a.order - b.order)
                      .map((m, i) => (
                        <MilestoneNode key={m.id} milestone={m} index={i}
                          total={(invoice.milestones || []).length}
                          role={role} onAction={handleMilestoneAction}
                          actionLoading={actionLoading}
                        />
                      ))}
                  </div>
                )}

                {/* Client: Terminate button */}
                {role === 'client' && ['in_progress', 'funded'].includes(invoice.status) && (
                  <div style={{ marginTop: 24 }}>
                    <ActionButton variant="danger" onClick={handleTerminate} loading={actionLoading}>
                      <AlertTriangle size={14} /> Terminate Project
                    </ActionButton>
                  </div>
                )}

                {/* Rating section */}
                <RatingSection invoiceId={id} role={role} status={invoice.status} getToken={getToken} />
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <GlassCard style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', maxHeight: 500 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ECFDF5' }}>Project Chat</span>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: chatConnected ? '#34D399' : '#6B7280',
                      boxShadow: chatConnected ? '0 0 6px rgba(52,211,153,0.6)' : 'none',
                      transition: 'all 0.3s',
                    }} title={chatConnected ? 'Live' : 'Connecting...'} />
                    <span style={{ fontSize: '0.7rem', color: chatConnected ? '#34D399' : '#6B7280' }}>
                      {chatConnected ? 'Live' : 'Connecting...'}
                    </span>
                  </div>

                  {/* Messages */}
                  <div style={{
                    flex: 1, overflowY: 'auto', minHeight: 200, maxHeight: 350,
                    paddingRight: 8, marginBottom: 12,
                  }}>
                    {messages.length === 0 ? (
                      <EmptyState title="No messages yet" subtitle="Start the conversation!" icon={MessageCircle} />
                    ) : (
                      messages.map(msg => (
                        <ChatBubble key={msg.id} msg={msg} isOwn={msg.sender_id === profile?.id} />
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input */}
                  <form onSubmit={handleSendChat} style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={chatInput} onChange={e => setChatInput(e.target.value)}
                      placeholder="Type a message..."
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        color: '#E2E8F0', fontSize: '0.85rem', outline: 'none', fontFamily: 'Inter, sans-serif',
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,0.3)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                    <ActionButton type="submit" disabled={!chatInput.trim()}>
                      <Send size={14} /> Send
                    </ActionButton>
                  </form>
                </GlassCard>
              </motion.div>
            )}

            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <GlassCard style={{ maxWidth: 720 }}>
                  <h3 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#ECFDF5', marginBottom: 12 }}>
                    Project Description
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#9CA3AF', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {invoice.description}
                  </p>
                  {invoice.due_date && (
                    <div style={{ marginTop: 16, fontSize: '0.8rem', color: '#6B7280' }}>
                      <Clock size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                      Deadline: {new Date(invoice.due_date).toLocaleDateString()}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}

            {activeTab === 'applications' && (
              <motion.div key="applications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {invoice.status === 'in_progress' ? (
                  <GlassCard style={{ maxWidth: 720 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#34D399' }}>
                      <CheckCircle size={18} />
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Freelancer assigned — project is in progress</span>
                    </div>
                    {invoice.freelancer_name && (
                      <div style={{ marginTop: 12, fontSize: '0.85rem', color: '#9CA3AF' }}>
                        Working with: <span style={{ color: '#ECFDF5', fontWeight: 600 }}>{invoice.freelancer_name}</span>
                      </div>
                    )}
                  </GlassCard>
                ) : applications.length === 0 ? (
                  <EmptyState title="No applications yet" subtitle="Freelancers will apply once they discover your funded project." icon={Users} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
                    {applications.map((app, i) => (
                      <motion.div key={app.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <GlassCard style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                                  {(app.freelancer_name || 'F')[0].toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#ECFDF5', fontSize: '0.9rem' }}>{app.freelancer_name || 'Freelancer'}</div>
                                  <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{app.freelancer_email}</div>
                                </div>
                                <div style={{
                                  marginLeft: 'auto', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
                                  background: app.status === 'accepted' ? 'rgba(52,211,153,0.15)' : app.status === 'rejected' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                                  color: app.status === 'accepted' ? '#34D399' : app.status === 'rejected' ? '#F87171' : '#FBBF24',
                                  border: `1px solid ${app.status === 'accepted' ? 'rgba(52,211,153,0.3)' : app.status === 'rejected' ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.3)'}`,
                                }}>
                                  {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                </div>
                              </div>
                              {app.proposal_text && (
                                <p style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: 0, lineHeight: 1.6, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                  {app.proposal_text}
                                </p>
                              )}
                              <div style={{ fontSize: '0.68rem', color: '#4B5563', marginTop: 8 }}>
                                Applied {new Date(app.created_at).toLocaleString()}
                              </div>
                            </div>
                            {app.status === 'pending' && invoice.status === 'funded' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                                <ActionButton variant="primary" loading={actionLoading} onClick={() => handleApproveApplication(app.id)} style={{ padding: '8px 14px', fontSize: '0.78rem' }}>
                                  <CheckCircle size={13} /> Approve
                                </ActionButton>
                                <ActionButton variant="danger" loading={actionLoading} onClick={() => handleRejectApplication(app.id)} style={{ padding: '8px 14px', fontSize: '0.78rem' }}>
                                  <XCircle size={13} /> Reject
                                </ActionButton>
                              </div>
                            )}
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'my-application' && (
              <motion.div key="my-application" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div style={{ maxWidth: 720 }}>
                  {!myApplication ? (
                    <EmptyState title="No application yet" subtitle="You haven't applied to this project." icon={UserCheck} />
                  ) : (
                    <GlassCard>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Application Status</div>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700,
                          background: myApplication.status === 'accepted' ? 'rgba(52,211,153,0.15)' : myApplication.status === 'rejected' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                          color: myApplication.status === 'accepted' ? '#34D399' : myApplication.status === 'rejected' ? '#F87171' : '#FBBF24',
                        }}>
                          {myApplication.status === 'accepted' ? <CheckCircle size={14} /> : myApplication.status === 'rejected' ? <XCircle size={14} /> : <Clock size={14} />}
                          {myApplication.status === 'accepted' ? 'Accepted — You got the project!' : myApplication.status === 'rejected' ? 'Not selected' : 'Pending review'}
                        </div>
                      </div>
                      {myApplication.proposal_text && (
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Proposal</div>
                          <p style={{ fontSize: '0.85rem', color: '#9CA3AF', lineHeight: 1.7, margin: 0 }}>{myApplication.proposal_text}</p>
                        </div>
                      )}
                      <div style={{ fontSize: '0.72rem', color: '#4B5563', marginTop: 12 }}>
                        Submitted {new Date(myApplication.created_at).toLocaleString()}
                      </div>
                    </GlassCard>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : null}

      {/* Apply Modal */}
      <AnimatePresence>
        {showApplyModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
            onClick={() => setShowApplyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'rgba(10,20,16,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 480 }}
            >
              <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.3rem', fontWeight: 800, color: '#ECFDF5', marginBottom: 6 }}>Apply to Project</h2>
              <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: 20 }}>{invoice?.title}</p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Proposal (optional)
                </label>
                <textarea
                  placeholder="Describe your approach, experience, and why you're the right fit..."
                  value={proposalText} onChange={e => setProposalText(e.target.value)} rows={4}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#ECFDF5', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#9CA3AF', marginBottom: 8 }}>PROJECT RULES</div>
                <ul style={{ fontSize: '0.78rem', color: '#6B7280', paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
                  <li>Complete all milestones as described</li>
                  <li>Payment is released only after client approval</li>
                  <li>Disputes are resolved by platform admin</li>
                  <li>Funds are held in escrow until milestone release</li>
                </ul>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
                <input type="checkbox" checked={rulesAccepted} onChange={e => setRulesAccepted(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#34D399' }} />
                <span style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>I accept the project rules and terms</span>
              </label>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowApplyModal(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#9CA3AF', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleApply} disabled={!rulesAccepted || applyLoading}
                  style={{ flex: 2, padding: '12px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, background: !rulesAccepted || applyLoading ? 'rgba(52,211,153,0.1)' : '#059669', border: '1px solid #10B981', color: '#fff', cursor: !rulesAccepted || applyLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {applyLoading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <UserCheck size={16} />}
                  {applyLoading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
