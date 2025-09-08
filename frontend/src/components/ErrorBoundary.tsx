import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ErrorMessage } from './UI/ErrorMessage'
import { errorLogger, ErrorLevel } from '../services/errorLogger'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, retry: () => void) => ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * Error Boundary component to catch JavaScript errors anywhere in the child component tree,
 * log those errors, and display a fallback UI with integrated error logging.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error using the error logger service
    errorLogger.logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      errorBoundaryProps: this.props,
    }, ErrorLevel.CRITICAL)
    
    // Update state with error info
    this.setState({ errorInfo })
  }

  handleRetry = () => {
    // Reset error state
    this.setState({ hasError: false, error: null, errorInfo: null })
    // Reload the page to restore functionality
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      // If a fallback UI is provided, render it
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.handleRetry)
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full">
            <ErrorMessage
              error={this.state.error || new Error('An unexpected error occurred')}
              onRetry={this.handleRetry}
              retryText="再読み込み"
            />
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary