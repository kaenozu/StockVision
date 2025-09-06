import React, { useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { useTheme } from '../../contexts/ThemeContext'
import { PriceHistoryItem } from '../../types/stock'
import { calculateAllIndicators } from '../../utils/technicalIndicators'
import { formatPrice, formatDateShort } from '../../utils/formatters'
import type { ChartOptions, TooltipItem, ChartData } from 'chart.js'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface TechnicalChartProps {
  data: PriceHistoryItem[]
  height?: number
}

type IndicatorType = 'none' | 'sma' | 'ema' | 'bollinger' | 'macd' | 'rsi'

export function TechnicalChart({ data, height = 400 }: TechnicalChartProps) {
  const { theme } = useTheme()
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorType>('sma')
  
  const chartData = useMemo(() => {
    if (!data.length) return null
    
    const prices = data.map(item => item.close)
    const labels = data.map(item => formatDateShort(item.date))
    const indicators = calculateAllIndicators(prices)
    
    const isDark = theme === 'dark'
    const baseConfig = {
      labels,
      datasets: [
        {
          label: '株価',
          data: prices,
          borderColor: isDark ? '#60A5FA' : '#3B82F6',
          backgroundColor: isDark ? '#60A5FA20' : '#3B82F620',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        }
      ]
    }
    
    // Add indicator datasets based on selection
    switch (selectedIndicator) {
      case 'sma':
        baseConfig.datasets.push(
          {
            label: 'SMA5',
            data: indicators.sma5,
            borderColor: isDark ? '#F59E0B' : '#D97706',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 0,
            borderDash: [2, 2],
          },
          {
            label: 'SMA20',
            data: indicators.sma20,
            borderColor: isDark ? '#EF4444' : '#DC2626',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 0,
            borderDash: [4, 4],
          },
          {
            label: 'SMA50',
            data: indicators.sma50,
            borderColor: isDark ? '#8B5CF6' : '#7C3AED',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 0,
            borderDash: [6, 6],
          }
        )
        break
        
      case 'ema':
        baseConfig.datasets.push(
          {
            label: 'EMA12',
            data: indicators.ema12,
            borderColor: isDark ? '#10B981' : '#059669',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 0,
          },
          {
            label: 'EMA26',
            data: indicators.ema26,
            borderColor: isDark ? '#F59E0B' : '#D97706',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 0,
          }
        )
        break
        
      case 'bollinger':
        baseConfig.datasets.push(
          {
            label: 'ボリンジャー上限',
            data: indicators.bollingerUpper,
            borderColor: isDark ? '#EF4444' : '#DC2626',
            backgroundColor: 'transparent',
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
          },
          {
            label: 'ボリンジャー中央',
            data: indicators.bollingerMiddle,
            borderColor: isDark ? '#6B7280' : '#4B5563',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
          },
          {
            label: 'ボリンジャー下限',
            data: indicators.bollingerLower,
            borderColor: isDark ? '#10B981' : '#059669',
            backgroundColor: isDark ? '#10B98120' : '#05966920',
            borderWidth: 1,
            pointRadius: 0,
            fill: '+1',
          }
        )
        break
    }
    
    return baseConfig
  }, [data, selectedIndicator, theme])
  
  const secondaryChartData = useMemo(() => {
    if (!data.length || (selectedIndicator !== 'macd' && selectedIndicator !== 'rsi')) return null
    
    const prices = data.map(item => item.close)
    const labels = data.map(item => formatDateShort(item.date))
    const indicators = calculateAllIndicators(prices)
    
    const isDark = theme === 'dark'
    
    if (selectedIndicator === 'macd') {
      return {
        labels,
        datasets: [
          {
            label: 'MACD',
            data: indicators.macd,
            borderColor: isDark ? '#60A5FA' : '#3B82F6',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            type: 'line' as const,
          },
          {
            label: 'Signal',
            data: indicators.macdSignal,
            borderColor: isDark ? '#EF4444' : '#DC2626',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            type: 'line' as const,
          },
          {
            label: 'Histogram',
            data: indicators.macdHistogram,
            backgroundColor: indicators.macdHistogram.map(val => 
              val === null ? 'transparent' : 
              val >= 0 ? (isDark ? '#10B981' : '#059669') : (isDark ? '#EF4444' : '#DC2626')
            ),
            borderColor: 'transparent',
            type: 'bar' as const,
          }
        ]
      }
    }
    
    if (selectedIndicator === 'rsi') {
      return {
        labels,
        datasets: [
          {
            label: 'RSI',
            data: indicators.rsi,
            borderColor: isDark ? '#8B5CF6' : '#7C3AED',
            backgroundColor: isDark ? '#8B5CF620' : '#7C3AED20',
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
          }
        ]
      }
    }
    
    return null
  }, [data, selectedIndicator, theme])
  
  const chartOptions = useMemo<ChartOptions<'line'>>(() => {
    const isDark = theme === 'dark'
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            color: isDark ? '#D1D5DB' : '#374151',
            usePointStyle: true,
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          titleColor: isDark ? '#F3F4F6' : '#1F2937',
          bodyColor: isDark ? '#D1D5DB' : '#374151',
          borderColor: isDark ? '#374151' : '#D1D5DB',
          borderWidth: 1,
          callbacks: {
            label: (context: TooltipItem<'line'>) => {
              const label = context.dataset.label || ''
              const value = context.parsed.y
              if (value === null) return ''
              
              if (selectedIndicator === 'rsi') {
                return `${label}: ${value.toFixed(2)}`
              }
              
              return `${label}: ${formatPrice(value)}`
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          grid: {
            color: isDark ? '#374151' : '#E5E7EB',
          },
          ticks: {
            color: isDark ? '#9CA3AF' : '#6B7280',
            maxTicksLimit: 8,
          },
        },
        y: {
          display: true,
          position: 'right' as const,
          grid: {
            color: isDark ? '#374151' : '#E5E7EB',
          },
          ticks: {
            color: isDark ? '#9CA3AF' : '#6B7280',
            callback: function(this, tickValue: string | number) {
              if (selectedIndicator === 'rsi') {
                return `${tickValue}%`
              }
              return typeof tickValue === 'number' ? formatPrice(tickValue) : String(tickValue)
            },
          },
          ...(selectedIndicator === 'rsi' && {
            min: 0,
            max: 100,
          }),
        },
      },
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      elements: {
        line: {
          tension: 0.1,
        },
      },
    }
  }, [theme, selectedIndicator])
  
  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">チャートデータがありません</div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Indicator Selection */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'none' as const, label: '指標なし' },
          { value: 'sma' as const, label: '移動平均線' },
          { value: 'ema' as const, label: 'EMA' },
          { value: 'bollinger' as const, label: 'ボリンジャーバンド' },
          { value: 'macd' as const, label: 'MACD' },
          { value: 'rsi' as const, label: 'RSI' },
        ].map((indicator) => (
          <button
            key={indicator.value}
            onClick={() => setSelectedIndicator(indicator.value)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedIndicator === indicator.value
                ? 'bg-blue-600 text-white'
                : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {indicator.label}
          </button>
        ))}
      </div>
      
      {/* Price Chart */}
      <div style={{ height: selectedIndicator === 'macd' || selectedIndicator === 'rsi' ? height * 0.7 : height }}>
        <Line data={chartData} options={chartOptions} />
      </div>
      
      {/* Secondary Chart for MACD/RSI */}
      {secondaryChartData && (selectedIndicator === 'macd' || selectedIndicator === 'rsi') && (
        <div style={{ height: height * 0.3 }}>
          <Line 
            data={secondaryChartData as ChartData<'line'>} 
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                legend: {
                  ...chartOptions.plugins.legend,
                  position: 'bottom' as const,
                },
              },
            }} 
          />
        </div>
      )}
    </div>
  )
}
