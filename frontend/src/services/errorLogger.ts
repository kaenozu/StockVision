/**
 * Error Logger Service
 * Centralized error logging for the application
 */

interface ErrorContext {
  [key: string]: any
  componentStack?: string
  errorBoundary?: boolean
  timestamp?: string
  userAgent?: string
  url?: string
}

export enum ErrorLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

interface ErrorLog {
  level: ErrorLevel
  message: string
  error?: Error
  context?: ErrorContext
  timestamp: string
  id: string
}

class ErrorLogger {
  private logs: ErrorLog[] = []
  private maxLogs = 100
  private isDevelopment = import.meta.env.DEV

  /**
   * Log an error with context
   */
  logError(error: Error, context?: ErrorContext, level: ErrorLevel = ErrorLevel.ERROR) {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      level,
      message: error.message,
      error,
      context: {
        ...context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: context?.timestamp || new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    }

    // Store log
    this.addLog(errorLog)

    // Console output in development
    if (this.isDevelopment) {
      console.group(`[${level.toUpperCase()}] ${error.message}`)
      console.error('Error:', error)
      if (context) {
        console.log('Context:', context)
      }
      console.trace('Stack trace')
      console.groupEnd()
    }

    // Send to remote logging service (if configured)
    this.sendToRemote(errorLog)
  }

  /**
   * Log a warning
   */
  logWarning(message: string, context?: ErrorContext) {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      level: ErrorLevel.WARNING,
      message,
      context,
      timestamp: new Date().toISOString()
    }

    this.addLog(errorLog)

    if (this.isDevelopment) {
      console.warn(`[WARNING] ${message}`, context)
    }
  }

  /**
   * Log info message
   */
  logInfo(message: string, context?: ErrorContext) {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      level: ErrorLevel.INFO,
      message,
      context,
      timestamp: new Date().toISOString()
    }

    this.addLog(errorLog)

    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context)
    }
  }

  /**
   * Handle uncaught errors
   */
  handleUncaughtError(event: ErrorEvent) {
    this.logError(
      new Error(event.message),
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'uncaught'
      },
      ErrorLevel.CRITICAL
    )
  }

  /**
   * Handle unhandled promise rejections
   */
  handleUnhandledRejection(event: PromiseRejectionEvent) {
    this.logError(
      new Error(event.reason?.message || 'Unhandled Promise Rejection'),
      {
        reason: event.reason,
        type: 'unhandledRejection'
      },
      ErrorLevel.CRITICAL
    )
  }

  /**
   * Get all logs
   */
  getLogs(): ErrorLog[] {
    return [...this.logs]
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = []
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: ErrorLevel): ErrorLog[] {
    return this.logs.filter(log => log.level === level)
  }

  /**
   * Get recent errors (last 10)
   */
  getRecentErrors(): ErrorLog[] {
    return this.logs
      .filter(log => log.level === ErrorLevel.ERROR || log.level === ErrorLevel.CRITICAL)
      .slice(-10)
  }

  private addLog(log: ErrorLog) {
    this.logs.push(log)
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Store in localStorage for persistence
    try {
      localStorage.setItem('error_logs', JSON.stringify(this.logs))
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Send error to remote logging service
   * This is a placeholder - implement based on your logging service
   */
  private async sendToRemote(errorLog: ErrorLog) {
    // In production, send to your logging service
    if (!this.isDevelopment && import.meta.env.VITE_ERROR_LOGGING_ENDPOINT) {
      try {
        await fetch(import.meta.env.VITE_ERROR_LOGGING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(errorLog)
        })
      } catch (e) {
        // Silently fail - we don't want logging to break the app
        console.error('Failed to send error to remote logging service', e)
      }
    }
  }

  /**
   * Initialize error handlers
   */
  initialize() {
    // Load existing logs from localStorage
    try {
      const stored = localStorage.getItem('error_logs')
      if (stored) {
        this.logs = JSON.parse(stored)
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // Set up global error handlers
    window.addEventListener('error', (event) => {
      this.handleUncaughtError(event)
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.handleUnhandledRejection(event)
    })

    // Log initialization
    this.logInfo('Error logger initialized', {
      isDevelopment: this.isDevelopment,
      maxLogs: this.maxLogs
    })
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger()

// Initialize on import
if (typeof window !== 'undefined') {
  errorLogger.initialize()
}