export type ErrorCategory = 'network' | 'validation' | 'cache' | 'api' | 'unknown'
export type ErrorSeverity = 'info' | 'warning' | 'error'

type Context = Record<string, unknown>

export function errorLogger(message: string, context?: Context, severity: ErrorSeverity = 'error'): void {
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console[severity === 'error' ? 'error' : severity === 'warning' ? 'warn' : 'log'](
      `[ErrorLogger] ${message}`,
      context || {}
    )
  }
}

export function logNetworkError(err: Error, context?: Context): void {
  errorLogger(`Network error: ${err.message}`, context, 'error')
}

export function logValidationError(message: string, context?: Context): void {
  errorLogger(`Validation error: ${message}`, context, 'warning')
}

export function logCacheError(err: Error, context?: Context): void {
  errorLogger(`Cache error: ${err.message}`, context, 'warning')
}

