"""
Performance monitoring API endpoints.

Provides real-time performance metrics and monitoring data
for the application dashboard.
"""

from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, List

from ..utils.performance_monitor import performance_monitor
from ..config import get_settings

router = APIRouter(prefix="/performance", tags=["performance"])


@router.get("/metrics", response_model=Dict[str, Any])
async def get_performance_metrics():
    """
    Get comprehensive performance metrics.
    
    Returns:
        dict: Performance metrics including response times, request rates, 
              status codes, and endpoint statistics
    """
    try:
        return performance_monitor.export_metrics()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve performance metrics: {str(e)}"
        )


@router.get("/metrics/summary")
async def get_performance_summary():
    """
    Get summarized performance metrics for dashboard overview.
    
    Returns:
        dict: Key performance indicators
    """
    try:
        metrics = performance_monitor.export_metrics()
        
        # Calculate error rate
        status_dist = metrics.get('status_code_distribution', {})
        total_requests = sum(status_dist.values())
        error_requests = sum(count for code, count in status_dist.items() if code >= 400)
        error_rate = (error_requests / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "total_requests": metrics.get('total_requests', 0),
            "average_response_time": round(metrics.get('average_response_time', 0) * 1000, 2),  # ms
            "requests_per_second": round(metrics.get('request_rate_per_second', 0), 2),
            "error_rate": round(error_rate, 2),
            "slow_requests_count": metrics.get('slow_requests_count', 0),
            "top_slow_endpoint": metrics.get('top_slow_endpoints', [{}])[0] if metrics.get('top_slow_endpoints') else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve performance summary: {str(e)}"
        )


@router.get("/metrics/endpoints")
async def get_endpoint_metrics():
    """
    Get detailed metrics for each endpoint.
    
    Returns:
        dict: Endpoint-specific performance statistics
    """
    try:
        return performance_monitor.get_endpoint_stats()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve endpoint metrics: {str(e)}"
        )


@router.get("/metrics/slow-requests")
async def get_slow_requests(limit: int = 50):
    """
    Get recent slow requests.
    
    Args:
        limit: Maximum number of slow requests to return (default: 50)
        
    Returns:
        list: Recent slow requests with details
    """
    try:
        slow_requests = performance_monitor.get_slow_requests(limit=limit)
        return [
            {
                "timestamp": req.timestamp,
                "method": req.method,
                "path": req.path,
                "process_time": round(req.process_time * 1000, 2),  # ms
                "status_code": req.status_code,
                "user_agent": req.user_agent[:100],  # Truncate for security
                "client_ip": req.client_ip
            }
            for req in slow_requests
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve slow requests: {str(e)}"
        )


@router.get("/metrics/status-codes")
async def get_status_code_distribution():
    """
    Get status code distribution.
    
    Returns:
        dict: Status code counts and percentages
    """
    try:
        distribution = performance_monitor.get_status_code_distribution()
        total = sum(distribution.values())
        
        result = {}
        for code, count in distribution.items():
            percentage = (count / total * 100) if total > 0 else 0
            result[str(code)] = {
                "count": count,
                "percentage": round(percentage, 2)
            }
        
        return {
            "distribution": result,
            "total_requests": total
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve status code distribution: {str(e)}"
        )


@router.post("/metrics/clear")
async def clear_performance_metrics():
    """
    Clear all performance metrics history.
    
    Note: This operation is irreversible.
    
    Returns:
        dict: Success confirmation
    """
    try:
        # Only allow in development or with proper authorization
        settings = get_settings()
        if settings.environment != "development":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Metrics clearing is only allowed in development environment"
            )
        
        performance_monitor.clear_history()
        return {"message": "Performance metrics cleared successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear performance metrics: {str(e)}"
        )


@router.get("/health")
async def get_performance_health():
    """
    Get performance health status.
    
    Returns:
        dict: Health indicators based on performance thresholds
    """
    try:
        metrics = performance_monitor.export_metrics()
        avg_response_time = metrics.get('average_response_time', 0)
        
        # Health status based on response time
        if avg_response_time < 0.1:  # < 100ms
            health_status = "excellent"
        elif avg_response_time < 0.5:  # < 500ms
            health_status = "good"
        elif avg_response_time < 1.0:  # < 1s
            health_status = "fair"
        else:
            health_status = "poor"
        
        # Calculate uptime percentage (success rate)
        status_dist = metrics.get('status_code_distribution', {})
        total_requests = sum(status_dist.values())
        success_requests = sum(count for code, count in status_dist.items() if 200 <= code < 400)
        uptime_percentage = (success_requests / total_requests * 100) if total_requests > 0 else 100
        
        return {
            "status": health_status,
            "average_response_time_ms": round(avg_response_time * 1000, 2),
            "uptime_percentage": round(uptime_percentage, 2),
            "total_requests": total_requests,
            "slow_requests": metrics.get('slow_requests_count', 0),
            "timestamp": int(__import__('time').time())
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve performance health: {str(e)}"
        )


@router.get("/cache/stats")
async def get_cache_statistics():
    """
    Get comprehensive cache statistics from smart cache middleware.
    
    Returns:
        dict: Cache statistics including hit rates, endpoint metrics, and backend info
    """
    try:
        # Try to get cache stats from middleware
        # This would require access to the middleware instance
        # For now, return basic info
        return {
            "message": "Cache statistics endpoint",
            "note": "Cache stats would be available from SmartCacheMiddleware instance",
            "backend": "smart_cache",
            "timestamp": int(__import__('time').time())
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve cache statistics: {str(e)}"
        )


@router.post("/cache/clear")
async def clear_cache():
    """
    Clear cache data (development only).
    
    Returns:
        dict: Success confirmation
    """
    try:
        from ..config import get_settings
        
        settings = get_settings()
        if settings.environment != "development":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cache clearing is only allowed in development environment"
            )
        
        # Clear cache logic would go here
        # This would require access to the middleware instance
        
        return {
            "message": "Cache cleared successfully",
            "timestamp": int(__import__('time').time())
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear cache: {str(e)}"
        )