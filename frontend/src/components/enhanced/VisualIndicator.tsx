import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAccessibility } from '../../contexts/AccessibilityContext'

export type IndicatorType = 'gain' | 'loss' | 'neutral' | 'unknown'
export type IndicatorSize = 'sm' | 'md' | 'lg' | 'xl'
export type IndicatorVariant = 'arrow' | 'triangle' | 'circle' | 'square' | 'text'

interface VisualIndicatorProps {
  type: IndicatorType
  value?: number | string
  size?: IndicatorSize
  variant?: IndicatorVariant
  className?: string
  showValue?: boolean
  ariaLabel?: string
  animated?: boolean
  'data-testid'?: string
}

const VisualIndicator: React.FC<VisualIndicatorProps> = ({
  type,
  value,
  size = 'md',
  variant = 'arrow',
  className = '',
  showValue = false,
  ariaLabel,
  animated = true,
  'data-testid': testId = 'visual-indicator'
}) => {
  const { actualTheme } = useTheme()
  const { reducedMotion, highContrast } = useAccessibility()

  // Size classes mapping
  const sizeClasses = {
    sm: {
      icon: 'w-3 h-3 text-xs',
      text: 'text-xs',
      container: 'gap-1'
    },
    md: {
      icon: 'w-4 h-4 text-sm',
      text: 'text-sm',
      container: 'gap-1.5'
    },
    lg: {
      icon: 'w-5 h-5 text-base',
      text: 'text-base',
      container: 'gap-2'
    },
    xl: {
      icon: 'w-6 h-6 text-lg',
      text: 'text-lg',
      container: 'gap-2.5'
    }
  }

  // Color classes based on type
  const getColorClasses = (indicatorType: IndicatorType) => {
    const baseClasses = {
      gain: highContrast 
        ? 'text-green-900 dark:text-green-100' 
        : 'text-gain-600 dark:text-gain-400',
      loss: highContrast 
        ? 'text-red-900 dark:text-red-100' 
        : 'text-loss-600 dark:text-loss-400',
      neutral: highContrast 
        ? 'text-gray-900 dark:text-gray-100' 
        : 'text-secondary-600 dark:text-secondary-400',
      unknown: highContrast 
        ? 'text-gray-700 dark:text-gray-300' 
        : 'text-secondary-500 dark:text-secondary-500'
    }
    return baseClasses[indicatorType]
  }

  // Animation classes
  const animationClasses = animated && !reducedMotion 
    ? 'transition-all duration-200 ease-in-out' 
    : reducedMotion 
      ? 'motion-reduce:transition-none' 
      : ''

  // Render different variants
  const renderIcon = () => {
    const iconSize = sizeClasses[size].icon
    const colorClasses = getColorClasses(type)
    const classes = `${iconSize} ${colorClasses} ${animationClasses}`

    switch (variant) {
      case 'arrow':
        if (type === 'gain') {
          return (
            <svg className={classes} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a.75.75 0 01-.75-.75V4.66L7.3 6.76a.75.75 0 11-1.1-1.02l3.25-3.5a.75.75 0 011.1 0l3.25 3.5a.75.75 0 01-1.1 1.02L10.75 4.66v12.59A.75.75 0 0110 18z" clipRule="evenodd" />
            </svg>
          )
        } else if (type === 'loss') {
          return (
            <svg className={classes} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v12.59l1.95-2.1a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 111.1-1.02l1.95 2.1V2.75A.75.75 0 0110 2z" clipRule="evenodd" />
            </svg>
          )
        } else {
          return (
            <svg className={classes} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
          )
        }

      case 'triangle':
        return (
          <div 
            className={`${iconSize} ${colorClasses} ${animationClasses} relative`}
            style={{
              clipPath: type === 'gain' 
                ? 'polygon(50% 0%, 0% 100%, 100% 100%)' 
                : type === 'loss'
                ? 'polygon(50% 100%, 0% 0%, 100% 0%)'
                : 'polygon(50% 50%, 0% 100%, 100% 100%)'
            }}
          />
        )

      case 'circle':
        return (
          <div 
            className={`rounded-full ${iconSize} ${colorClasses} ${animationClasses}`}
            style={{ backgroundColor: 'currentColor' }}
          />
        )

      case 'square':
        return (
          <div 
            className={`${iconSize} ${colorClasses} ${animationClasses}`}
            style={{ backgroundColor: 'currentColor' }}
          />
        )

      case 'text':
        const symbols = {
          gain: '▲',
          loss: '▼',
          neutral: '─',
          unknown: '?'
        }
        return (
          <span className={`${sizeClasses[size].text} ${colorClasses} ${animationClasses} font-bold`}>
            {symbols[type]}
          </span>
        )

      default:
        return null
    }
  }

  // Generate aria-label
  const getAriaLabel = () => {
    if (ariaLabel) return ariaLabel

    const typeLabels = {
      gain: 'price increase',
      loss: 'price decrease',
      neutral: 'price unchanged',
      unknown: 'price status unknown'
    }

    const baseLabel = typeLabels[type]
    
    if (showValue && value !== undefined) {
      return `${baseLabel}, ${value}`
    }
    
    return baseLabel
  }

  return (
    <div
      className={`inline-flex items-center ${sizeClasses[size].container} ${className}`}
      data-testid={testId}
      aria-label={getAriaLabel()}
      role="img"
    >
      {renderIcon()}
      {showValue && value !== undefined && (
        <span 
          className={`${sizeClasses[size].text} ${getColorClasses(type)} font-medium ${animationClasses}`}
          data-testid={`${testId}-value`}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      )}
    </div>
  )
}

export default VisualIndicator