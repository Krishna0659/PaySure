import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/react';
import { RefreshCw } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import MinimalistDock from '../components/ui/minimal-dock';
import UserAvatarDropdown from '../components/ui/UserAvatarDropdown';
import { useUserContext } from '../context/UserContext';
import { FadeUp, DashboardSkeleton } from '../features/dashboard/components/DashboardShared';
import ClientPanel from '../features/dashboard/components/ClientPanel';
import FreelancerPanel from '../features/dashboard/components/FreelancerPanel';

// ── Main Dashboard ──────────────────────────────────────────
export default function DashboardPage() {
  const { profile, loading: profileLoading } = useUserContext();
  const { getToken } = useAuth();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const role = profile?.role;

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/users/me/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setData(json.data);
        } else {
          if (isMounted) setError("Failed to fetch dashboard data");
        }
      } catch (err) {
        if (isMounted) setError("Network error fetching dashboard");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (!profileLoading && profile) {
      fetchDashboard();
    }

    return () => { isMounted = false; };
  }, [profile, profileLoading, getToken]);

  if (profileLoading || !profile) return (
    <div style={{ minHeight: '100vh', background: '#050A07', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <RefreshCw size={20} color="#34D399" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

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
              Good morning, {firstName} 👋
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              {role === 'client'
                ? "Here's an overview of your active projects and escrow."
                : "Here's what's happening with your projects today."}
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
      ) : loading || !data ? (
        <DashboardSkeleton />
      ) : role === 'client' ? (
        <ClientPanel data={data} />
      ) : (
        <FreelancerPanel data={data} />
      )}
    </AppShell>
  );
}