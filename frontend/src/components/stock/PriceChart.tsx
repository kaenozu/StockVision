/**
 * Price Chart Component
 * 
 * Interactive price chart using Chart.js with support for line and candlestick views,
 * multiple timeframes, and Japanese localization.
 */

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import type { ChartDataset, ChartOptions } from 'chart.js'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TooltipItem,
  ChartData as ChartJSData,
  ChartDataset as ChartJSDataset
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { PriceHistoryItem, ChartConfig, ChartTimeframe, ChartType } from '../../types/stock'
import { formatPrice, formatDateShort, formatDateJapanese } from '../../utils/formatters'
import LoadingSpinner from '../UI/LoadingSpinner'
import ErrorMessage from '../UI/ErrorMessage'
import Button, { ButtonGroup } from '../UI/Button'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface PriceChartProps {
  data: PriceHistoryItem[]
  loading?: boolean
  error?: string | null
  config?: Partial<ChartConfig>
  onConfigChange?: (config: ChartConfig) => void
  onRefresh?: () => void
  stockCode?: string
  height?: number
  className?: string
}

const timeframeOptions: { value: ChartTimeframe; label: string }[] = [
  { value: '7d', label: '7日間' },
  { value: '30d', label: '30日間' },
  { value: '90d', label: '90日間' },
  { value: '1y', label: '1年間' }
]

const chartTypeOptions: { value: ChartType; label: string }[] = [
  { value: 'line', label: 'ライン' },
  { value: 'candlestick', label: 'ローソク足' }
]

import { calculateMovingAverage } from '../../utils/chartHelpers'

