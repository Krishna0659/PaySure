import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, CreditCard } from 'lucide-react';
import { FadeUp, StatCard, SectionCard, EmptyState, Badge } from './DashboardShared';
import BorderGlow from '../../../components/ui/BorderGlow';
import { Plus } from 'lucide-react';

export default function ClientPanel({ data }) {
  const navigate = useNavigate();

  return (
    <>
      <FadeUp delay={0.05}>
        <div style={{ marginBottom: '28px' }}>
          <BorderGlow
            backgroundColor="#0A1410"
            borderRadius={16}
            glowColor="196 71 95"
            glowRadius={30}
            glowIntensity={1.0}
            coneSpread={20}
            colors={['#34D399', '#10B981', '#059669']}
          >
            <div 
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '24px', 
                background: 'transparent',
                borderRadius: '16px',
              }}
            >
              <div>
                <h2 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.25rem', fontWeight: 800, color: '#ECFDF5', marginBottom: 4 }}>
                  Fund a New Project
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>Create a mandate to escrow funds and safely manage deliverables.</p>
              </div>
              <button
                onClick={() => navigate('/invoices/new')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '12px 20px', borderRadius: '12px',
                  background: '#059669', color: '#fff',
                  border: '1px solid #10B981',
                  fontSize: '0.9rem', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.3)';
                }}
              >
                <Plus size={18} /> Create Invoice
              </button>
            </div>
          </BorderGlow>
        </div>
      </FadeUp>

      <FadeUp delay={0.08}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {data.stats.map((s, i) => <StatCard key={i} {...s} />)}
        </div>
      </FadeUp>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <FadeUp delay={0.14}>
          <SectionCard>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '0.95rem', fontWeight: 700, color: '#ECFDF5' }}>
                ⏳ Pending Your Approval
              </h3>
              <button onClick={() => navigate('/invoices')} style={{
                background: 'none', border: 'none', color: '#34D399',
                fontSize: '0.75rem', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 4, fontFamily: 'Inter, sans-serif',
              }}>
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.milestones.length === 0 ? (
                <EmptyState title="No pending milestones" subtitle="Everything is caught up" icon={CheckCircle} />
              ) : data.milestones.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div>
                    <div style={{ fontSize: '0.83rem', fontWeight: 500, color: '#E2E8F0', marginBottom: 2 }}>{m.title}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '0.85rem', fontWeight: 700, color: '#34D399' }}>₹{m.amount}</span>
                    <Badge status={m.status} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </FadeUp>

        <FadeUp delay={0.18}>
          <SectionCard>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '0.95rem', fontWeight: 700, color: '#ECFDF5' }}>
                📄 Active Invoices
              </h3>
              <button onClick={() => navigate('/invoices')} style={{
                background: 'none', border: 'none', color: '#34D399',
                fontSize: '0.75rem', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 4, fontFamily: 'Inter, sans-serif',
              }}>
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.invoices.length === 0 ? (
                <EmptyState title="No active invoices" subtitle="Create your first invoice to start a project" />
              ) : data.invoices.map(inv => (
                <div key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(52,211,153,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                >
                  <div>
                    <div style={{ fontSize: '0.83rem', fontWeight: 500, color: '#E2E8F0', marginBottom: 2 }}>{inv.title}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                      {inv.invoice_number}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '0.85rem', fontWeight: 700, color: '#ECFDF5' }}>₹{inv.total_amount}</span>
                    <Badge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </FadeUp>
      </div>

      <FadeUp delay={0.22}>
        <SectionCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '0.95rem', fontWeight: 700, color: '#ECFDF5' }}>
              💸 Recent Payments
            </h3>
            <button onClick={() => navigate('/payments')} style={{
              background: 'none', border: 'none', color: '#34D399',
              fontSize: '0.75rem', cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: 4, fontFamily: 'Inter, sans-serif',
            }}>
              View all <ArrowRight size={12} />
            </button>
          </div>
          
          {data.payments.length === 0 ? (
            <EmptyState title="No recent payments" subtitle="Transactions will appear here once processed" icon={CreditCard} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {data.payments.map(p => (
                <div key={p.id} style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#E2E8F0', marginBottom: 4 }}>
                    {p.payment_type === 'release' ? 'Released to Freelancer' : p.payment_type === 'deposit' ? 'Escrow Deposit' : 'Refund'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: 8 }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1rem', fontWeight: 800, color: '#34D399' }}>₹{p.amount}</span>
                    <Badge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </FadeUp>
    </>
  );
}
