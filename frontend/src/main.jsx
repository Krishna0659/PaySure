import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/globals.css'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider 
  publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
  afterSignInUrl="/onboarding"
  afterSignUpUrl="/onboarding">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>
)