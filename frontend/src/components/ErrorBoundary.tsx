import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ErrorMessage } from './UI/ErrorMessage'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * Error Boundary component to catch JavaScript errors anywhere in the child component tree,
 * log those errors, and display a fallback UI.
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  /**
   * Static method to update state so the next render shows the fallback UI.
   */
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  /**
   * Method to log error information.
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    
    // Integrate with Sentry
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: { react: { componentStack: errorInfo.componentStack } }
      })
    }
  }

  public render() {
    if (this.state.hasError) {
      // If a fallback UI is provided, render it
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full">
            <ErrorMessage
              error={this.state.error || new Error('An unexpected error occurred')}
              type="error"
              size="lg"
              onRetry={() => {
                // Reset error state
                this.setState({ hasError: false, error: undefined })
                // Reload the page to restore functionality
                window.location.reload()
              }}
              retryText="再読み込み"
              onDismiss={() => {
                // Reset error state
                this.setState({ hasError: false, error: undefined })
              }}
              dismissText="閉じる"
            />
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary