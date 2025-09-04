import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useTheme } from '../../contexts/ThemeContext'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000
    }

    setToasts(prev => [...prev, newToast])

    // Auto remove after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastContainer() {
  const { toasts, removeToast } = useToast()
  const { theme } = useTheme()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const { theme } = useTheme()

  const typeStyles = {
    success: `${
      theme === 'dark' 
        ? 'bg-green-900 border-green-700 text-green-100' 
        : 'bg-green-50 border-green-200 text-green-800'
    }`,
    error: `${
      theme === 'dark' 
        ? 'bg-red-900 border-red-700 text-red-100' 
        : 'bg-red-50 border-red-200 text-red-800'
    }`,
    warning: `${
      theme === 'dark' 
        ? 'bg-yellow-900 border-yellow-700 text-yellow-100' 
        : 'bg-yellow-50 border-yellow-200 text-yellow-800'
    }`,
    info: `${
      theme === 'dark' 
        ? 'bg-blue-900 border-blue-700 text-blue-100' 
        : 'bg-blue-50 border-blue-200 text-blue-800'
    }`
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }

  return (
    <div
      className={`
        flex items-start p-4 border rounded-lg shadow-lg
        transform transition-all duration-300 ease-out
        animate-in slide-in-from-right
        ${typeStyles[toast.type]}
      `}
    >
      <div className="flex-shrink-0 mr-3">
        <span className="text-lg">{icons[toast.type]}</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="font-medium">{toast.title}</div>
        {toast.message && (
          <div className="mt-1 text-sm opacity-90">{toast.message}</div>
        )}
        {toast.action && (
          <div className="mt-2">
            <button
              onClick={toast.action.onClick}
              className="text-sm font-medium underline hover:no-underline"
            >
              {toast.action.label}
            </button>
          </div>
        )}
      </div>
      
      <button
        onClick={onClose}
        className="flex-shrink-0 ml-4 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="閉じる"
      >
        ✕
      </button>
    </div>
  )
}

// Convenience hooks
export function useToastActions() {
  const { addToast } = useToast()

  const success = useCallback((title: string, message?: string, duration?: number) => {
    return addToast({ type: 'success', title, message, duration })
  }, [addToast])

  const error = useCallback((title: string, message?: string, duration?: number) => {
    return addToast({ type: 'error', title, message, duration })
  }, [addToast])

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    return addToast({ type: 'warning', title, message, duration })
  }, [addToast])

  const info = useCallback((title: string, message?: string, duration?: number) => {
    return addToast({ type: 'info', title, message, duration })
  }, [addToast])

  return { success, error, warning, info }
}