import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { PriceForecast } from '../../utils/tradingSignals'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface PriceForecastChartProps {
  forecast: PriceForecast
  currentPrice: number
  stockCode: string
}

export const PriceForecastChart: React.FC<PriceForecastChartProps> = ({
  forecast,
  currentPrice,
  stockCode
}) => {
  // 全ての日付を収集して統一
  const allDates = [
    ...forecast.historicalPrices.map(p => p.date),
    ...forecast.bullishForecast.map(p => p.date)
  ]
  
  // 重複を除去してソート
  const uniqueDates = [...new Set(allDates)].sort()
  
  // 各シナリオのデータを日付に対応させる
  const createDataPoints = (points: typeof forecast.bullishForecast) => {
    return uniqueDates.map(date => {
      const point = points.find(p => p.date === date)
      return point ? point.price : null
    })
  }
  
  const data = {
    labels: uniqueDates.map(date => {
      const d = new Date(date)
      return `${d.getMonth() + 1}/${d.getDate()}`
    }),
    datasets: [
      {
        label: '過去の価格',
        data: createDataPoints(forecast.historicalPrices),
        borderColor: 'rgb(107, 114, 128)',
        backgroundColor: 'rgba(107, 114, 128, 0.1)',
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1
      },
      {
        label: '上昇シナリオ (楽観的)',
        data: createDataPoints(forecast.bullishForecast),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.2
      },
      {
        label: '下落シナリオ (悲観的)',
        data: createDataPoints(forecast.bearishForecast),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.2
      },
      {
        label: 'レンジシナリオ (中立)',
        data: createDataPoints(forecast.neutralForecast),
        borderColor: 'rgb(251, 191, 36)',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderWidth: 2,
        borderDash: [2, 8],
        pointRadius: 1,
        pointHoverRadius: 3,
        tension: 0.3
      }
    ]
  }

  // エントリーポイントの注釈を追加
  const annotations: any[] = []
  
  // エントリーポイント
  forecast.entryPoints.forEach((entry, index) => {
    const dateIndex = uniqueDates.indexOf(entry.date)
    if (dateIndex !== -1) {
      annotations.push({
        type: 'point',
        xValue: dateIndex,
        yValue: entry.price,
        backgroundColor: entry.type === 'buy' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
        borderColor: 'white',
        borderWidth: 2,
        radius: 8,
        label: {
          content: entry.type === 'buy' ? 'BUY' : 'SELL',
          enabled: true
        }
      })
    }
  })
  
  // エグジットポイント
  forecast.exitPoints.forEach((exit, index) => {
    const dateIndex = uniqueDates.indexOf(exit.date)
    if (dateIndex !== -1) {
      annotations.push({
        type: 'point',
        xValue: dateIndex,
        yValue: exit.price,
        backgroundColor: exit.type === 'profit' ? 'rgb(59, 130, 246)' : 'rgb(220, 38, 127)',
        borderColor: 'white',
        borderWidth: 2,
        radius: 6,
        label: {
          content: exit.type === 'profit' ? 'EXIT' : 'STOP',
          enabled: true
        }
      })
    }
  })

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      title: {
        display: true,
        text: `${stockCode} - 価格予想チャート (30日間)`,
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            if (value === null) return ''
            return `${label}: ¥${value.toLocaleString()}`
          },
          afterLabel: function(context) {
            const datasetIndex = context.datasetIndex
            const dataIndex = context.dataIndex
            
            // 信頼度情報を表示
            if (datasetIndex === 1 && forecast.bullishForecast[dataIndex]?.confidence) {
              return `信頼度: ${forecast.bullishForecast[dataIndex].confidence}%`
            }
            if (datasetIndex === 2 && forecast.bearishForecast[dataIndex]?.confidence) {
              return `信頼度: ${forecast.bearishForecast[dataIndex].confidence}%`
            }
            if (datasetIndex === 3 && forecast.neutralForecast[dataIndex]?.confidence) {
              return `信頼度: ${forecast.neutralForecast[dataIndex].confidence}%`
            }
            
            return ''
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '日付'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: '価格 (¥)'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value) {
            return '¥' + Number(value).toLocaleString()
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    elements: {
      point: {
        hoverRadius: 8
      }
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          📊 価格予想チャート
        </h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• <span className="font-medium text-gray-800">実線</span>: 過去の実際価格</p>
          <p>• <span className="font-medium text-green-600">破線</span>: 各シナリオ予測（信頼度は時間と共に低下）</p>
          <p>• <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span> エントリーポイント　<span className="inline-block w-3 h-3 bg-blue-500 rounded-full ml-2"></span> 利確ポイント　<span className="inline-block w-3 h-3 bg-pink-600 rounded-full ml-2"></span> 損切りポイント</p>
        </div>
      </div>
      
      <div className="h-80">
        <Line data={data} options={options} />
      </div>
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <div className="font-medium text-green-800">上昇シナリオ</div>
          <div className="text-green-600">
            最高値: ¥{Math.max(...forecast.bullishForecast.map(p => p.price)).toLocaleString()}
          </div>
          <div className="text-green-600">
            30日後: ¥{forecast.bullishForecast[forecast.bullishForecast.length - 1]?.price.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="font-medium text-red-800">下落シナリオ</div>
          <div className="text-red-600">
            最安値: ¥{Math.min(...forecast.bearishForecast.map(p => p.price)).toLocaleString()}
          </div>
          <div className="text-red-600">
            30日後: ¥{forecast.bearishForecast[forecast.bearishForecast.length - 1]?.price.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <div className="font-medium text-yellow-800">レンジシナリオ</div>
          <div className="text-yellow-600">
            レンジ幅: ±{((Math.max(...forecast.neutralForecast.map(p => p.price)) - Math.min(...forecast.neutralForecast.map(p => p.price))) / 2 / currentPrice * 100).toFixed(1)}%
          </div>
          <div className="text-yellow-600">
            30日後: ¥{forecast.neutralForecast[forecast.neutralForecast.length - 1]?.price.toLocaleString()}
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-500 border-t pt-3">
        ⚠️ 価格予想は過去データとテクニカル分析に基づく予測であり、実際の結果を保証するものではありません。
        投資判断は自己責任でお願いいたします。
      </div>
    </div>
  )
}

export default PriceForecastChart