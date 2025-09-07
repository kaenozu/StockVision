/**
 * Worker Manager Component
 * 
 * Development tool for monitoring and managing Web Workers.
 * Provides real-time statistics and control panel.
 */

import React, { useState, useEffect, memo } from 'react'
import { useStockDataWorker } from '../../hooks/useWebWorker'

interface WorkerStats {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  averageProcessingTime: number
  activeWorkers: number
  pendingTasks: number
}

interface WorkerManagerProps {
  enabled?: boolean
  showOverlay?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export const WorkerManager = memo<WorkerManagerProps>(function WorkerManager({
  enabled = process.env.NODE_ENV === 'development',
  showOverlay = false,
  position = 'bottom-right'
}) {
  const [stats, setStats] = useState<WorkerStats>({
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageProcessingTime: 0,
    activeWorkers: 0,
    pendingTasks: 0
  })
  
  const [isVisible, setIsVisible] = useState(showOverlay)
  const [taskHistory, setTaskHistory] = useState<Array<{
    id: string
    type: string
    duration: number
    success: boolean
    timestamp: number
  }>>([])

  const stockWorker = useStockDataWorker()

  // Update stats periodically
  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(() => {
      const workerStatus = stockWorker.getStatus()
      
      setStats(prevStats => ({
        ...prevStats,
        activeWorkers: workerStatus.isActive ? 1 : 0,
        pendingTasks: workerStatus.pendingTasks
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [enabled, stockWorker])

  // Test functions for development
  const testWorkerPerformance = async () => {
    const testData = Array.from({ length: 1000 }, (_, i) => ({
      stock_code: `TEST${i.toString().padStart(4, '0')}`,
      current_price: Math.random() * 1000,
      price_change: Math.random() * 20 - 10,
      price_change_pct: Math.random() * 10 - 5,
      volume: Math.floor(Math.random() * 1000000),
      company_name: `Test Company ${i}`
    }))

    try {
      const startTime = performance.now()
      
      await stockWorker.processBulkData(testData, {
        sortBy: 'price_change_pct',
        sortOrder: 'desc',
        filters: { gainersOnly: true }
      })
      
      const duration = performance.now() - startTime
      
      setStats(prev => ({
        ...prev,
        totalTasks: prev.totalTasks + 1,
        completedTasks: prev.completedTasks + 1,
        averageProcessingTime: (prev.averageProcessingTime * prev.completedTasks + duration) / (prev.completedTasks + 1)
      }))

      setTaskHistory(prev => [...prev.slice(-9), {
        id: `test_${Date.now()}`,
        type: 'BULK_PROCESS',
        duration,
        success: true,
        timestamp: Date.now()
      }])

    } catch (error) {
      setStats(prev => ({
        ...prev,
        totalTasks: prev.totalTasks + 1,
        failedTasks: prev.failedTasks + 1
      }))

      setTaskHistory(prev => [...prev.slice(-9), {
        id: `test_${Date.now()}`,
        type: 'BULK_PROCESS',
        duration: 0,
        success: false,
        timestamp: Date.now()
      }])
    }
  }

  const testTechnicalIndicators = async () => {
    const testPrices = Array.from({ length: 100 }, () => ({
      date: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      open: Math.random() * 1000,
      high: Math.random() * 1000,
      low: Math.random() * 1000,
      close: Math.random() * 1000,
      volume: Math.floor(Math.random() * 1000000)
    }))

    try {
      const startTime = performance.now()
      
      await stockWorker.calculateTechnicalIndicators(testPrices, [
        'SMA_20', 'EMA_12', 'RSI', 'MACD', 'BOLLINGER'
      ])
      
      const duration = performance.now() - startTime
      
      setStats(prev => ({
        ...prev,
        totalTasks: prev.totalTasks + 1,
        completedTasks: prev.completedTasks + 1,
        averageProcessingTime: (prev.averageProcessingTime * prev.completedTasks + duration) / (prev.completedTasks + 1)
      }))

      setTaskHistory(prev => [...prev.slice(-9), {
        id: `tech_${Date.now()}`,
        type: 'TECHNICAL_INDICATORS',
        duration,
        success: true,
        timestamp: Date.now()
      }])

    } catch (error) {
      setStats(prev => ({
        ...prev,
        totalTasks: prev.totalTasks + 1,
        failedTasks: prev.failedTasks + 1
      }))
    }
  }

  const resetStats = () => {
    setStats({
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageProcessingTime: 0,
      activeWorkers: 0,
      pendingTasks: 0
    })
    setTaskHistory([])
  }

  if (!enabled || !isVisible) {
    return enabled ? (
      <button
        onClick={() => setIsVisible(true)}
        className={`fixed ${getPositionClasses(position)} z-50 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700`}
        title="Show Worker Manager"
      >
        ⚡
      </button>
    ) : null
  }

  return (
    <div className={`fixed ${getPositionClasses(position)} z-50 bg-black bg-opacity-90 text-white p-4 rounded-lg shadow-xl`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">Worker Manager</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-300 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="space-y-2 text-xs">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-gray-400">Total Tasks:</div>
            <div className="font-mono">{stats.totalTasks}</div>
          </div>
          <div>
            <div className="text-gray-400">Success Rate:</div>
            <div className="font-mono">
              {stats.totalTasks > 0 
                ? `${((stats.completedTasks / stats.totalTasks) * 100).toFixed(1)}%`
                : '0%'
              }
            </div>
          </div>
          <div>
            <div className="text-gray-400">Avg Time:</div>
            <div className="font-mono">{stats.averageProcessingTime.toFixed(1)}ms</div>
          </div>
          <div>
            <div className="text-gray-400">Pending:</div>
            <div className="font-mono text-yellow-400">{stats.pendingTasks}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="border-t border-gray-600 pt-2 space-y-1">
          <button
            onClick={testWorkerPerformance}
            className="w-full bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
          >
            Test Bulk Processing
          </button>
          <button
            onClick={testTechnicalIndicators}
            className="w-full bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
          >
            Test Technical Indicators
          </button>
          <button
            onClick={resetStats}
            className="w-full bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-xs"
          >
            Reset Stats
          </button>
        </div>

        {/* Recent Tasks */}
        {taskHistory.length > 0 && (
          <div className="border-t border-gray-600 pt-2">
            <div className="text-gray-400 mb-1">Recent Tasks:</div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {taskHistory.slice(-5).map((task, index) => (
                <div key={task.id} className="flex justify-between items-center">
                  <span className={`text-xs ${task.success ? 'text-green-400' : 'text-red-400'}`}>
                    {task.type}
                  </span>
                  <span className="text-xs text-gray-300">
                    {task.duration.toFixed(1)}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

function getPositionClasses(position: string): string {
  switch (position) {
    case 'top-left': return 'top-4 left-4'
    case 'top-right': return 'top-4 right-4'
    case 'bottom-left': return 'bottom-4 left-4'
    case 'bottom-right': return 'bottom-4 right-4'
    default: return 'bottom-4 right-4'
  }
}

export default WorkerManager