import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, CreditCard } from 'lucide-react';
import { FadeUp, StatCard, SectionCard, EmptyState, Badge } from './DashboardShared';

export default function FreelancerPanel({ data }) {
  const navigate = useNavigate();

  return (
    <>
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
                ⏳ Awaiting Approval
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
                <EmptyState title="No work assigned yet" subtitle="When a client assigns you a project, it will appear here." />
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
