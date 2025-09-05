
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { Toast } from '../../types/ui'
import { useEffect } from 'react'

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

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

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.duration, onClose])

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
