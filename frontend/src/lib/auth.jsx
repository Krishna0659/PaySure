import { useUser, useAuth } from '@clerk/react'
import { Navigate } from 'react-router-dom'
import { useUserContext } from '../context/UserContext'

/**
 * Ensures user logged into Clerk. Used for the Onboarding route itself.
 */
export function RequireAuth({ children }) {
  const { isSignedIn, isLoaded } = useAuth()
  
  if (!isLoaded) {
    return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#050A07', color: '#6B7280' }}>Loading authn...</div>
  }
  
  if (!isSignedIn) return <Navigate to="/login" replace />
  return children
}

/**
 * Ensures user is authenticated AND has finished onboarding.
 * Used for all standard protected routes (Dashboard, etc).
 */
export function RequireOnboarded({ children }) {
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const { profile, loading: profileLoading } = useUserContext()
  
  if (!authLoaded || profileLoading) {
    return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#050A07', color: '#6B7280' }}>Verifying user state...</div>
  }
  
  if (!isSignedIn) return <Navigate to="/login" replace />
  
  if (profile && profile.is_onboarded === false) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

/**
 * Route wrapper that ensures the user has a specific role.
 */
export function RequireRole({ role, children }) {
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const { profile, loading: profileLoading } = useUserContext()
  
  if (!authLoaded || profileLoading) {
    return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#050A07', color: '#6B7280' }}>Checking permissions...</div>
  }
  
  if (!isSignedIn) return <Navigate to="/login" replace />
  
  if (profile && profile.is_onboarded === false) {
    return <Navigate to="/onboarding" replace />
  }
  
  if (profile && profile.role !== role) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}
