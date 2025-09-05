import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Context Providers
import { ThemeProvider } from './contexts/ThemeContext'
import { ResponsiveProvider } from './contexts/ResponsiveContext'
import { AccessibilityProvider } from './contexts/AccessibilityContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ResponsiveProvider>
        <AccessibilityProvider>
          <App />
        </AccessibilityProvider>
      </ResponsiveProvider>
    </ThemeProvider>
  </StrictMode>,
)