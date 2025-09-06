"""
パフォーマンスメトリクスAPIエンドポイント
"""
from fastapi import APIRouter, Query
from typing import Dict, List, Optional

from ..utils.performance_monitor import performance_monitor

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("/summary",
            summary="パフォーマンスメトリクスのサマリー取得",
            responses={
                200: {
                    "description": "パフォーマンスメトリクスのサマリー",
                    "content": {
                        "application/json": {
                            "example": {
                                "total_requests": 12345,
                                "average_response_time": 0.123,
                                "error_rate": 0.005,
                                "slow_requests_count": 45,
                                "uptime": 86400
                            }
                        }
                    }
                }
            })
async def get_metrics_summary():
    """
    パフォーマンスメトリクスのサマリーを取得する
    
    Examples:
        - リクエスト: `GET /metrics/summary`
    """
    return performance_monitor.export_metrics()


@router.get("/slow-requests",
            summary="最近のスローリクエスト取得",
            responses={
                200: {
                    "description": "最近のスローリクエスト",
                    "content": {
                        "application/json": {
                            "example": [
                                {
                                    "timestamp": "2023-10-27T10:00:00Z",
                                    "method": "GET",
                                    "path": "/stocks/7203/history",
                                    "process_time": 2.5,
                                    "status_code": 200,
                                    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                                    "client_ip": "192.168.1.100"
                                },
                                {
                                    "timestamp": "2023-10-27T09:55:00Z",
                                    "method": "POST",
                                    "path": "/watchlist",
                                    "process_time": 1.8,
                                    "status_code": 201,
                                    "user_agent": "PostmanRuntime/7.29.2",
                                    "client_ip": "192.168.1.101"
                                }
                            ]
                        }
                    }
                }
            })
async def get_slow_requests(
    limit: int = Query(50, ge=1, le=1000, description="取得するスローリクエストの数")
):
    """
    最近のスローリクエストを取得する
    
    Args:
        limit: 取得するスローリクエストの数 (1-1000)
    
    Examples:
        - リクエスト: `GET /metrics/slow-requests`
        - リクエスト (10件): `GET /metrics/slow-requests?limit=10`
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


@router.get("/endpoints",
            summary="エンドポイントごとの統計情報取得",
            responses={
                200: {
                    "description": "エンドポイントごとの統計情報",
                    "content": {
                        "application/json": {
                            "example": {
                                "/stocks/{stock_code}": {
                                    "count": 1234,
                                    "average_time": 0.05,
                                    "min_time": 0.02,
                                    "max_time": 0.5
                                },
                                "/watchlist": {
                                    "count": 567,
                                    "average_time": 0.08,
                                    "min_time": 0.03,
                                    "max_time": 1.2
                                }
                            }
                        }
                    }
                }
            })
async def get_endpoint_stats():
    """
    エンドポイントごとの統計情報を取得する
    
    Examples:
        - リクエスト: `GET /metrics/endpoints`
    """
    return performance_monitor.get_endpoint_stats()


@router.get("/top-slow-endpoints",
            summary="最も遅いエンドポイントのトップリスト取得",
            responses={
                200: {
                    "description": "最も遅いエンドポイントのトップリスト",
                    "content": {
                        "application/json": {
                            "example": [
                                {
                                    "endpoint": "/stocks/{stock_code}/history",
                                    "average_time": 0.5
                                },
                                {
                                    "endpoint": "/watchlist",
                                    "average_time": 0.3
                                }
                            ]
                        }
                    }
                }
            })
async def get_top_slow_endpoints(
    limit: int = Query(10, ge=1, le=100, description="取得するエンドポイントの数")
):
    """
    最も遅いエンドポイントのトップリストを取得する
    
    Args:
        limit: 取得するエンドポイントの数 (1-100)
    
    Examples:
        - リクエスト: `GET /metrics/top-slow-endpoints`
        - リクエスト (上位5件): `GET /metrics/top-slow-endpoints?limit=5`
    """
    top_slow = performance_monitor.get_top_slow_endpoints(limit)
    return [
        {"endpoint": endpoint, "average_time": avg_time}
        for endpoint, avg_time in top_slow
    ]


@router.post("/clear",
             summary="メトリクス履歴のクリア",
             responses={
                 200: {
                     "description": "メトリクス履歴のクリア成功",
                     "content": {
                         "application/json": {
                             "example": {
                                 "message": "Metrics history cleared"
                             }
                         }
                     }
                 }
             })
async def clear_metrics():
    """
    メトリクス履歴をクリアする
    
    Examples:
        - リクエスト: `POST /metrics/clear`
    """
    performance_monitor.clear_history()
    return {"message": "Metrics history cleared"}