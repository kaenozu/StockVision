"""
パフォーマンスメトリクスAPIエンドポイント

Provides endpoints to retrieve performance metrics collected by the application.
"""
from fastapi import APIRouter, Query, Depends
from typing import Dict, List, Optional

from ..utils.performance_monitor import (
    get_performance_metrics, 
    get_slow_requests, 
    get_endpoint_statistics,
    get_top_slow_endpoints,
    clear_performance_metrics
)

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("/summary")
async def get_metrics_summary():
    """
    パフォーマンスメトリクスのサマリーを取得する
    
    Returns:
        Dict: パフォーマンスメトリクスのサマリー
    """
    return get_performance_metrics()


@router.get("/slow-requests")
async def get_slow_requests_endpoint(
    limit: int = Query(50, ge=1, le=1000, description="取得するスローリクエストの数")
):
    """
    最近のスローリクエストを取得する
    
    Args:
        limit: 取得するスローリクエストの数 (1-1000, デフォルト: 50)
        
    Returns:
        List[Dict]: スローリクエストのリスト
    """
    return get_slow_requests(limit)


@router.get("/endpoints")
async def get_endpoint_stats():
    """
    エンドポイントごとの統計情報を取得する
    
    Returns:
        Dict: エンドポイントごとの統計情報
    """
    return get_endpoint_statistics()


@router.get("/top-slow-endpoints")
async def get_top_slow_endpoints_endpoint(
    limit: int = Query(10, ge=1, le=100, description="取得するエンドポイントの数")
):
    """
    最も遅いエンドポイントのトップリストを取得する
    
    Args:
        limit: 取得するエンドポイントの数 (1-100, デフォルト: 10)
        
    Returns:
        List[Dict]: 最も遅いエンドポイントのリスト
    """
    return get_top_slow_endpoints(limit)


@router.post("/clear")
async def clear_metrics():
    """
    メトリクス履歴をクリアする
    
    Returns:
        Dict: クリア成功メッセージ
    """
    clear_performance_metrics()
    return {"message": "Metrics history cleared"}