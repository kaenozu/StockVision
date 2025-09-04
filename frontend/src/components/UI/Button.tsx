/**
 * Button Component
 * 
 * Reusable button component with various styles, sizes, and states.
 * Supports loading states, icons, and accessibility features.
 */

import React from 'react'
import { InlineLoadingSpinner } from './LoadingSpinner'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  children: React.ReactNode
}

const variantClasses = {
  primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white border-transparent',
  secondary: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 text-white border-transparent',
  outline: 'bg-transparent hover:bg-gray-50 focus:ring-blue-500 text-gray-700 border-gray-300',
  ghost: 'bg-transparent hover:bg-gray-100 focus:ring-gray-500 text-gray-700 border-transparent',
  danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white border-transparent',
  success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white border-transparent'
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg'
}

const disabledClasses = {
  primary: 'bg-gray-300 text-gray-500 cursor-not-allowed',
  secondary: 'bg-gray-300 text-gray-500 cursor-not-allowed',
  outline: 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed',
  ghost: 'bg-gray-100 text-gray-400 cursor-not-allowed',
  danger: 'bg-gray-300 text-gray-500 cursor-not-allowed',
  success: 'bg-gray-300 text-gray-500 cursor-not-allowed'
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-medium rounded-lg',
    'border',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    sizeClasses[size]
  ]

  const variantClass = isDisabled ? disabledClasses[variant] : variantClasses[variant]

  const classes = [
    ...baseClasses,
    variantClass,
    fullWidth ? 'w-full' : '',
    className
  ].join(' ')

  const iconElement = loading ? (
    <InlineLoadingSpinner 
      size="sm" 
      color={variant === 'outline' || variant === 'ghost' ? 'primary' : 'white'} 
    />
  ) : icon

  return (
    <button
      className={classes}
      disabled={isDisabled}
      {...props}
    >
      {iconElement && iconPosition === 'left' && (
        <span className={`${children ? 'mr-2' : ''} flex-shrink-0`}>
          {iconElement}
        </span>
      )}
      
      {loading ? (
        <span className="ml-2">処理中...</span>
      ) : (
        children
      )}
      
      {iconElement && iconPosition === 'right' && !loading && (
        <span className={`${children ? 'ml-2' : ''} flex-shrink-0`}>
          {iconElement}
        </span>
      )}
    </button>
  )
}

/**
 * Icon Button (square button with only icon)
 */
export function IconButton({
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled = false,
  tooltip,
  className = '',
  children,
  ...props
}: Omit<ButtonProps, 'icon' | 'iconPosition' | 'fullWidth'> & {
  tooltip?: string
}) {
  const isDisabled = disabled || loading

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
    xl: 'p-4'
  }

  const baseClasses = [
    'inline-flex items-center justify-center',
    'rounded-lg',
    'border',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    sizeClasses[size]
  ]

  const variantClass = isDisabled ? disabledClasses[variant] : variantClasses[variant]

  const classes = [
    ...baseClasses,
    variantClass,
    className
  ].join(' ')

  return (
    <button
      className={classes}
      disabled={isDisabled}
      title={tooltip}
      {...props}
    >
      {loading ? (
        <InlineLoadingSpinner 
          size="sm" 
          color={variant === 'outline' || variant === 'ghost' ? 'primary' : 'white'} 
        />
      ) : (
        children
      )}
    </button>
  )
}

/**
 * Button Group
 */
export function ButtonGroup({
  children,
  orientation = 'horizontal',
  className = ''
}: {
  children: React.ReactNode
  orientation?: 'horizontal' | 'vertical'
  className?: string
}) {
  const orientationClasses = orientation === 'horizontal' 
    ? 'flex flex-row' 
    : 'flex flex-col'

  return (
    <div className={`${orientationClasses} ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child

        const isFirst = index === 0
        const isLast = index === React.Children.count(children) - 1

        let roundedClasses = ''
        if (orientation === 'horizontal') {
          if (isFirst && isLast) {
            roundedClasses = 'rounded-lg'
          } else if (isFirst) {
            roundedClasses = 'rounded-l-lg rounded-r-none'
          } else if (isLast) {
            roundedClasses = 'rounded-r-lg rounded-l-none'
          } else {
            roundedClasses = 'rounded-none'
          }
        } else {
          if (isFirst && isLast) {
            roundedClasses = 'rounded-lg'
          } else if (isFirst) {
            roundedClasses = 'rounded-t-lg rounded-b-none'
          } else if (isLast) {
            roundedClasses = 'rounded-b-lg rounded-t-none'
          } else {
            roundedClasses = 'rounded-none'
          }
        }

        return React.cloneElement(child, {
          className: `${child.props.className || ''} ${roundedClasses}`.trim()
        })
      })}
    </div>
  )
}

/**
 * Floating Action Button
 */
export function FloatingActionButton({
  variant = 'primary',
  size = 'lg',
  position = 'bottom-right',
  className = '',
  children,
  ...props
}: Omit<ButtonProps, 'fullWidth'> & {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}) {
  const positionClasses = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'top-right': 'fixed top-6 right-6',
    'top-left': 'fixed top-6 left-6'
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={`${positionClasses[position]} rounded-full shadow-lg hover:shadow-xl transition-shadow z-50 ${className}`}
      {...props}
    >
      {children}
    </Button>
  )
}

export default Button