export function PriceChart({
  data,
  loading = false,
  error = null,
  config = {},
  onConfigChange,
  onRefresh,
  stockCode = '',
  height = 300,
  className = ''
}: PriceChartProps) {
  const { isDark } = useTheme()
  
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    timeframe: '30d',
    chart_type: 'line',
    show_volume: false,
    theme: isDark ? 'dark' : 'light',
    ...config
  })
  
  const [showMA5, setShowMA5] = useState(false)
  const [showMA20, setShowMA20] = useState(false)
  const [chartKey, setChartKey] = useState(0)

  const updateConfig = (newConfig: Partial<ChartConfig>) => {
    // Clean up all charts before config change
    try {
      Object.values(ChartJS.instances).forEach(chart => {
        try {
          chart.destroy()
        } catch (e) {
          // Ignore individual chart destruction errors
        }
      })
    } catch (error) {
      // Ignore global cleanup errors
    }
    
    const updatedConfig = { ...chartConfig, ...newConfig }
    setChartConfig(updatedConfig)
    onConfigChange?.(updatedConfig)
    // Force chart recreation
    setChartKey(prev => prev + 1)
  }

  // Comprehensive cleanup and recreation
  useEffect(() => {
    // Destroy all existing Chart instances to prevent canvas reuse
    try {
      // Get all chart instances and destroy them
      Object.values(ChartJS.instances).forEach(chart => {
        try {
          chart.destroy()
        } catch (e) {
          // Ignore individual chart destruction errors
        }
      })
    } catch (error) {
      // Ignore global cleanup errors
    }
    
    setChartKey(prev => prev + 1)
    
    return () => {
      try {
        // Final cleanup on unmount
        Object.values(ChartJS.instances).forEach(chart => {
          try {
            chart.destroy()
          } catch (e) {
            // Ignore cleanup errors
          }
        })
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, [data.length])

  // Process data for chart
  const chartData = useMemo((): ChartJSData<'line'> => {
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: []
      }
    }

    // Sort data by date (chronological order for proper chart display)
    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    console.log('DEBUG PriceChart: sortedData length:', sortedData.length);
    console.log('DEBUG PriceChart: first 5 dates:', sortedData.slice(0, 5).map(d => d.date));
    console.log('DEBUG PriceChart: last 5 dates:', sortedData.slice(-5).map(d => d.date));

    const labels = sortedData.map(item => formatDateShort(item.date))
    const closePrices = sortedData.map(item => item.close)
    
    console.log('DEBUG PriceChart: first 5 labels:', labels.slice(0, 5));
    console.log('DEBUG PriceChart: last 5 labels:', labels.slice(-5));
    
    const datasets: ChartDataset<'line', (number | null)[]>[] = []
    
    if (chartConfig.chart_type === 'line') {
      // Main price line
      datasets.push({
        label: '終値',
        data: closePrices,
        borderColor: isDark ? 'rgb(99, 179, 237)' : 'rgb(59, 130, 246)',
        backgroundColor: isDark ? 'rgba(99, 179, 237, 0.1)' : 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 6,
        pointBackgroundColor: isDark ? 'rgb(99, 179, 237)' : 'rgb(59, 130, 246)',
        pointBorderColor: isDark ? 'rgb(31, 41, 55)' : 'white',
        pointBorderWidth: 2
      })
      
      // Moving averages
      if (showMA5) {
        const ma5 = calculateMovingAverage(closePrices, 5)
        datasets.push({
          label: 'MA5',
          data: ma5,
          borderColor: isDark ? 'rgb(248, 113, 113)' : 'rgb(239, 68, 68)',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          fill: false,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderDash: [5, 5]
        })
      }
      
      if (showMA20) {
        const ma20 = calculateMovingAverage(closePrices, 20)
        datasets.push({
          label: 'MA20',
          data: ma20,
          borderColor: isDark ? 'rgb(134, 239, 172)' : 'rgb(34, 197, 94)',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          fill: false,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderDash: [10, 5]
        })
      }
      
      return { labels, datasets }
    } else {
      // For candlestick, we'll use a line chart with OHLC data approximation
      // In a real implementation, you'd use a candlestick chart library
      return {
        labels,
        datasets: [
          {
            label: '高値',
            data: sortedData.map(item => item.high),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'transparent',
            borderWidth: 1,
            pointRadius: 1
          },
          {
            label: '安値',
            data: sortedData.map(item => item.low),
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'transparent',
            borderWidth: 1,
            pointRadius: 1
          },
          {
            label: '終値',
            data: sortedData.map(item => item.close),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderWidth: 2,
            fill: false,
            pointRadius: 2
          }
        ]
      }
    }
  }, [data, chartConfig.chart_type, isDark, showMA5, showMA20])

  // Chart options
  const chartOptions = useMemo<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: 'Noto Sans JP, sans-serif'
          },
          color: isDark ? 'rgb(209, 213, 219)' : 'rgb(55, 65, 81)'
        }
      },
      title: {
        display: !!stockCode,
        text: stockCode ? `${stockCode} - 価格チャート` : '',
        font: {
          family: 'Noto Sans JP, sans-serif',
          size: 16,
          weight: 700
        },
        color: isDark ? 'rgb(209, 213, 219)' : 'rgb(55, 65, 81)'
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        titleFont: {
          family: 'Noto Sans JP, sans-serif'
        },
        bodyFont: {
          family: 'Noto Sans JP, sans-serif'
        },
        callbacks: {
          title: function(context: TooltipItem<'line'>[]) {
            const dataIndex = context[0]?.dataIndex
            if (dataIndex !== undefined && data[dataIndex]) {
              return formatDateJapanese(data[dataIndex].date)
            }
            return ''
          },
          label: function(context: TooltipItem<'line'>) {
            const value = context.parsed.y
            return `${context.dataset.label}: ${formatPrice(value)}`
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '日付',
          font: {
            family: 'Noto Sans JP, sans-serif'
          },
          color: isDark ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)'
        },
        ticks: {
          font: {
            family: 'Noto Sans JP, sans-serif'
          },
          color: isDark ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)',
          maxTicksLimit: 10,
          autoSkip: true,
          callback: function(value: string | number, index: number) {
            // Chart.jsはlabelsから直接ラベルを取得するので、元のラベルを返す
            const dataLength = data.length;
            const chartLabels = chartData.labels;
            console.log('DEBUG PriceChart X-axis callback: index=', index, 'dataLength=', dataLength, 'value=', value);
            
            if (dataLength <= 10) {
              // 10日以下の場合は全ての日付を表示
              const result = chartLabels[index] || '';
              console.log('DEBUG PriceChart: showing all dates, index', index, 'result=', result);
              return result;
            } else {
              // 10日を超える場合は適切な間隔で表示
              const skip = Math.ceil(dataLength / 10);
              if (index % skip === 0 || index === dataLength - 1) {
                const result = chartLabels[index] || '';
                console.log('DEBUG PriceChart: skip interval, index', index, 'skip=', skip, 'result=', result);
                return result;
              }
              console.log('DEBUG PriceChart: skipping index', index);
              return '';
            }
          }
        },
        grid: {
          color: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(156, 163, 175, 0.3)'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: '価格 (¥)',
          font: {
            family: 'Noto Sans JP, sans-serif'
          },
          color: isDark ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)'
        },
        ticks: {
          font: {
            family: 'Noto Sans JP, sans-serif'
          },
          color: isDark ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)',
          callback: function(this, tickValue: string | number) {
            return typeof tickValue === 'number' ? formatPrice(tickValue) : String(tickValue)
          }
        },
        grid: {
          color: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(156, 163, 175, 0.3)'
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  }), [stockCode, data, isDark])

  if (loading) {
    return (
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-md border ${className}`}>
        <div className="p-6">
          <div className="flex items-center justify-center" style={{ height }}>
            <LoadingSpinner size="lg" showMessage message="チャートを読み込み中..." />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
        <div className="p-6">
          <ErrorMessage 
            error={error} 
            onRetry={onRefresh}
            retryText="再読み込み"
          />
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-lg font-medium mb-2">チャートデータがありません</h3>
            <p className="text-gray-400 mb-4">株式コードを検索してチャートを表示してください</p>
            {onRefresh && (
              <Button variant="outline" onClick={onRefresh}>
                データを取得
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-md border ${className}`}>
      {/* Chart Controls */}
      <div className={`p-4 ${isDark ? 'border-gray-700' : 'border-gray-200'} border-b`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>価格チャート</h3>
            {stockCode && (
              <span className={`text-sm font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stockCode}</span>
            )}
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Timeframe Selection */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">期間:</span>
              <ButtonGroup className="text-sm">
                {timeframeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={chartConfig.timeframe === option.value ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => updateConfig({ timeframe: option.value })}
                  >
                    {option.label}
                  </Button>
                ))}
              </ButtonGroup>
            </div>

            {/* Chart Type Selection */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">表示:</span>
              <ButtonGroup className="text-sm">
                {chartTypeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={chartConfig.chart_type === option.value ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => updateConfig({ chart_type: option.value })}
                  >
                    {option.label}
                  </Button>
                ))}
              </ButtonGroup>
            </div>

            {/* Moving Averages */}
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>指標:</span>
              <ButtonGroup className="text-sm">
                <Button
                  variant={showMA5 ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setShowMA5(!showMA5)}
                >
                  MA5
                </Button>
                <Button
                  variant={showMA20 ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setShowMA20(!showMA20)}
                >
                  MA20
                </Button>
              </ButtonGroup>
            </div>

            {/* Refresh Button */}
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className={isDark ? 'text-gray-400' : 'text-gray-600'}
              >
                🔄 更新
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <div style={{ height }}>
          <Line 
            key={`price-chart-${chartKey}`}
            data={chartData} 
            options={chartOptions}
            redraw={true}
          />
        </div>
      </div>

      {/* Chart Summary */}
      <div className={`p-4 border-t ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
        <div className={`flex items-center justify-between text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <div>
            データ期間: {data.length}日間
          </div>
          <div>
            最新価格: {formatPrice(data[data.length - 1]?.close || 0)}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Mini Price Chart (for cards, etc.)
 */
export function MiniPriceChart({
  data,
  height = 120,
  className = ''
}: {
  data: PriceHistoryItem[]
  height?: number
  className?: string
}) {
  const [miniChartKey, setMiniChartKey] = useState(0)

  // Comprehensive cleanup for mini chart
  useEffect(() => {
    setMiniChartKey(prev => prev + 1)
    
    return () => {
      try {
        // Cleanup chart instances
        Object.values(ChartJS.instances).forEach(chart => {
          try {
            chart.destroy()
          } catch (e) {
            // Ignore cleanup errors
          }
        })
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, [data.length])
  const chartData = useMemo((): ChartJSData<'line'> => {
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: []
      }
    }

    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return {
      labels: sortedData.map(() => ''), // Hide labels for mini chart
      datasets: [
        {
          data: sortedData.map(item => item.close),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 1.5,
          fill: true,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 0
        } as ChartJSDataset<'line'>
      ]
    }
  }, [data])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false
      }
    },
    scales: {
      x: {
        display: false
      },
      y: {
        display: false
      }
    },
    interaction: {
      intersect: false
    }
  }), [])

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center text-gray-400 ${className}`} style={{ height }}>
        <span className="text-sm">データなし</span>
      </div>
    )
  }

  return (
    <div className={className} style={{ height }}>
      <Line 
        key={`mini-chart-${miniChartKey}`}
        data={chartData} 
        options={chartOptions}
        redraw={true}
      />
    </div>
  )
}

export default PriceChart
