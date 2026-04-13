import Sidebar from './Sidebar'
import SuspenseLoader from '../ui/SuspenseLoader'

// Wraps all protected pages with sidebar layout
export default function AppShell({ role, children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#050A07' }}>
      <Sidebar role={role} />
      {/* Main content — offset by sidebar width */}
      <main style={{
        flex: 1,
        // Using paddingLeft to ensure it works well with mobile sidebar in future if needed
        paddingLeft: 220,
        minHeight: '100vh',
        transition: 'padding-left 0.25s ease',
        color: '#ECFDF5',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ padding: '32px 36px', minHeight: '100%' }}>
          <SuspenseLoader>
            {children}
          </SuspenseLoader>
        </div>
      </main>
    </div>
  )
}