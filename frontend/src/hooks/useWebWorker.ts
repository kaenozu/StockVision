/**
 * Web Worker Hook
 * 
 * Custom hook for managing Web Workers with TypeScript support,
 * automatic cleanup, and error handling.
 */

import { useRef, useCallback, useEffect } from 'react'

interface WorkerMessage<T = any> {
  id: string
  type: string
  data: T
  options?: any
}

interface WorkerResponse<T = any> {
  id: string
  success: boolean
  result?: T
  error?: string
  processingTime: number
}

interface UseWebWorkerOptions {
  terminateOnUnmount?: boolean
  maxConcurrentTasks?: number
  timeout?: number
}

export function useWebWorker<TRequest = any, TResponse = any>(
  workerPath: string,
  options: UseWebWorkerOptions = {}
) {
  const {
    terminateOnUnmount = true,
    maxConcurrentTasks = 10,
    timeout = 30000 // 30 seconds
  } = options

  const workerRef = useRef<Worker | null>(null)
  const pendingTasksRef = useRef<Map<string, {
    resolve: (value: TResponse) => void
    reject: (reason: any) => void
    timeoutId: NodeJS.Timeout
  }>>(new Map())

  // Initialize worker
  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL(workerPath, import.meta.url), {
        type: 'module'
      })

      workerRef.current.onmessage = (event: MessageEvent<WorkerResponse<TResponse>>) => {
        const { id, success, result, error } = event.data
        const pendingTask = pendingTasksRef.current.get(id)

        if (pendingTask) {
          clearTimeout(pendingTask.timeoutId)
          pendingTasksRef.current.delete(id)

          if (success && result !== undefined) {
            pendingTask.resolve(result)
          } else {
            pendingTask.reject(new Error(error || 'Worker task failed'))
          }
        }
      }

      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error)
        // Reject all pending tasks
        pendingTasksRef.current.forEach(({ reject, timeoutId }) => {
          clearTimeout(timeoutId)
          reject(new Error('Worker error'))
        })
        pendingTasksRef.current.clear()
      }
    }

    return workerRef.current
  }, [workerPath])

  // Execute task in worker
  const executeTask = useCallback(<T extends TResponse>(
    type: string,
    data: TRequest,
    taskOptions?: any
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      // Check if we've exceeded max concurrent tasks
      if (pendingTasksRef.current.size >= maxConcurrentTasks) {
        reject(new Error('Maximum concurrent tasks exceeded'))
        return
      }

      const worker = getWorker()
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Set up timeout
      const timeoutId = setTimeout(() => {
        pendingTasksRef.current.delete(taskId)
        reject(new Error(`Task timeout after ${timeout}ms`))
      }, timeout)

      // Store pending task
      pendingTasksRef.current.set(taskId, {
        resolve: resolve as (value: TResponse) => void,
        reject,
        timeoutId
      })

      // Send task to worker
      const message: WorkerMessage<TRequest> = {
        id: taskId,
        type,
        data,
        options: taskOptions
      }

      worker.postMessage(message)
    })
  }, [getWorker, maxConcurrentTasks, timeout])

  // Terminate worker
  const terminate = useCallback(() => {
    if (workerRef.current) {
      // Clear all pending tasks
      pendingTasksRef.current.forEach(({ reject, timeoutId }) => {
        clearTimeout(timeoutId)
        reject(new Error('Worker terminated'))
      })
      pendingTasksRef.current.clear()

      workerRef.current.terminate()
      workerRef.current = null
    }
  }, [])

  // Get worker status
  const getStatus = useCallback(() => {
    return {
      isActive: workerRef.current !== null,
      pendingTasks: pendingTasksRef.current.size,
      maxConcurrentTasks
    }
  }, [maxConcurrentTasks])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (terminateOnUnmount) {
        terminate()
      }
    }
  }, [terminate, terminateOnUnmount])

  return {
    executeTask,
    terminate,
    getStatus,
    isActive: workerRef.current !== null,
    pendingTaskCount: pendingTasksRef.current.size
  }
}

/**
 * Hook specifically for stock data processing worker
 */
export function useStockDataWorker() {
  const worker = useWebWorker<any, any>('./workers/stockDataProcessor.worker.ts', {
    maxConcurrentTasks: 5,
    timeout: 15000 // 15 seconds for data processing
  })

  const calculateTechnicalIndicators = useCallback(
    (historicalData: any[], indicators: string[]) => {
      return worker.executeTask('CALCULATE_TECHNICAL_INDICATORS', historicalData, { indicators })
    },
    [worker]
  )

  const processBulkData = useCallback(
    (stocks: any[], options: any = {}) => {
      return worker.executeTask('PROCESS_BULK_DATA', stocks, options)
    },
    [worker]
  )

  const filterAndSortData = useCallback(
    (stocks: any[], options: any = {}) => {
      return worker.executeTask('FILTER_SORT_DATA', stocks, options)
    },
    [worker]
  )

  const aggregatePortfolio = useCallback(
    (stocks: any[], holdings: { [stockCode: string]: number }) => {
      return worker.executeTask('AGGREGATE_PORTFOLIO', stocks, { holdings })
    },
    [worker]
  )

  return {
    ...worker,
    calculateTechnicalIndicators,
    processBulkData,
    filterAndSortData,
    aggregatePortfolio
  }
}

export default useWebWorker