import React from 'react'
import { ErrorBoundaryLayout } from './layout/Layout'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
    // onRetry メソッドをバインド
    this.onRetry = this.onRetry.bind(this)
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo)
  }

  // onRetry メソッドを定義
  onRetry() {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <ErrorBoundaryLayout
          error={this.state.error}
          onRetry={this.onRetry}
        />
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary