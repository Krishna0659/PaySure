import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { Plus, FileText, Search, RefreshCw } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { useUserContext } from '../context/UserContext';
import MinimalistDock from '../components/ui/minimal-dock';
import UserAvatarDropdown from '../components/ui/UserAvatarDropdown';
import { FadeUp, Badge, EmptyState, SectionCard } from '../features/dashboard/components/DashboardShared';
import InvoiceCard from '../components/ui/InvoiceCard';

export default function InvoicesPage() {
  const { profile, loading: profileLoading } = useUserContext();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const role = profile?.role;

  useEffect(() => {
    let isMounted = true;
    const fetchInvoices = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/invoices`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setInvoices(json.data || []);
        } else {
          if (isMounted) setError("Failed to fetch invoices");
        }
      } catch (err) {
        if (isMounted) setError("Network error fetching invoices");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (!profileLoading && profile) {
      fetchInvoices();
    }

    return () => { isMounted = false; };
  }, [profile, profileLoading, getToken]);

  // Memoize filtered invoices
  const filteredInvoices = useMemo(() => {
    let result = invoices;
    
    if (statusFilter !== 'All') {
      result = result.filter(inv => {
        if (statusFilter === 'Pending') return ['draft', 'in_progress'].includes(inv.status);
        if (statusFilter === 'Funded') return inv.status === 'funded';
        if (statusFilter === 'Submitted') return inv.status === 'submitted';
        if (statusFilter === 'Released') return inv.status === 'released';
        return true;
      });
    }

    if (searchQuery) {
      result = result.filter(inv => 
        inv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return result;
  }, [invoices, searchQuery, statusFilter]);

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
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{
              fontFamily: 'Cabinet Grotesk, sans-serif',
              fontSize: '1.75rem', fontWeight: 800,
              letterSpacing: '-0.03em', color: '#ECFDF5', marginBottom: 4,
            }}>
              Invoices
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              {role === 'freelancer'
                ? "Manage your billing and create new invoices."
                : "Review and fund invoices sent by your freelancers."}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {role === 'client' && (
              <button
                onClick={() => navigate('/invoices/new')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 18px', borderRadius: '12px',
                  background: '#059669', color: '#fff',
                  border: '1px solid #10B981',
                  fontSize: '0.85rem', fontWeight: 600,
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
                <Plus size={16} /> New Invoice
              </button>
            )}
            <div style={{ position: 'relative', height: 60, display: 'flex', alignItems: 'center' }}>
              <MinimalistDock />
            </div>
            <UserAvatarDropdown />
          </div>
        </div>
      </FadeUp>

      {/* Toolbar */}
      <FadeUp delay={0.08}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: 32 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['All', 'Pending', 'Funded', 'Submitted', 'Released'].map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                style={{
                  padding: '8px 16px', borderRadius: '20px',
                  fontSize: '0.85rem', fontWeight: 600,
                  background: statusFilter === tab ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.03)',
                  color: statusFilter === tab ? '#34D399' : '#9CA3AF',
                  border: statusFilter === tab ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  if (statusFilter !== tab) {
                    e.currentTarget.style.color = '#E2E8F0';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  }
                }}
                onMouseLeave={e => {
                  if (statusFilter !== tab) {
                    e.currentTarget.style.color = '#9CA3AF';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{
            position: 'relative', width: '300px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', display: 'flex', alignItems: 'center',
            padding: '8px 12px', transition: 'border-color 0.2s'
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'rgba(52,211,153,0.4)'}
          onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
          >
            <Search size={16} color="#6B7280" style={{ marginRight: 8 }} />
            <input 
              type="text" 
              placeholder="Search invoices..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: '#E2E8F0', fontSize: '0.85rem', width: '100%',
                fontFamily: 'Inter, sans-serif'
              }}
            />
          </div>
        </div>
      </FadeUp>

      {/* Main List Area */}
      {error ? (
        <div style={{ padding: 24, border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12, background: 'rgba(248,113,113,0.05)', color: '#F87171' }}>
          {error}
        </div>
      ) : loading ? (
        <FadeUp delay={0.1}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', width: '100%' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ width: '100%', height: '220px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                 <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 50%, transparent 100%)', animation: 'shimmer 1.5s infinite' }} />
              </div>
            ))}
          </div>
          <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
        </FadeUp>
      ) : (
        <FadeUp delay={0.14}>
          {filteredInvoices.length === 0 ? (
             <EmptyState 
               title={searchQuery || statusFilter !== 'All' ? "No matching invoices found" : "No invoices found"} 
               subtitle={searchQuery || statusFilter !== 'All' 
                 ? "Try adjusting your search terms or filters." 
                 : (role === 'client' ? "Create your first invoice to start a project" : "No work assigned yet")} 
               icon={FileText} 
             />
          ) : (
            <div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px',
                width: '100%'
              }}
            >
              {filteredInvoices.map((inv, i) => (
                <FadeUp key={inv.id} delay={0.18 + (i * 0.05)}>
                  <InvoiceCard 
                    invoice={inv} 
                    role={role} 
                    onClick={() => navigate(`/invoices/${inv.id}`)} 
                  />
                </FadeUp>
              ))}
            </div>
          )}
        </FadeUp>
      )}
    </AppShell>
  );
}
