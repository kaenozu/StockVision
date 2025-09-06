import React from 'react'
import { ErrorBoundaryLayout } from './layout/Layout'
import { errorLogger, ErrorLevel } from '../services/errorLogger'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: (error: Error, retry: () => void) => React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error using the error logger service
    errorLogger.logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      errorBoundaryProps: this.props,
    }, ErrorLevel.CRITICAL)
    
    // Update state with error info
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <ErrorBoundaryLayout
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary