import Sidebar from './Sidebar'
import SuspenseLoader from '../ui/SuspenseLoader'

// Wraps all protected pages with sidebar layout
export default function AppShell({ role, children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#050A07' }}>
      <Sidebar role={role} />
      {/* Main content — offset by sidebar width */}
      <main className="flex-1 min-h-screen text-[#ECFDF5] transition-all duration-300 pl-[64px] md:pl-[220px]" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="min-h-full p-4 sm:p-6 md:p-8">
          <SuspenseLoader>
            {children}
          </SuspenseLoader>
        </div>
      </main>
    </div>
  )
}