import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthenticateWithRedirectCallback } from '@clerk/react'
import { RequireAuth, RequireOnboarded, RequireRole } from './lib/auth'
import { UserProvider } from './context/UserContext'

// Pages
import LandingPage from './pages/LandingPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import InvoicesPage from './pages/InvoicesPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'
import CreateInvoicePage from './pages/CreateInvoicePage'
import PaymentsPage from './pages/PaymentsPage'
import DisputesPage from './pages/DisputesPage'
import AdminPage from './pages/AdminPage'
import LoginPage from './pages/LoginPage'
import WalletPage from './pages/WalletPage'

function App() {
  return (
    <UserProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login/*" element={<LoginPage />} />
        <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />

        {/* Onboarding gets special RequireAuth but NOT RequireOnboarded */}
        <Route path="/onboarding" element={<RequireAuth><OnboardingPage /></RequireAuth>} />

        {/* Fully Authenticated and Onboarded Routes */}
        <Route path="/dashboard" element={<RequireOnboarded><DashboardPage/></RequireOnboarded>} />
        
        <Route path="/invoices" element={<RequireOnboarded><InvoicesPage /></RequireOnboarded>} />
        <Route path="/invoices/new" element={<RequireOnboarded><CreateInvoicePage /></RequireOnboarded>} />
        <Route path="/invoices/:id" element={<RequireOnboarded><InvoiceDetailPage /></RequireOnboarded>} />
        
        <Route path="/payments" element={<RequireOnboarded><PaymentsPage /></RequireOnboarded>} />
        <Route path="/wallet" element={<RequireOnboarded><WalletPage /></RequireOnboarded>} />
        <Route path="/disputes" element={<RequireOnboarded><DisputesPage /></RequireOnboarded>} />

        {/* Admin Protected Routes */}
        <Route path="/admin/*" element={<RequireRole role="admin"><AdminPage /></RequireRole>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UserProvider>
  )
}

export default App