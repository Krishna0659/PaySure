import { useState } from 'react'
import { SignIn, SignUp } from '@clerk/react'
import { motion, AnimatePresence } from 'framer-motion'
import { DottedSurface } from '@/components/dotted-surface'
import { dark } from '@clerk/themes'

const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: '#34D399',
    colorBackground: 'transparent',
    colorText: '#ffffff',
    colorInputBackground: 'rgba(255,255,255,0.03)',
    colorInputText: '#ffffff',
    colorTextOnPrimaryBackground: '#000000',
    fontFamily: 'Inter, sans-serif'
  },
  elements: {
    card: { background: 'transparent', boxShadow: 'none' },
    headerTitle: { color: '#ffffff', fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.8rem' },
    headerSubtitle: { color: '#6B7280' },
    formButtonPrimary: { background: '#34D399', color: '#000000', '&:hover': { background: '#10B981' } },
    socialButtonsBlockButton: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', '&:hover': { background: 'rgba(255,255,255,0.06)' } },
    socialButtonsBlockButtonText: { color: '#ffffff', fontWeight: '500' },
    formFieldLabel: { color: '#D1D5DB' },
    formFieldInput: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' },
    otpCodeFieldInput: {
      background: 'rgba(10,20,16,0.8)',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: '1px',
      borderStyle: 'solid',
      color: '#ECFDF5',
      minWidth: '48px',
      minHeight: '48px',
      fontSize: '1.25rem',
      fontWeight: '600',
      textAlign: 'center',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:focus': {
        borderColor: '#34D399',
        boxShadow: '0 0 0 2px rgba(52,211,153,0.25)',
        transform: 'scale(1.05)',
        outline: 'none'
      },
      '&[data-invalid]': {
        borderColor: '#F87171',
        animation: 'clerk-shake 0.4s cubic-bezier(.36,.07,.19,.97) both',
      }
    },
    dividerLine: { background: 'rgba(255,255,255,0.1)' },
    dividerText: { color: '#6B7280' },
    footerActionText: { color: '#6B7280' },
    footerActionLink: { color: '#34D399', '&:hover': { color: '#10B981' } },
    footer: { background: 'transparent', borderTop: 'none', paddingBottom: '0' },
    clerkBadge: { '&::before': { backgroundColor: 'transparent' } } // Tones down development mode badge
  }
}

export default function LoginPage() {
  const [mode, setMode] = useState('signin')

  return (
    <AnimatePresence>
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5 }}
          style={{
            display: 'flex', minHeight: '100vh',
            background: '#050A07', position: 'relative'
          }}
        >
          {/* LEFT — Dotted animation */}
          <div style={{
            flex: 1, position: 'relative',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            borderRight: '1px solid rgba(52,211,153,0.08)',
            minHeight: '100vh',
          }}>
            <DottedSurface className="absolute inset-0 w-full h-full" />
            <div style={{
               position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at center, rgba(52,211,153,0.06) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 60px' }}
            >
              <div style={{
                fontFamily: 'Cabinet Grotesk, sans-serif',
                fontSize: '3rem', fontWeight: 800,
                letterSpacing: '-0.03em', marginBottom: 16
              }}>
                Pay<span style={{ color: '#34D399' }}>Sure</span>
              </div>
              <p style={{ fontSize: '1rem', color: '#6B7280', lineHeight: 1.7, maxWidth: 320, margin: '0 auto' }}>
                Secure milestone payments for freelancers and clients. Get paid. Every time.
              </p>
              <div style={{ display: 'flex', gap: 24, marginTop: 48, justifyContent: 'center' }}>
                {[
                  { num: '12K+', label: 'Freelancers' },
                  { num: '99%', label: 'Success Rate' },
                  { num: '₹42Cr+', label: 'Protected' },
                ].map(({ num, label }) => (
                  <div key={label} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(52,211,153,0.12)',
                    borderRadius: 12, padding: '12px 18px', textAlign: 'center'
                  }}>
                    <div style={{
                      fontFamily: 'Cabinet Grotesk, sans-serif',
                      fontSize: '1.3rem', fontWeight: 800, color: '#34D399'
                    }}>{num}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* RIGHT — Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            style={{
              width: '500px', display: 'flex',
              flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '60px 48px',
              position: 'relative',
              overflowY: 'auto'
            }}
          >
            {/* Mode toggle */}
            <div style={{
              position: 'absolute', top: 32, right: 32,
              display: 'flex', gap: 4,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8, padding: 4,
              zIndex: 10
            }}>
              {['signin', 'signup'].map(m => (
                <button key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: '6px 14px', borderRadius: 6,
                    fontSize: '0.78rem', fontWeight: 500,
                    background: mode === m ? 'rgba(52,211,153,0.15)' : 'transparent',
                    color: mode === m ? '#34D399' : '#6B7280',
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                  }}>
                  {m === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 40 }}>
              <div className="clerk-theme-override">
                {mode === 'signin' ? (
                  <SignIn 
                    routing="hash" 
                    forceRedirectUrl="/onboarding" 
                    signUpUrl="/login#sign-up"
                    appearance={clerkAppearance} 
                  />
                ) : (
                  <SignUp 
                    routing="hash" 
                    forceRedirectUrl="/onboarding" 
                    signInUrl="/login#sign-in"
                    appearance={clerkAppearance} 
                  />
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
    </AnimatePresence>
  )
}