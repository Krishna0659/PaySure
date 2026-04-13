import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '@clerk/react'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const { getToken, isSignedIn, userId } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // If signed out, or if the user changed and we still have old data
    if (!isSignedIn) {
      setLoading(false)
      setProfile(null)
      return
    }

    if (profile && profile.clerk_id !== userId) {
      setProfile(null);
      setLoading(true);
    }

    let isMounted = true
    const fetchProfile = async () => {
      try {
        const token = await getToken()
        if (!token) throw new Error("No token")
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (isMounted) setProfile(data.data)
        } else {
          if (isMounted) setError("Failed to fetch profile")
        }
      } catch (err) {
        if (isMounted) setError(err.message)
        console.error("Failed to fetch backend profile", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchProfile()
    return () => { isMounted = false }
  }, [isSignedIn, getToken, userId])

  const value = { profile, loading, error, setProfile }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUserContext() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error("useUserContext must be used within a UserProvider")
  return ctx
}
