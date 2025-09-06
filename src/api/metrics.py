"""
パフォーマンスメトリクスAPIエンドポイント
"""
from fastapi import APIRouter, Query
from typing import Dict, List, Optional

from ..utils.performance_monitor import performance_monitor

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("/summary")
async def get_metrics_summary():
    """
    パフォーマンスメトリクスのサマリーを取得する
    """
    return performance_monitor.export_metrics()


@router.get("/slow-requests")
async def get_slow_requests(
    limit: int = Query(50, ge=1, le=1000, description="取得するスローリクエストの数")
):
    """
    最近のスローリクエストを取得する
    """
    slow_requests = performance_monitor.get_slow_requests(limit)
    return [
        {
            "timestamp": req.timestamp,
            "method": req.method,
            "path": req.path,
            "process_time": req.process_time,
            "status_code": req.status_code,
            "user_agent": req.user_agent,
            "client_ip": req.client_ip,
        }
        for req in slow_requests
    ]


@router.get("/endpoints")
async def get_endpoint_stats():
    """
    エンドポイントごとの統計情報を取得する
    """
    return performance_monitor.get_endpoint_stats()


@router.get("/top-slow-endpoints")
async def get_top_slow_endpoints(
    limit: int = Query(10, ge=1, le=100, description="取得するエンドポイントの数")
):
    """
    最も遅いエンドポイントのトップリストを取得する
    """
    top_slow = performance_monitor.get_top_slow_endpoints(limit)
    return [
        {"endpoint": endpoint, "average_time": avg_time}
        for endpoint, avg_time in top_slow
    ]


@router.post("/clear")
async def clear_metrics():
    """
    メトリクス履歴をクリアする
    """
    performance_monitor.clear_history()
    return {"message": "Metrics history cleared"}