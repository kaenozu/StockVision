import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '../src/contexts/ThemeContext'
import { ResponsiveProvider } from '../src/contexts/ResponsiveContext'
import { AccessibilityProvider } from '../src/contexts/AccessibilityContext'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <ResponsiveProvider>
        <AccessibilityProvider>
          {children}
        </AccessibilityProvider>
      </ResponsiveProvider>
    </ThemeProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })


export { customRender as render }
