"""
パフォーマンスモニタリングと分析ユーティリティ
"""

import logging
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from threading import Lock
from typing import Dict, List, Optional, Tuple

from ..constants import PerformanceThresholds


@dataclass
class RequestMetrics:
    """リクエストメトリクスデータクラス"""

    timestamp: float
    method: str
    path: str
    process_time: float
    status_code: int
    user_agent: str = ""
    client_ip: str = ""


class PerformanceMonitor:
    """
    パフォーマンスメトリクスを収集・分析するクラス
    """

    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        self.metrics_history: deque[RequestMetrics] = deque(maxlen=max_history)
        self.slow_requests: deque[RequestMetrics] = deque(
            maxlen=max_history // 10
        )  # スローリクエストは10%を保持
        self.endpoint_stats: Dict[str, Dict[str, List[float]]] = defaultdict(
            lambda: defaultdict(list)
        )
        self.lock = Lock()
        self.logger = logging.getLogger(__name__)

    def record_request(self, metrics: RequestMetrics):
        """
        リクエストメトリクスを記録する
        """
        with self.lock:
            # 基本メトリクスを記録
            self.metrics_history.append(metrics)

            # エンドポイントごとの統計を更新
            endpoint_key = f"{metrics.method} {metrics.path}"
            self.endpoint_stats[endpoint_key][str(metrics.status_code)].append(
                metrics.process_time
            )

            # スローリクエストを記録
            if metrics.process_time > PerformanceThresholds.SLOW_REQUEST_THRESHOLD:
                self.slow_requests.append(metrics)
                self.logger.warning(
                    f"Slow request recorded: {metrics.method} {metrics.path} "
                    f"took {metrics.process_time:.2f}s (status: {metrics.status_code})"
                )

    def get_average_response_time(self, endpoint: Optional[str] = None) -> float:
        """
        平均レスポンスタイムを取得する
        """
        with self.lock:
            if endpoint:
                times = []
                for status_times in self.endpoint_stats.get(endpoint, {}).values():
                    times.extend(status_times)
            else:
                times = [m.process_time for m in self.metrics_history]

            return sum(times) / len(times) if times else 0.0

    def get_endpoint_stats(self) -> Dict[str, Dict]:
        """
        エンドポイントごとの統計情報を取得する
        """
        with self.lock:
            stats = {}
            for endpoint, status_data in self.endpoint_stats.items():
                endpoint_stats = {}
                all_times = []
                for status_code, times in status_data.items():
                    endpoint_stats[status_code] = {
                        "count": len(times),
                        "avg_time": sum(times) / len(times) if times else 0.0,
                        "min_time": min(times) if times else 0.0,
                        "max_time": max(times) if times else 0.0,
                    }
                    all_times.extend(times)

                # 全体の統計
                if all_times:
                    endpoint_stats["overall"] = {
                        "count": len(all_times),
                        "avg_time": sum(all_times) / len(all_times),
                        "min_time": min(all_times),
                        "max_time": max(all_times),
                    }

                stats[endpoint] = endpoint_stats

            return stats

    def get_slow_requests(self, limit: int = 50) -> List[RequestMetrics]:
        """
        最近のスローリクエストを取得する
        """
        with self.lock:
            return list(self.slow_requests)[-limit:]

    def get_request_rate(self, window_seconds: int = 60) -> float:
        """
        指定時間ウィンドウ内のリクエストレートを取得する
        """
        with self.lock:
            if not self.metrics_history:
                return 0.0

            current_time = time.time()
            recent_requests = [
                m
                for m in self.metrics_history
                if current_time - m.timestamp <= window_seconds
            ]

            return len(recent_requests) / window_seconds

    def get_status_code_distribution(self) -> Dict[int, int]:
        """
        ステータスコードの分布を取得する
        """
        with self.lock:
            status_counts = defaultdict(int)
            for metrics in self.metrics_history:
                status_counts[metrics.status_code] += 1
            return dict(status_counts)

    def get_top_slow_endpoints(self, limit: int = 10) -> List[Tuple[str, float]]:
        """
        最も遅いエンドポイントのトップリストを取得する
        """
        with self.lock:
            avg_times = []
            for endpoint, status_data in self.endpoint_stats.items():
                all_times = []
                for times in status_data.values():
                    all_times.extend(times)
                if all_times:
                    avg_time = sum(all_times) / len(all_times)
                    avg_times.append((endpoint, avg_time))

            # 平均時間でソート
            avg_times.sort(key=lambda x: x[1], reverse=True)
            return avg_times[:limit]

    def clear_history(self):
        """
        履歴をクリアする
        """
        with self.lock:
            self.metrics_history.clear()
            self.slow_requests.clear()
            self.endpoint_stats.clear()

    def export_metrics(self) -> Dict:
        """
        メトリクスをエクスポート可能な辞書形式に変換する
        """
        with self.lock:
            return {
                "total_requests": len(self.metrics_history),
                "slow_requests_count": len(self.slow_requests),
                "average_response_time": self.get_average_response_time(),
                "request_rate_per_second": self.get_request_rate(),
                "status_code_distribution": self.get_status_code_distribution(),
                "top_slow_endpoints": self.get_top_slow_endpoints(),
                "endpoint_stats": self.get_endpoint_stats(),
            }


# グローバルなパフォーマンスモニターインスタンス
performance_monitor = PerformanceMonitor()


def record_request_metrics(
    method: str,
    path: str,
    process_time: float,
    status_code: int,
    user_agent: str = "",
    client_ip: str = "",
):
    """
    リクエストメトリクスを記録するヘルパー関数
    """
    metrics = RequestMetrics(
        timestamp=time.time(),
        method=method,
        path=path,
        process_time=process_time,
        status_code=status_code,
        user_agent=user_agent,
        client_ip=client_ip,
    )
    performance_monitor.record_request(metrics)
