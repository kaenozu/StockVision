/**
 * Render Profiler Component
 * 
 * Development tool for monitoring component rendering performance.
 * Provides real-time metrics and optimization insights.
 */

import React, { Profiler, ProfilerOnRenderCallback, useState, useEffect, memo } from 'react'

interface RenderMetrics {
  id: string
  phase: 'mount' | 'update'
  actualDuration: number
  baseDuration: number
  startTime: number
  commitTime: number
  interactions: Set<any>
}

interface RenderProfilerProps {
  id: string
  children: React.ReactNode
  enabled?: boolean
  logToConsole?: boolean
  showOverlay?: boolean
  onRender?: (metrics: RenderMetrics) => void
}

interface ProfilerStats {
  totalRenders: number
  totalDuration: number
  averageDuration: number
  maxDuration: number
  minDuration: number
  mountCount: number
  updateCount: number
  lastRender: RenderMetrics | null
}

export const RenderProfiler = memo<RenderProfilerProps>(function RenderProfiler({
  id,
  children,
  enabled = process.env.NODE_ENV === 'development',
  logToConsole = false,
  showOverlay = false,
  onRender
}) {
  const [stats, setStats] = useState<ProfilerStats>({
    totalRenders: 0,
    totalDuration: 0,
    averageDuration: 0,
    maxDuration: 0,
    minDuration: Infinity,
    mountCount: 0,
    updateCount: 0,
    lastRender: null
  })

  const handleRender: ProfilerOnRenderCallback = (
    profileId,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
    interactions
  ) => {
    if (!enabled) return

    const metrics: RenderMetrics = {
      id: profileId,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions
    }

    // Update statistics
    setStats(prevStats => {
      const newStats: ProfilerStats = {
        ...prevStats,
        totalRenders: prevStats.totalRenders + 1,
        totalDuration: prevStats.totalDuration + actualDuration,
        maxDuration: Math.max(prevStats.maxDuration, actualDuration),
        minDuration: Math.min(prevStats.minDuration, actualDuration),
        mountCount: phase === 'mount' ? prevStats.mountCount + 1 : prevStats.mountCount,
        updateCount: phase === 'update' ? prevStats.updateCount + 1 : prevStats.updateCount,
        lastRender: metrics
      }

      newStats.averageDuration = newStats.totalDuration / newStats.totalRenders

      return newStats
    })

    // Log to console if enabled
    if (logToConsole) {
      const color = actualDuration > 16 ? 'color: red' : actualDuration > 4 ? 'color: orange' : 'color: green'
      console.log(
        `%c[Profiler] ${profileId} (${phase}) - ${actualDuration.toFixed(2)}ms`,
        color,
        {
          actualDuration: `${actualDuration.toFixed(2)}ms`,
          baseDuration: `${baseDuration.toFixed(2)}ms`,
          phase,
          interactions: Array.from(interactions)
        }
      )
    }

    // Call custom onRender callback
    onRender?.(metrics)
  }

  if (!enabled) {
    return <>{children}</>
  }

  return (
    <>
      <Profiler id={id} onRender={handleRender}>
        {children}
      </Profiler>
      {showOverlay && <ProfilerOverlay id={id} stats={stats} />}
    </>
  )
})

// Overlay component to display render metrics
const ProfilerOverlay = memo<{
  id: string
  stats: ProfilerStats
}>(function ProfilerOverlay({ id, stats }) {
  const [isVisible, setIsVisible] = useState(true)

  // Auto-hide overlay after some time of no activity
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 5000)

    return () => clearTimeout(timer)
  }, [stats.lastRender])

  if (!isVisible || !stats.lastRender) return null

  const getPerformanceColor = (duration: number) => {
    if (duration > 16) return 'text-red-500'
    if (duration > 4) return 'text-yellow-500'
    return 'text-green-500'
  }

  return (
    <div 
      className="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded-lg text-xs font-mono z-50"
      style={{ maxWidth: '300px' }}
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold">{id} Performance</h4>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-300 hover:text-white"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1">
        <div>
          <span className="text-gray-300">Last Render:</span>{' '}
          <span className={getPerformanceColor(stats.lastRender.actualDuration)}>
            {stats.lastRender.actualDuration.toFixed(2)}ms
          </span>
          <span className="text-gray-400 ml-1">({stats.lastRender.phase})</span>
        </div>
        
        <div>
          <span className="text-gray-300">Total Renders:</span>{' '}
          <span className="text-blue-300">{stats.totalRenders}</span>
          <span className="text-gray-400 ml-2">
            (M: {stats.mountCount}, U: {stats.updateCount})
          </span>
        </div>
        
        <div>
          <span className="text-gray-300">Average:</span>{' '}
          <span className={getPerformanceColor(stats.averageDuration)}>
            {stats.averageDuration.toFixed(2)}ms
          </span>
        </div>
        
        <div>
          <span className="text-gray-300">Min/Max:</span>{' '}
          <span className="text-green-400">{stats.minDuration.toFixed(2)}ms</span>
          <span className="text-gray-400 mx-1">/</span>
          <span className="text-red-400">{stats.maxDuration.toFixed(2)}ms</span>
        </div>
        
        <div className="pt-1 border-t border-gray-600">
          <div className="text-xs text-gray-400">
            Click to hide • Auto-hide in 5s
          </div>
        </div>
      </div>
    </div>
  )
})

/**
 * Higher-order component to wrap components with profiling
 */
export function withRenderProfiler<P extends object>(
  Component: React.ComponentType<P>,
  profileId: string,
  options?: Omit<RenderProfilerProps, 'id' | 'children'>
) {
  const ProfiledComponent = (props: P) => (
    <RenderProfiler id={profileId} {...options}>
      <Component {...props} />
    </RenderProfiler>
  )

  ProfiledComponent.displayName = `withRenderProfiler(${Component.displayName || Component.name})`
  
  return ProfiledComponent
}

/**
 * Hook for accessing profiler statistics
 */
export function useProfilerStats(componentId: string) {
  const [stats, setStats] = useState<ProfilerStats | null>(null)

  const updateStats = (metrics: RenderMetrics) => {
    if (metrics.id !== componentId) return

    setStats(prevStats => {
      if (!prevStats) {
        return {
          totalRenders: 1,
          totalDuration: metrics.actualDuration,
          averageDuration: metrics.actualDuration,
          maxDuration: metrics.actualDuration,
          minDuration: metrics.actualDuration,
          mountCount: metrics.phase === 'mount' ? 1 : 0,
          updateCount: metrics.phase === 'update' ? 1 : 0,
          lastRender: metrics
        }
      }

      const newStats: ProfilerStats = {
        ...prevStats,
        totalRenders: prevStats.totalRenders + 1,
        totalDuration: prevStats.totalDuration + metrics.actualDuration,
        maxDuration: Math.max(prevStats.maxDuration, metrics.actualDuration),
        minDuration: Math.min(prevStats.minDuration, metrics.actualDuration),
        mountCount: metrics.phase === 'mount' ? prevStats.mountCount + 1 : prevStats.mountCount,
        updateCount: metrics.phase === 'update' ? prevStats.updateCount + 1 : prevStats.updateCount,
        lastRender: metrics
      }

      newStats.averageDuration = newStats.totalDuration / newStats.totalRenders
      return newStats
    })
  }

  return { stats, updateStats }
}

export default RenderProfiler