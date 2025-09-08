"""
リアルタイムパフォーマンス監視ダッシュボード

アプリケーションのパフォーマンスを監視し、アラートを生成する
高度な監視機能とメトリクス分析を提供
"""
import time
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
from enum import Enum
import statistics
from concurrent.futures import ThreadPoolExecutor
import psutil

from ..config import get_settings


class AlertSeverity(Enum):
    """アラートの重要度"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class MetricType(Enum):
    """メトリクスの種類"""
    RESPONSE_TIME = "response_time"
    ERROR_RATE = "error_rate" 
    REQUEST_RATE = "request_rate"
    MEMORY_USAGE = "memory_usage"
    CPU_USAGE = "cpu_usage"
    DATABASE_CONNECTIONS = "database_connections"
    CACHE_HIT_RATE = "cache_hit_rate"


@dataclass
class PerformanceAlert:
    """パフォーマンスアラート"""
    id: str
    timestamp: datetime
    severity: AlertSeverity
    metric_type: MetricType
    message: str
    value: float
    threshold: float
    endpoint: Optional[str] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "severity": self.severity.value,
            "metric_type": self.metric_type.value,
            "message": self.message,
            "value": self.value,
            "threshold": self.threshold,
            "endpoint": self.endpoint,
            "resolved": self.resolved,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None
        }


@dataclass
class SystemMetrics:
    """システムメトリクス"""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_available_mb: float
    disk_usage_percent: float
    disk_free_gb: float
    active_connections: int
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "cpu_percent": self.cpu_percent,
            "memory_percent": self.memory_percent,
            "memory_used_mb": self.memory_used_mb,
            "memory_available_mb": self.memory_available_mb,
            "disk_usage_percent": self.disk_usage_percent,
            "disk_free_gb": self.disk_free_gb,
            "active_connections": self.active_connections
        }


@dataclass
class PerformanceThresholds:
    """パフォーマンス閾値設定"""
    response_time_warning: float = 1.0  # 1秒
    response_time_error: float = 3.0    # 3秒
    response_time_critical: float = 5.0  # 5秒
    
    error_rate_warning: float = 0.05    # 5%
    error_rate_error: float = 0.10      # 10%
    error_rate_critical: float = 0.20   # 20%
    
    memory_usage_warning: float = 70.0  # 70%
    memory_usage_error: float = 85.0    # 85%
    memory_usage_critical: float = 95.0 # 95%
    
    cpu_usage_warning: float = 70.0     # 70%
    cpu_usage_error: float = 85.0       # 85%
    cpu_usage_critical: float = 95.0    # 95%
    
    cache_hit_rate_warning: float = 80.0 # 80%未満で警告


class PerformanceDashboard:
    """リアルタイムパフォーマンス監視ダッシュボード"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.settings = get_settings()
        self.thresholds = PerformanceThresholds()
        
        # アラート管理
        self.alerts: Dict[str, PerformanceAlert] = {}
        self.alert_history: deque = deque(maxlen=1000)
        self.active_alerts: Set[str] = set()
        
        # メトリクス履歴（リングバッファー）
        self.metrics_history: Dict[MetricType, deque] = {
            metric_type: deque(maxlen=1440)  # 24時間分（1分間隔）
            for metric_type in MetricType
        }
        
        # システムメトリクス履歴
        self.system_metrics_history: deque = deque(maxlen=1440)
        
        # エンドポイント固有のメトリクス
        self.endpoint_metrics: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            "response_times": deque(maxlen=100),
            "error_count": 0,
            "request_count": 0,
            "last_error_time": None
        })
        
        # 監視状態
        self.monitoring_active = False
        self.monitoring_task = None
        self.executor = ThreadPoolExecutor(max_workers=2)
        
        # パフォーマンス統計
        self.performance_stats = {
            "total_requests": 0,
            "total_errors": 0,
            "average_response_time": 0.0,
            "p95_response_time": 0.0,
            "p99_response_time": 0.0,
            "uptime_start": datetime.now()
        }
        
    async def start_monitoring(self):
        """監視を開始"""
        if self.monitoring_active:
            return
            
        self.monitoring_active = True
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        self.logger.info("パフォーマンス監視を開始しました")
        
    async def stop_monitoring(self):
        """監視を停止"""
        if not self.monitoring_active:
            return
            
        self.monitoring_active = False
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
                
        self.executor.shutdown(wait=True)
        self.logger.info("パフォーマンス監視を停止しました")
        
    async def _monitoring_loop(self):
        """メイン監視ループ"""
        try:
            while self.monitoring_active:
                try:
                    # システムメトリクスを収集
                    await self._collect_system_metrics()
                    
                    # アラートをチェック
                    await self._check_alerts()
                    
                    # 古いメトリクスをクリーンアップ
                    await self._cleanup_old_metrics()
                    
                    # 60秒待機
                    await asyncio.sleep(60)
                    
                except Exception as e:
                    self.logger.error(f"監視ループでエラーが発生: {e}")
                    await asyncio.sleep(60)  # エラー時も継続
                    
        except asyncio.CancelledError:
            self.logger.info("監視ループが停止されました")
            
    async def _collect_system_metrics(self):
        """システムメトリクスを収集"""
        try:
            # 非同期でシステムメトリクスを収集
            loop = asyncio.get_event_loop()
            metrics = await loop.run_in_executor(self.executor, self._get_system_info)
            
            # メトリクス履歴に追加
            self.system_metrics_history.append(metrics)
            
            # 個別メトリクスも記録
            now = datetime.now()
            self.metrics_history[MetricType.CPU_USAGE].append((now, metrics.cpu_percent))
            self.metrics_history[MetricType.MEMORY_USAGE].append((now, metrics.memory_percent))
            
        except Exception as e:
            self.logger.error(f"システムメトリクス収集エラー: {e}")
            
    def _get_system_info(self) -> SystemMetrics:
        """システム情報を取得"""
        # CPU使用率
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # メモリ情報
        memory = psutil.virtual_memory()
        
        # ディスク情報
        disk = psutil.disk_usage('/')
        
        # ネットワーク接続数
        try:
            connections = len(psutil.net_connections())
        except (psutil.AccessDenied, psutil.NoSuchProcess):
            connections = 0
            
        return SystemMetrics(
            timestamp=datetime.now(),
            cpu_percent=cpu_percent,
            memory_percent=memory.percent,
            memory_used_mb=memory.used / (1024 * 1024),
            memory_available_mb=memory.available / (1024 * 1024),
            disk_usage_percent=disk.percent,
            disk_free_gb=disk.free / (1024 * 1024 * 1024),
            active_connections=connections
        )
        
    async def record_request_metrics(self, endpoint: str, response_time: float, status_code: int):
        """リクエストメトリクスを記録"""
        now = datetime.now()
        
        # 統計更新
        self.performance_stats["total_requests"] += 1
        if status_code >= 400:
            self.performance_stats["total_errors"] += 1
            
        # エンドポイント固有のメトリクス更新
        endpoint_metrics = self.endpoint_metrics[endpoint]
        endpoint_metrics["response_times"].append((now, response_time))
        endpoint_metrics["request_count"] += 1
        
        if status_code >= 400:
            endpoint_metrics["error_count"] += 1
            endpoint_metrics["last_error_time"] = now
            
        # グローバルメトリクス履歴更新
        self.metrics_history[MetricType.RESPONSE_TIME].append((now, response_time))
        
        # レスポンス時間の統計計算
        await self._update_response_time_stats()
        
        # リクエスト率計算
        await self._update_request_rate()
        
    async def _update_response_time_stats(self):
        """レスポンス時間統計を更新"""
        recent_times = []
        cutoff_time = datetime.now() - timedelta(minutes=5)
        
        for timestamp, response_time in self.metrics_history[MetricType.RESPONSE_TIME]:
            if timestamp > cutoff_time:
                recent_times.append(response_time)
                
        if recent_times:
            self.performance_stats["average_response_time"] = statistics.mean(recent_times)
            if len(recent_times) > 1:
                recent_times.sort()
                self.performance_stats["p95_response_time"] = recent_times[int(len(recent_times) * 0.95)]
                self.performance_stats["p99_response_time"] = recent_times[int(len(recent_times) * 0.99)]
                
    async def _update_request_rate(self):
        """リクエスト率を更新"""
        recent_requests = 0
        cutoff_time = datetime.now() - timedelta(minutes=1)
        
        for timestamp, _ in self.metrics_history[MetricType.RESPONSE_TIME]:
            if timestamp > cutoff_time:
                recent_requests += 1
                
        now = datetime.now()
        self.metrics_history[MetricType.REQUEST_RATE].append((now, recent_requests))
        
    async def _check_alerts(self):
        """アラートをチェック"""
        try:
            # システムメトリクスベースのアラート
            await self._check_system_alerts()
            
            # エンドポイントベースのアラート
            await self._check_endpoint_alerts()
            
            # エラー率アラート
            await self._check_error_rate_alerts()
            
        except Exception as e:
            self.logger.error(f"アラートチェックエラー: {e}")
            
    async def _check_system_alerts(self):
        """システムアラートをチェック"""
        if not self.system_metrics_history:
            return
            
        latest_metrics = self.system_metrics_history[-1]
        
        # CPU使用率アラート
        await self._check_threshold_alert(
            "cpu_usage",
            MetricType.CPU_USAGE,
            latest_metrics.cpu_percent,
            self.thresholds.cpu_usage_warning,
            self.thresholds.cpu_usage_error,
            self.thresholds.cpu_usage_critical,
            "CPU使用率"
        )
        
        # メモリ使用率アラート
        await self._check_threshold_alert(
            "memory_usage",
            MetricType.MEMORY_USAGE,
            latest_metrics.memory_percent,
            self.thresholds.memory_usage_warning,
            self.thresholds.memory_usage_error,
            self.thresholds.memory_usage_critical,
            "メモリ使用率"
        )
        
    async def _check_endpoint_alerts(self):
        """エンドポイントアラートをチェック"""
        cutoff_time = datetime.now() - timedelta(minutes=5)
        
        for endpoint, metrics in self.endpoint_metrics.items():
            if not metrics["response_times"]:
                continue
                
            # 最近のレスポンス時間を取得
            recent_times = [
                response_time for timestamp, response_time in metrics["response_times"]
                if timestamp > cutoff_time
            ]
            
            if recent_times:
                avg_response_time = statistics.mean(recent_times)
                
                await self._check_threshold_alert(
                    f"response_time_{endpoint}",
                    MetricType.RESPONSE_TIME,
                    avg_response_time,
                    self.thresholds.response_time_warning,
                    self.thresholds.response_time_error,
                    self.thresholds.response_time_critical,
                    f"レスポンス時間 ({endpoint})",
                    endpoint=endpoint
                )
                
    async def _check_error_rate_alerts(self):
        """エラー率アラートをチェック"""
        cutoff_time = datetime.now() - timedelta(minutes=5)
        
        for endpoint, metrics in self.endpoint_metrics.items():
            total_requests = 0
            error_requests = 0
            
            # 最近のリクエスト数とエラー数を計算
            for timestamp, _ in metrics["response_times"]:
                if timestamp > cutoff_time:
                    total_requests += 1
                    
            if metrics["last_error_time"] and metrics["last_error_time"] > cutoff_time:
                error_requests = metrics["error_count"]
                
            if total_requests > 0:
                error_rate = error_requests / total_requests
                
                await self._check_threshold_alert(
                    f"error_rate_{endpoint}",
                    MetricType.ERROR_RATE,
                    error_rate * 100,  # パーセンテージ
                    self.thresholds.error_rate_warning * 100,
                    self.thresholds.error_rate_error * 100,
                    self.thresholds.error_rate_critical * 100,
                    f"エラー率 ({endpoint})",
                    endpoint=endpoint
                )
                
    async def _check_threshold_alert(
        self,
        alert_id: str,
        metric_type: MetricType,
        current_value: float,
        warning_threshold: float,
        error_threshold: float,
        critical_threshold: float,
        metric_name: str,
        endpoint: Optional[str] = None
    ):
        """閾値ベースのアラートをチェック"""
        severity = None
        threshold = 0.0
        
        if current_value >= critical_threshold:
            severity = AlertSeverity.CRITICAL
            threshold = critical_threshold
        elif current_value >= error_threshold:
            severity = AlertSeverity.ERROR
            threshold = error_threshold
        elif current_value >= warning_threshold:
            severity = AlertSeverity.WARNING
            threshold = warning_threshold
            
        if severity:
            # アラートを生成
            await self._create_alert(
                alert_id,
                severity,
                metric_type,
                f"{metric_name}が閾値を超過: {current_value:.2f} (閾値: {threshold:.2f})",
                current_value,
                threshold,
                endpoint
            )
        elif alert_id in self.active_alerts:
            # アラートを解決
            await self._resolve_alert(alert_id)
            
    async def _create_alert(
        self,
        alert_id: str,
        severity: AlertSeverity,
        metric_type: MetricType,
        message: str,
        value: float,
        threshold: float,
        endpoint: Optional[str] = None
    ):
        """アラートを作成"""
        if alert_id not in self.active_alerts:
            alert = PerformanceAlert(
                id=alert_id,
                timestamp=datetime.now(),
                severity=severity,
                metric_type=metric_type,
                message=message,
                value=value,
                threshold=threshold,
                endpoint=endpoint
            )
            
            self.alerts[alert_id] = alert
            self.alert_history.append(alert)
            self.active_alerts.add(alert_id)
            
            self.logger.warning(f"アラート生成: {message}")
            
    async def _resolve_alert(self, alert_id: str):
        """アラートを解決"""
        if alert_id in self.alerts:
            alert = self.alerts[alert_id]
            alert.resolved = True
            alert.resolved_at = datetime.now()
            
            self.active_alerts.discard(alert_id)
            
            self.logger.info(f"アラート解決: {alert.message}")
            
    async def _cleanup_old_metrics(self):
        """古いメトリクスをクリーンアップ"""
        cutoff_time = datetime.now() - timedelta(hours=24)
        
        # エンドポイントメトリクスのクリーンアップ
        for endpoint, metrics in list(self.endpoint_metrics.items()):
            # 古いレスポンス時間データを削除
            metrics["response_times"] = deque([
                (timestamp, response_time)
                for timestamp, response_time in metrics["response_times"]
                if timestamp > cutoff_time
            ], maxlen=100)
            
            # 空のエンドポイントを削除
            if not metrics["response_times"]:
                del self.endpoint_metrics[endpoint]
                
    def get_dashboard_data(self) -> Dict[str, Any]:
        """ダッシュボード用データを取得"""
        now = datetime.now()
        uptime_seconds = (now - self.performance_stats["uptime_start"]).total_seconds()
        
        # 最新のシステムメトリクス
        latest_system_metrics = None
        if self.system_metrics_history:
            latest_system_metrics = self.system_metrics_history[-1].to_dict()
            
        # アクティブアラート
        active_alerts = [
            alert.to_dict() for alert in self.alerts.values()
            if not alert.resolved
        ]
        
        # 最近のアラート履歴
        recent_alerts = [
            alert.to_dict() for alert in list(self.alert_history)[-10:]
        ]
        
        # エンドポイント統計
        endpoint_stats = {}
        for endpoint, metrics in self.endpoint_metrics.items():
            if metrics["response_times"]:
                recent_times = [rt for _, rt in metrics["response_times"]]
                endpoint_stats[endpoint] = {
                    "request_count": metrics["request_count"],
                    "error_count": metrics["error_count"],
                    "average_response_time": statistics.mean(recent_times),
                    "error_rate": metrics["error_count"] / metrics["request_count"] if metrics["request_count"] > 0 else 0
                }
                
        return {
            "timestamp": now.isoformat(),
            "uptime_seconds": uptime_seconds,
            "system_metrics": latest_system_metrics,
            "performance_stats": self.performance_stats,
            "active_alerts": active_alerts,
            "recent_alerts": recent_alerts,
            "endpoint_stats": endpoint_stats,
            "monitoring_active": self.monitoring_active,
            "total_active_alerts": len(active_alerts)
        }
        
    def get_metrics_history(self, metric_type: MetricType, hours: int = 1) -> List[Dict[str, Any]]:
        """メトリクス履歴を取得"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        history = []
        for timestamp, value in self.metrics_history[metric_type]:
            if timestamp > cutoff_time:
                history.append({
                    "timestamp": timestamp.isoformat(),
                    "value": value
                })
                
        return history
        
    def get_system_metrics_history(self, hours: int = 1) -> List[Dict[str, Any]]:
        """システムメトリクス履歴を取得"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        history = []
        for metrics in self.system_metrics_history:
            if metrics.timestamp > cutoff_time:
                history.append(metrics.to_dict())
                
        return history
        
    def update_thresholds(self, new_thresholds: Dict[str, float]):
        """閾値を更新"""
        for key, value in new_thresholds.items():
            if hasattr(self.thresholds, key):
                setattr(self.thresholds, key, value)
                self.logger.info(f"閾値更新: {key} = {value}")


# グローバルインスタンス
performance_dashboard = PerformanceDashboard()