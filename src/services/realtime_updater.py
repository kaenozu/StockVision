"""
リアルタイム株価更新サービス

定期的に株価データを取得してWebSocketクライアントにブロードキャストする
スケジューリング、エラーハンドリング、レート制限を含む包括的な更新システム
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Set, Optional, Any
from dataclasses import dataclass
from enum import Enum
import random

from ..websocket.stock_websocket import stock_websocket_manager, StockPriceUpdate
from ..services.stock_service import get_stock_service
from ..config import get_settings


class UpdateFrequency(Enum):
    """更新頻度設定"""
    REAL_TIME = 1      # 1秒
    HIGH = 5          # 5秒  
    NORMAL = 15       # 15秒
    LOW = 60          # 60秒
    MARKET_HOURS = 10  # 市場時間中: 10秒
    AFTER_HOURS = 60   # 市場時間外: 60秒


@dataclass
class UpdateSchedule:
    """更新スケジュール設定"""
    stock_codes: List[str]
    frequency: UpdateFrequency
    priority: int = 1  # 1が最高優先度
    active: bool = True
    last_update: Optional[datetime] = None
    error_count: int = 0
    success_count: int = 0


class RealtimeStockUpdater:
    """リアルタイム株価更新サービス"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.settings = get_settings()
        
        # 更新状態管理
        self.is_running = False
        self.update_task: Optional[asyncio.Task] = None
        self.market_hours_task: Optional[asyncio.Task] = None
        
        # スケジュール管理
        self.schedules: Dict[str, UpdateSchedule] = {}
        self.active_stocks: Set[str] = set()
        self.priority_stocks: Set[str] = set()  # 高優先度銘柄
        
        # 更新間隔設定
        self.base_interval = 15  # 基本更新間隔（秒）
        self.priority_interval = 5   # 優先銘柄更新間隔（秒）
        self.batch_size = 10         # バッチ処理サイズ
        
        # 市場時間管理
        self.market_open_time = (9, 0)   # 9:00
        self.market_close_time = (15, 0) # 15:00
        self.is_market_hours = False
        
        # エラー管理
        self.max_retries = 3
        self.backoff_multiplier = 2
        self.max_backoff = 300  # 5分
        self.error_stocks: Dict[str, datetime] = {}  # エラー株式のクールダウン
        
        # 統計
        self.stats = {
            "total_updates": 0,
            "successful_updates": 0,
            "failed_updates": 0,
            "start_time": None,
            "last_update_time": None,
            "average_update_time": 0.0
        }
        
        # レート制限
        self.api_calls_per_minute = 60
        self.api_call_timestamps: List[datetime] = []
        
    async def start(self):
        """更新サービス開始"""
        if self.is_running:
            return
            
        self.logger.info("Starting realtime stock updater")
        
        # 統計リセット
        self.stats["start_time"] = datetime.now()
        
        # 購読中の銘柄を初期化
        await self._initialize_active_stocks()
        
        # バックグラウンドタスクを開始
        self.is_running = True
        self.update_task = asyncio.create_task(self._update_loop())
        self.market_hours_task = asyncio.create_task(self._market_hours_monitor())
        
        self.logger.info(f"Realtime updater started with {len(self.active_stocks)} active stocks")
        
    async def stop(self):
        """更新サービス停止"""
        if not self.is_running:
            return
            
        self.logger.info("Stopping realtime stock updater")
        
        self.is_running = False
        
        # バックグラウンドタスクを停止
        if self.update_task:
            self.update_task.cancel()
        if self.market_hours_task:
            self.market_hours_task.cancel()
            
        try:
            if self.update_task:
                await self.update_task
        except asyncio.CancelledError:
            pass
            
        try:
            if self.market_hours_task:
                await self.market_hours_task
        except asyncio.CancelledError:
            pass
            
        self.logger.info("Realtime updater stopped")
        
    async def add_stock_schedule(
        self, 
        schedule_id: str, 
        stock_codes: List[str], 
        frequency: UpdateFrequency,
        priority: int = 1
    ):
        """株式更新スケジュールを追加"""
        schedule = UpdateSchedule(
            stock_codes=stock_codes,
            frequency=frequency,
            priority=priority,
            active=True
        )
        
        self.schedules[schedule_id] = schedule
        self.active_stocks.update(stock_codes)
        
        # 高優先度銘柄を更新
        if priority == 1:
            self.priority_stocks.update(stock_codes)
            
        self.logger.info(f"Added schedule {schedule_id} with {len(stock_codes)} stocks, priority {priority}")
        
    async def remove_stock_schedule(self, schedule_id: str):
        """株式更新スケジュールを削除"""
        if schedule_id in self.schedules:
            schedule = self.schedules[schedule_id]
            
            # 優先株式から削除
            if schedule.priority == 1:
                self.priority_stocks.difference_update(schedule.stock_codes)
                
            del self.schedules[schedule_id]
            
            # アクティブ株式を再計算
            await self._recalculate_active_stocks()
            
            self.logger.info(f"Removed schedule {schedule_id}")
            
    async def update_stock_priority(self, stock_codes: List[str], priority: int):
        """銘柄の優先度を更新"""
        for schedule in self.schedules.values():
            if any(code in schedule.stock_codes for code in stock_codes):
                schedule.priority = priority
                
        # 高優先度銘柄を再計算
        self.priority_stocks.clear()
        for schedule in self.schedules.values():
            if schedule.priority == 1:
                self.priority_stocks.update(schedule.stock_codes)
                
        self.logger.info(f"Updated priority for {len(stock_codes)} stocks to {priority}")
        
    async def _initialize_active_stocks(self):
        """WebSocket購読から初期アクティブ銘柄を設定"""
        # WebSocketマネージャーから購読銘柄を取得
        subscribed_stocks = set()
        for stock_code, subscribers in stock_websocket_manager.stock_subscribers.items():
            if subscribers:  # 購読者がいる銘柄
                subscribed_stocks.add(stock_code)
                
        if subscribed_stocks:
            # デフォルトスケジュールを作成
            await self.add_stock_schedule(
                "default_subscribed",
                list(subscribed_stocks),
                UpdateFrequency.NORMAL,
                priority=2
            )
            
        self.logger.info(f"Initialized with {len(subscribed_stocks)} subscribed stocks")
        
    async def _recalculate_active_stocks(self):
        """アクティブ銘柄を再計算"""
        self.active_stocks.clear()
        self.priority_stocks.clear()
        
        for schedule in self.schedules.values():
            if schedule.active:
                self.active_stocks.update(schedule.stock_codes)
                if schedule.priority == 1:
                    self.priority_stocks.update(schedule.stock_codes)
                    
    async def _update_loop(self):
        """メイン更新ループ"""
        try:
            while self.is_running:
                try:
                    # 動的に購読株式を確認・更新
                    await self._sync_with_websocket_subscriptions()
                    
                    # 優先株式を更新
                    if self.priority_stocks:
                        await self._update_stock_batch(list(self.priority_stocks), is_priority=True)
                        
                    # 通常株式を更新（優先株式以外）
                    normal_stocks = self.active_stocks - self.priority_stocks
                    if normal_stocks:
                        await self._update_stock_batch(list(normal_stocks), is_priority=False)
                        
                    # 市場時間に応じた待機時間
                    interval = self.priority_interval if self.is_market_hours else self.base_interval
                    await asyncio.sleep(interval)
                    
                except Exception as e:
                    self.logger.error(f"Error in update loop: {e}")
                    await asyncio.sleep(10)  # エラー時は短い間隔で再試行
                    
        except asyncio.CancelledError:
            self.logger.info("Update loop cancelled")
            
    async def _sync_with_websocket_subscriptions(self):
        """WebSocket購読と同期"""
        # 現在の購読銘柄を取得
        current_subscribed = set()
        for stock_code, subscribers in stock_websocket_manager.stock_subscribers.items():
            if subscribers:
                current_subscribed.add(stock_code)
                
        # デフォルトスケジュールを更新
        if "default_subscribed" in self.schedules:
            old_stocks = set(self.schedules["default_subscribed"].stock_codes)
            
            # 新しい購読銘柄
            new_stocks = current_subscribed - old_stocks
            # 削除された購読銘柄
            removed_stocks = old_stocks - current_subscribed
            
            if new_stocks or removed_stocks:
                self.schedules["default_subscribed"].stock_codes = list(current_subscribed)
                
                # アクティブ株式を再計算
                await self._recalculate_active_stocks()
                
                if new_stocks:
                    self.logger.info(f"Added {len(new_stocks)} new subscribed stocks")
                if removed_stocks:
                    self.logger.info(f"Removed {len(removed_stocks)} unsubscribed stocks")
                    
    async def _update_stock_batch(self, stock_codes: List[str], is_priority: bool = False):
        """株式バッチ更新"""
        if not stock_codes:
            return
            
        # レート制限チェック
        if not await self._check_rate_limit():
            self.logger.warning("Rate limit exceeded, skipping update")
            return
            
        # バッチサイズで分割
        batch_size = self.batch_size if not is_priority else min(self.batch_size * 2, len(stock_codes))
        
        for i in range(0, len(stock_codes), batch_size):
            if not self.is_running:
                break
                
            batch = stock_codes[i:i + batch_size]
            await self._process_stock_batch(batch, is_priority)
            
            # バッチ間の短い待機（API負荷軽減）
            if i + batch_size < len(stock_codes):
                await asyncio.sleep(0.5)
                
    async def _process_stock_batch(self, stock_codes: List[str], is_priority: bool):
        """株式バッチを処理"""
        stock_service = await get_stock_service()
        batch_start_time = datetime.now()
        
        # 並行して株価を取得
        tasks = []
        for stock_code in stock_codes:
            # エラークールダウンチェック
            if await self._is_stock_in_cooldown(stock_code):
                continue
                
            task = asyncio.create_task(self._update_single_stock(stock_service, stock_code))
            tasks.append(task)
            
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 結果を処理
            successful_updates = 0
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    stock_code = stock_codes[i % len(stock_codes)]
                    await self._handle_update_error(stock_code, result)
                else:
                    successful_updates += 1
                    
            # 統計更新
            batch_time = (datetime.now() - batch_start_time).total_seconds()
            self.stats["total_updates"] += len(tasks)
            self.stats["successful_updates"] += successful_updates
            self.stats["failed_updates"] += len(tasks) - successful_updates
            self.stats["last_update_time"] = datetime.now()
            
            # 平均更新時間を計算
            if self.stats["total_updates"] > 0:
                self.stats["average_update_time"] = (
                    self.stats["average_update_time"] * 0.9 + batch_time * 0.1
                )
                
            priority_text = "priority" if is_priority else "normal"
            self.logger.debug(
                f"Processed {len(tasks)} {priority_text} stocks in {batch_time:.2f}s, "
                f"{successful_updates} successful"
            )
            
    async def _update_single_stock(self, stock_service, stock_code: str) -> bool:
        """単一銘柄を更新"""
        try:
            # 最新価格データを取得
            current_price_data = await stock_service.get_current_price(
                stock_code,
                use_real_data=self.settings.yahoo_finance.enabled
            )
            
            if current_price_data:
                # WebSocket形式に変換
                price_update = StockPriceUpdate(
                    stock_code=stock_code,
                    current_price=current_price_data.current_price,
                    price_change=current_price_data.price_change,
                    price_change_pct=current_price_data.price_change_pct,
                    volume=getattr(current_price_data, 'volume', 0),
                    market_status=current_price_data.market_status,
                    timestamp=current_price_data.timestamp,
                    previous_close=current_price_data.previous_close
                )
                
                # WebSocketでブロードキャスト
                await stock_websocket_manager.broadcast_price_update(
                    stock_code,
                    price_update
                )
                
                # エラーカウントをリセット
                if stock_code in self.error_stocks:
                    del self.error_stocks[stock_code]
                    
                return True
            else:
                raise Exception("No price data available")
                
        except Exception as e:
            raise Exception(f"Failed to update {stock_code}: {str(e)}")
            
    async def _handle_update_error(self, stock_code: str, error: Exception):
        """更新エラーを処理"""
        self.logger.warning(f"Update error for {stock_code}: {error}")
        
        # エラークールダウンを設定
        cooldown_time = datetime.now() + timedelta(
            seconds=min(self.max_backoff, 30 * (2 ** len(self.error_stocks)))
        )
        self.error_stocks[stock_code] = cooldown_time
        
    async def _is_stock_in_cooldown(self, stock_code: str) -> bool:
        """銘柄がエラークールダウン中かチェック"""
        if stock_code not in self.error_stocks:
            return False
            
        if datetime.now() > self.error_stocks[stock_code]:
            del self.error_stocks[stock_code]
            return False
            
        return True
        
    async def _check_rate_limit(self) -> bool:
        """レート制限チェック"""
        now = datetime.now()
        
        # 1分以内のAPI呼び出しをフィルタ
        cutoff_time = now - timedelta(minutes=1)
        self.api_call_timestamps = [
            ts for ts in self.api_call_timestamps if ts > cutoff_time
        ]
        
        # レート制限チェック
        if len(self.api_call_timestamps) >= self.api_calls_per_minute:
            return False
            
        # 現在のタイムスタンプを追加
        self.api_call_timestamps.append(now)
        return True
        
    async def _market_hours_monitor(self):
        """市場時間監視"""
        try:
            while self.is_running:
                now = datetime.now()
                current_time = (now.hour, now.minute)
                
                # 平日の市場時間をチェック（簡易版）
                is_weekday = now.weekday() < 5  # 月-金
                in_market_hours = (
                    is_weekday and 
                    self.market_open_time <= current_time <= self.market_close_time
                )
                
                if in_market_hours != self.is_market_hours:
                    self.is_market_hours = in_market_hours
                    status = "opened" if in_market_hours else "closed"
                    self.logger.info(f"Market {status}, adjusting update frequency")
                    
                    # 市場状況をブロードキャスト
                    await stock_websocket_manager.broadcast_market_status({
                        "market_status": "open" if in_market_hours else "closed",
                        "timestamp": now.isoformat(),
                        "message": f"Market {status} at {now.strftime('%H:%M')}"
                    })
                    
                # 1分間隔でチェック
                await asyncio.sleep(60)
                
        except asyncio.CancelledError:
            self.logger.info("Market hours monitor cancelled")
            
    def get_stats(self) -> Dict[str, Any]:
        """統計情報を取得"""
        uptime_seconds = 0
        if self.stats["start_time"]:
            uptime_seconds = (datetime.now() - self.stats["start_time"]).total_seconds()
            
        return {
            **self.stats,
            "uptime_seconds": uptime_seconds,
            "is_running": self.is_running,
            "is_market_hours": self.is_market_hours,
            "active_stocks_count": len(self.active_stocks),
            "priority_stocks_count": len(self.priority_stocks),
            "schedules_count": len(self.schedules),
            "error_stocks_count": len(self.error_stocks),
            "success_rate": (
                self.stats["successful_updates"] / max(1, self.stats["total_updates"])
                if self.stats["total_updates"] > 0 else 0
            )
        }


# グローバルインスタンス
realtime_updater = RealtimeStockUpdater()