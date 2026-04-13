import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { ArrowLeft, Plus, Trash2, Loader2, Save } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { useUserContext } from '../context/UserContext';
import { FadeUp, SectionCard } from '../features/dashboard/components/DashboardShared';
import BorderGlow from '../components/ui/BorderGlow';

export default function CreateInvoicePage() {
  const { profile, loading: profileLoading } = useUserContext();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const role = profile?.role;

  // Invoice Data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  // Milestones Array
  const [milestones, setMilestones] = useState([
    { id: 1, title: '', amount: '' }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Auto-calculating total amount based on active milestones
  const totalAmount = useMemo(() => {
    return milestones.reduce((sum, ms) => {
      const val = parseFloat(ms.amount);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [milestones]);

  const addMilestone = () => {
    setMilestones([...milestones, { id: Date.now(), title: '', amount: '' }]);
  };

  const removeMilestone = (id) => {
    if (milestones.length === 1) return;
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const updateMilestone = (id, field, value) => {
    setMilestones(milestones.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!title.trim()) return setError("Invoice title is required.");
    if (milestones.some(m => !m.title.trim() || !m.amount || Number(m.amount) <= 0)) {
      return setError("All milestones must have a valid title and an amount greater than 0.");
    }

    setIsSubmitting(true);

    try {
      const token = await getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // 1. Create Dashboard Base Invoice
      const invoiceRes = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/invoices/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          description: description || null,
          total_amount: totalAmount,
          currency: "INR",
          due_date: dueDate ? new Date(dueDate).toISOString() : null
        })
      });

      if (!invoiceRes.ok) throw new Error("Failed to create base invoice");
      const invoiceData = await invoiceRes.json();
      const invoiceId = invoiceData.data.id;

      // 2. Map through milestones and explicitly POST each one
      const milestonePromises = milestones.map((ms, idx) => {
        return fetch(`${import.meta.env.VITE_API_URL}/api/v1/milestones/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            invoice_id: invoiceId,
            title: ms.title,
            amount: parseFloat(ms.amount),
            order: idx + 1
          })
        });
      });

      await Promise.all(milestonePromises);

      // Redirect back to list
      navigate('/invoices');

    } catch (err) {
      setError(err.message || "An error occurred while creating the invoice.");
      setIsSubmitting(false);
    }
  };

  // Loading Guard
  if (profileLoading || !profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#050A07', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={24} color="#34D399" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // Prevent freelancers from rendering the page
  if (role !== 'client') {
    return (
      <AppShell role={role}>
        <div style={{ padding: 40, color: '#F87171' }}>Access denied. Only clients can create and fund projects.</div>
      </AppShell>
    );
  }

  const InputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#ECFDF5', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif',
    outline: 'none', transition: 'border-color 0.2s ease',
  };

  const LabelStyle = {
    display: 'block', fontSize: '0.8rem', fontWeight: 600, 
    color: '#9CA3AF', marginBottom: '8px', letterSpacing: '0.02em',
    textTransform: 'uppercase'
  };

  return (
    <AppShell role={role}>
      <FadeUp delay={0}>
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate('/invoices')}
            style={{ 
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '10px', padding: '8px', color: '#9CA3AF', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#34D399'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.75rem', fontWeight: 800, color: '#ECFDF5', marginBottom: 2 }}>
              Create New Invoice
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              Draft a new invoice and specify expected delivery milestones.
            </p>
          </div>
        </div>
      </FadeUp>

      {error && (
        <FadeUp delay={0.05}>
          <div style={{ padding: '16px 20px', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12, background: 'rgba(248,113,113,0.05)', color: '#F87171', marginBottom: 24, fontSize: '0.9rem' }}>
            {error}
          </div>
        </FadeUp>
      )}

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* General Information */}
            <FadeUp delay={0.1}>
              <SectionCard>
                <h3 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#ECFDF5', marginBottom: 20 }}>
                  General Information
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={LabelStyle}>Project / Invoice Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Website Overhaul Design" 
                      style={InputStyle}
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      onFocus={e => e.currentTarget.style.borderColor = 'rgba(52,211,153,0.5)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                      required 
                    />
                  </div>
                  <div>
                    <label style={LabelStyle}>Description (Optional)</label>
                    <textarea 
                      placeholder="Details about the work..."
                      rows={3}
                      style={{ ...InputStyle, resize: 'vertical' }}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      onFocus={e => e.currentTarget.style.borderColor = 'rgba(52,211,153,0.5)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                </div>
              </SectionCard>
            </FadeUp>

            {/* Milestones */}
            <FadeUp delay={0.15}>
              <BorderGlow
                backgroundColor="#0A1410" borderRadius={14}
                glowColor="196 71 95" glowRadius={25}
                glowIntensity={0.6} coneSpread={15}
                colors={['#34D399', '#10B981', '#059669']}
              >
                <div style={{ padding: '24px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#ECFDF5' }}>
                      Milestones
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {milestones.map((ms, index) => (
                      <div key={ms.id} style={{ 
                        display: 'grid', gridTemplateColumns: '1fr 150px auto', gap: 12, 
                        alignItems: 'center', background: 'rgba(255,255,255,0.02)',
                        padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <input 
                          type="text" 
                          placeholder={`Milestone ${index + 1} Name`}
                          style={{ ...InputStyle, background: 'rgba(0,0,0,0.2)', padding: '10px 12px' }}
                          value={ms.title}
                          onChange={e => updateMilestone(ms.id, 'title', e.target.value)}
                          onFocus={e => e.currentTarget.style.borderColor = 'rgba(52,211,153,0.5)'}
                          onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                          required
                        />
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 12, top: 10, color: '#9CA3AF', fontSize: '0.9rem' }}>₹</span>
                          <input 
                            type="number" 
                            step="0.01"
                            placeholder="Amount"
                            style={{ ...InputStyle, background: 'rgba(0,0,0,0.2)', padding: '10px 12px 10px 24px' }}
                            value={ms.amount}
                            onChange={e => updateMilestone(ms.id, 'amount', e.target.value)}
                            onFocus={e => e.currentTarget.style.borderColor = 'rgba(52,211,153,0.5)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                            required
                          />
                        </div>
                        <button 
                          type="button"
                          disabled={milestones.length === 1}
                          onClick={() => removeMilestone(ms.id)}
                          style={{ 
                            background: 'transparent', border: 'none', color: milestones.length === 1 ? '#4B5563' : '#F87171',
                            cursor: milestones.length === 1 ? 'not-allowed' : 'pointer', padding: 8
                          }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button 
                    type="button"
                    onClick={addMilestone}
                    style={{
                      border: '1px dashed rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.05)',
                      color: '#34D399', width: '100%', padding: '12px', borderRadius: 10,
                      marginTop: 16, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.1)'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.5)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.05)'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.3)' }}
                  >
                    <Plus size={16} /> Add Milestone
                  </button>
                </div>
              </BorderGlow>
            </FadeUp>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'sticky', top: 40 }}>
            {/* Summary & Submit */}
            <FadeUp delay={0.2}>
              <SectionCard>
                <h3 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#ECFDF5', marginBottom: 20 }}>
                  Summary
                </h3>
                
                <div style={{ marginBottom: 24 }}>
                  <label style={LabelStyle}>Final Due Date (Optional)</label>
                  <input 
                    type="date" 
                    style={{ ...InputStyle, color: dueDate ? '#ECFDF5' : '#6B7280' }}
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(52,211,153,0.5)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>

                <div style={{ padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>Milestones Count</span>
                    <span style={{ color: '#ECFDF5', fontWeight: 600 }}>{milestones.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>Currency</span>
                    <span style={{ color: '#E2E8F0', fontWeight: 600, background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6, fontSize: '0.8rem' }}>INR</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
                  <span style={{ color: '#ECFDF5', fontWeight: 600 }}>Total Amount</span>
                  <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.8rem', fontWeight: 800, color: '#34D399', lineHeight: 1 }}>
                    ₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '14px', borderRadius: '12px',
                    background: isSubmitting ? '#064E3B' : '#059669', color: '#fff',
                    border: '1px solid #10B981',
                    fontSize: '0.95rem', fontWeight: 700,
                    cursor: isSubmitting ? 'wait' : 'pointer', transition: 'all 0.2s ease',
                    boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.3)',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                  onMouseEnter={e => {
                    if (isSubmitting) return;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                  }}
                  onMouseLeave={e => {
                    if (isSubmitting) return;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.3)';
                  }}
                >
                  {isSubmitting ? (
                    <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                  ) : (
                    <><Save size={18} /> Create Invoice</>
                  )}
                </button>
              </SectionCard>
            </FadeUp>
          </div>

        </div>
      </form>
    </AppShell>
  );
}
