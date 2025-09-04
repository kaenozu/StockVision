"""
株価データの表示レンダラー。

データの表示とユーザーインタラクションを管理し、
フォーマッターを使用して美しい表示を提供します。
"""
from datetime import date, datetime, timedelta
from typing import List, Optional, Union, Any, Dict

from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Confirm, Prompt
from rich.text import Text
from rich import print as rich_print

from .formatters import get_formatter, StockFormatter, JSONFormatter, TableFormatter, CompactFormatter
from ..models.stock import Stock
from ..models.watchlist import Watchlist
from ..models.price_history import PriceHistory
from ..stock_api.data_models import CurrentPrice, StockData, PriceHistoryItem


class StockRenderer:
    """株価データの表示レンダラー。"""
    
    def __init__(self, console: Optional[Console] = None, format_type: str = "table"):
        """レンダラーを初期化。
        
        Args:
            console: Richコンソールインスタンス（オプション）
            format_type: デフォルトのフォーマット種類
        """
        self.console = console or Console()
        self.format_type = format_type
        self.formatter = get_formatter(format_type, self.console)
    
    def set_format(self, format_type: str):
        """フォーマット種類を変更。
        
        Args:
            format_type: 新しいフォーマット種類
        """
        self.format_type = format_type
        self.formatter = get_formatter(format_type, self.console)
    
    def render_stock(self, stock: Union[Stock, CurrentPrice, StockData], title: Optional[str] = None):
        """単一の株価データを表示。
        
        Args:
            stock: 株価データ
            title: オプションのタイトル
        """
        if title:
            self.console.print(f"\n[bold cyan]{title}[/bold cyan]\n")
        
        if isinstance(self.formatter, JSONFormatter):
            json_output = self.formatter.format_stock(stock)
            self.console.print(Panel(json_output, title="株価情報 (JSON)", border_style="cyan"))
        elif isinstance(self.formatter, TableFormatter):
            table = self.formatter.format_stock(stock)
            self.console.print(table)
        elif isinstance(self.formatter, CompactFormatter):
            compact_output = self.formatter.format_stock_compact(stock)
            self.console.print(compact_output)
    
    def render_stock_list(self, stocks: List[Union[Stock, CurrentPrice, StockData]], title: Optional[str] = None):
        """複数の株価データを表示。
        
        Args:
            stocks: 株価データのリスト
            title: オプションのタイトル
        """
        if title:
            self.console.print(f"\n[bold cyan]{title}[/bold cyan]\n")
        
        if not stocks:
            self.console.print("[yellow]表示する株価データがありません。[/yellow]")
            return
        
        if isinstance(self.formatter, JSONFormatter):
            json_output = self.formatter.format_watchlist([])  # Modify as needed
            self.console.print(Panel(json_output, title="株価一覧 (JSON)", border_style="cyan"))
        elif isinstance(self.formatter, TableFormatter):
            # 複数株価の場合は個別にテーブル表示
            for i, stock in enumerate(stocks):
                if i > 0:
                    self.console.print("")  # 区切り行
                table = self.formatter.format_stock(stock)
                self.console.print(table)
        elif isinstance(self.formatter, CompactFormatter):
            for stock in stocks:
                compact_output = self.formatter.format_stock_compact(stock)
                self.console.print(compact_output)
    
    def render_error(self, error_msg: str, title: str = "エラー"):
        """エラーメッセージを表示。
        
        Args:
            error_msg: エラーメッセージ
            title: エラータイトル
        """
        error_panel = Panel(
            Text(error_msg, style="red"),
            title=f"[red]{title}[/red]",
            border_style="red"
        )
        self.console.print(error_panel)
    
    def render_success(self, success_msg: str, title: str = "成功"):
        """成功メッセージを表示。
        
        Args:
            success_msg: 成功メッセージ
            title: 成功タイトル
        """
        success_panel = Panel(
            Text(success_msg, style="green"),
            title=f"[green]{title}[/green]",
            border_style="green"
        )
        self.console.print(success_panel)
    
    def render_info(self, info_msg: str, title: str = "情報"):
        """情報メッセージを表示。
        
        Args:
            info_msg: 情報メッセージ
            title: 情報タイトル
        """
        info_panel = Panel(
            Text(info_msg, style="blue"),
            title=f"[blue]{title}[/blue]",
            border_style="blue"
        )
        self.console.print(info_panel)


class WatchlistRenderer:
    """ウォッチリストの表示レンダラー。"""
    
    def __init__(self, console: Optional[Console] = None, format_type: str = "table"):
        """レンダラーを初期化。
        
        Args:
            console: Richコンソールインスタンス（オプション）
            format_type: デフォルトのフォーマット種類
        """
        self.console = console or Console()
        self.format_type = format_type
        self.formatter = get_formatter(format_type, self.console)
    
    def set_format(self, format_type: str):
        """フォーマット種類を変更。
        
        Args:
            format_type: 新しいフォーマット種類
        """
        self.format_type = format_type
        self.formatter = get_formatter(format_type, self.console)
    
    def render_watchlist(self, watchlist_items: List[Watchlist], title: Optional[str] = None):
        """ウォッチリストを表示。
        
        Args:
            watchlist_items: ウォッチリストアイテムのリスト
            title: オプションのタイトル
        """
        if title:
            self.console.print(f"\n[bold cyan]{title}[/bold cyan]\n")
        
        if not watchlist_items:
            self.console.print("[yellow]ウォッチリストは空です。[/yellow]")
            return
        
        if isinstance(self.formatter, JSONFormatter):
            json_output = self.formatter.format_watchlist(watchlist_items)
            self.console.print(Panel(json_output, title="ウォッチリスト (JSON)", border_style="cyan"))
        elif isinstance(self.formatter, TableFormatter):
            table = self.formatter.format_watchlist(watchlist_items)
            self.console.print(table)
        elif isinstance(self.formatter, CompactFormatter):
            compact_items = self.formatter.format_watchlist_compact(watchlist_items)
            for item in compact_items:
                self.console.print(item)
    
    def render_watchlist_summary(self, watchlist_items: List[Watchlist]):
        """ウォッチリストの統計情報を表示。
        
        Args:
            watchlist_items: ウォッチリストアイテムのリスト
        """
        if not watchlist_items:
            self.console.print("[yellow]ウォッチリストに銘柄がありません。[/yellow]")
            return
        
        # 統計計算
        total_items = len(watchlist_items)
        active_items = sum(1 for item in watchlist_items if item.is_active)
        with_alerts = sum(1 for item in watchlist_items 
                         if item.alert_price_high or item.alert_price_low)
        
        # 価格統計（利用可能な場合）
        stocks_with_prices = [item.stock for item in watchlist_items 
                            if item.stock and item.stock.current_price]
        
        summary_text = f"""
総銘柄数: {total_items}
アクティブ: {active_items}
アラート設定: {with_alerts}
"""
        
        if stocks_with_prices:
            total_value = sum(float(stock.current_price) for stock in stocks_with_prices)
            avg_price = total_value / len(stocks_with_prices)
            
            gains = [stock for stock in stocks_with_prices if stock.price_change > 0]
            losses = [stock for stock in stocks_with_prices if stock.price_change < 0]
            
            summary_text += f"""価格データあり: {len(stocks_with_prices)}
平均価格: ¥{avg_price:,.2f}
値上がり: {len(gains)}銘柄
値下がり: {len(losses)}銘柄
"""
        
        summary_panel = Panel(
            summary_text.strip(),
            title="[cyan]ウォッチリスト統計[/cyan]",
            border_style="cyan"
        )
        self.console.print(summary_panel)


class PriceHistoryRenderer:
    """価格履歴の表示レンダラー。"""
    
    def __init__(self, console: Optional[Console] = None, format_type: str = "table"):
        """レンダラーを初期化。
        
        Args:
            console: Richコンソールインスタンス（オプション）
            format_type: デフォルトのフォーマット種類
        """
        self.console = console or Console()
        self.format_type = format_type
        self.formatter = get_formatter(format_type, self.console)
    
    def render_info(self, info_msg: str, title: str = "情報"):
        """情報メッセージを表示。
        
        Args:
            info_msg: 情報メッセージ
            title: 情報タイトル
        """
        from rich.panel import Panel
        from rich.text import Text
        
        info_panel = Panel(
            Text(info_msg, style="blue"),
            title=f"[blue]{title}[/blue]",
            border_style="blue"
        )
        self.console.print(info_panel)
    
    def render_error(self, error_msg: str, title: str = "エラー"):
        """エラーメッセージを表示。
        
        Args:
            error_msg: エラーメッセージ
            title: エラータイトル
        """
        from rich.panel import Panel
        from rich.text import Text
        
        error_panel = Panel(
            Text(error_msg, style="red"),
            title=f"[red]{title}[/red]",
            border_style="red"
        )
        self.console.print(error_panel)
    
    def set_format(self, format_type: str):
        """フォーマット種類を変更。
        
        Args:
            format_type: 新しいフォーマット種類
        """
        self.format_type = format_type
        self.formatter = get_formatter(format_type, self.console)
    
    def render_price_history(self, 
                           price_history: List[Union[PriceHistory, PriceHistoryItem]], 
                           stock_code: Optional[str] = None,
                           show_summary: bool = True):
        """価格履歴を表示。
        
        Args:
            price_history: 価格履歴データのリスト
            stock_code: 銘柄コード（タイトル用）
            show_summary: 統計情報も表示するかどうか
        """
        if not price_history:
            self.console.print(f"[yellow]{stock_code or '該当銘柄'}の価格履歴データがありません。[/yellow]")
            return
        
        if isinstance(self.formatter, JSONFormatter):
            json_output = self.formatter.format_price_history(price_history)
            title = f"価格履歴 - {stock_code} (JSON)" if stock_code else "価格履歴 (JSON)"
            self.console.print(Panel(json_output, title=title, border_style="cyan"))
        elif isinstance(self.formatter, TableFormatter):
            table = self.formatter.format_price_history(price_history, stock_code)
            self.console.print(table)
            
            if show_summary:
                self.console.print("")  # 区切り行
                summary_table = self.formatter.format_summary_stats(price_history)
                self.console.print(summary_table)
        elif isinstance(self.formatter, CompactFormatter):
            # コンパクト形式では最新数件のみ表示
            recent_history = price_history[:10] if len(price_history) > 10 else price_history
            
            for item in recent_history:
                day_change = item.close_price - item.open_price
                change_sign = "+" if day_change >= 0 else ""
                day_change_pct = (day_change / item.open_price * 100) if item.open_price > 0 else 0
                
                # PriceHistoryItemの場合はtrading_date、PriceHistoryの場合はdateを使用
                date_value = getattr(item, 'trading_date', None) or getattr(item, 'date', None)
                
                self.console.print(
                    f"{date_value} | 終値: {self.formatter.format_price(item.close_price)} "
                    f"({change_sign}{self.formatter.format_price(day_change)}, "
                    f"{change_sign}{day_change_pct:.2f}%) | 出来高: {self.formatter.format_volume(item.volume)}"
                )
    
    def render_price_comparison(self, 
                              current_data: List[Union[PriceHistory, PriceHistoryItem]],
                              comparison_data: List[Union[PriceHistory, PriceHistoryItem]],
                              current_label: str = "現在期間",
                              comparison_label: str = "比較期間"):
        """価格データの比較表示。
        
        Args:
            current_data: 現在期間のデータ
            comparison_data: 比較期間のデータ
            current_label: 現在期間のラベル
            comparison_label: 比較期間のラベル
        """
        self.console.print(f"\n[bold cyan]価格比較: {current_label} vs {comparison_label}[/bold cyan]\n")
        
        if not current_data or not comparison_data:
            self.console.print("[yellow]比較するデータが不足しています。[/yellow]")
            return
        
        # 基本統計の計算
        def calc_stats(data):
            if not data:
                return {}
            
            prices = [float(item.close_price) for item in data]
            highs = [float(item.high_price) for item in data]
            lows = [float(item.low_price) for item in data]
            volumes = [item.volume for item in data]
            
            return {
                'avg_price': sum(prices) / len(prices),
                'max_price': max(highs),
                'min_price': min(lows),
                'avg_volume': sum(volumes) / len(volumes),
                'price_change': prices[0] - prices[-1] if len(prices) > 1 else 0,
                'price_change_pct': ((prices[0] - prices[-1]) / prices[-1] * 100) if len(prices) > 1 and prices[-1] > 0 else 0
            }
        
        current_stats = calc_stats(current_data)
        comparison_stats = calc_stats(comparison_data)
        
        # 比較テーブル作成
        from rich.table import Table
        from rich import box
        
        table = Table(title="期間比較", box=box.ROUNDED)
        table.add_column("指標", style="cyan")
        table.add_column(current_label, style="white")
        table.add_column(comparison_label, style="white")
        table.add_column("差異", style="yellow")
        
        # 平均価格
        avg_diff = current_stats['avg_price'] - comparison_stats['avg_price']
        avg_diff_pct = (avg_diff / comparison_stats['avg_price'] * 100) if comparison_stats['avg_price'] > 0 else 0
        table.add_row(
            "平均終値",
            self.formatter.format_price(current_stats['avg_price']),
            self.formatter.format_price(comparison_stats['avg_price']),
            f"{self.formatter.format_price(avg_diff)} ({avg_diff_pct:+.2f}%)"
        )
        
        # 最高値
        max_diff = current_stats['max_price'] - comparison_stats['max_price']
        max_diff_pct = (max_diff / comparison_stats['max_price'] * 100) if comparison_stats['max_price'] > 0 else 0
        table.add_row(
            "期間高値",
            self.formatter.format_price(current_stats['max_price']),
            self.formatter.format_price(comparison_stats['max_price']),
            f"{self.formatter.format_price(max_diff)} ({max_diff_pct:+.2f}%)"
        )
        
        # 最安値
        min_diff = current_stats['min_price'] - comparison_stats['min_price']
        min_diff_pct = (min_diff / comparison_stats['min_price'] * 100) if comparison_stats['min_price'] > 0 else 0
        table.add_row(
            "期間安値",
            self.formatter.format_price(current_stats['min_price']),
            self.formatter.format_price(comparison_stats['min_price']),
            f"{self.formatter.format_price(min_diff)} ({min_diff_pct:+.2f}%)"
        )
        
        # 平均出来高
        vol_diff = current_stats['avg_volume'] - comparison_stats['avg_volume']
        vol_diff_pct = (vol_diff / comparison_stats['avg_volume'] * 100) if comparison_stats['avg_volume'] > 0 else 0
        table.add_row(
            "平均出来高",
            self.formatter.format_volume(int(current_stats['avg_volume'])),
            self.formatter.format_volume(int(comparison_stats['avg_volume'])),
            f"{int(vol_diff):+,} ({vol_diff_pct:+.2f}%)"
        )
        
        self.console.print(table)


class ProgressRenderer:
    """進捗表示レンダラー。"""
    
    def __init__(self, console: Optional[Console] = None):
        """レンダラーを初期化。
        
        Args:
            console: Richコンソールインスタンス（オプション）
        """
        self.console = console or Console()
    
    def show_progress(self, tasks: List[str], task_func, *args, **kwargs):
        """複数タスクの進捗を表示しながら実行。
        
        Args:
            tasks: タスク名のリスト
            task_func: 実行する関数
            *args, **kwargs: 関数に渡す引数
            
        Returns:
            実行結果のリスト
        """
        results = []
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=self.console
        ) as progress:
            
            for task_name in tasks:
                task = progress.add_task(f"実行中: {task_name}", total=None)
                
                try:
                    result = task_func(task_name, *args, **kwargs)
                    results.append(result)
                    progress.update(task, description=f"完了: {task_name}")
                except Exception as e:
                    results.append(None)
                    progress.update(task, description=f"エラー: {task_name} - {str(e)}")
                
                progress.remove_task(task)
        
        return results
    
    def show_spinner(self, message: str, task_func, *args, **kwargs):
        """スピナーを表示しながらタスクを実行。
        
        Args:
            message: 表示メッセージ
            task_func: 実行する関数
            *args, **kwargs: 関数に渡す引数
            
        Returns:
            実行結果
        """
        with Progress(
            SpinnerColumn(),
            TextColumn(f"[progress.description]{message}"),
            console=self.console
        ) as progress:
            
            task = progress.add_task(message, total=None)
            try:
                result = task_func(*args, **kwargs)
                progress.update(task, description=f"完了: {message}")
                return result
            except Exception as e:
                progress.update(task, description=f"エラー: {message} - {str(e)}")
                raise


class InteractiveRenderer:
    """インタラクティブな表示レンダラー。"""
    
    def __init__(self, console: Optional[Console] = None):
        """レンダラーを初期化。
        
        Args:
            console: Richコンソールインスタンス（オプション）
        """
        self.console = console or Console()
    
    def confirm_action(self, message: str, default: bool = False) -> bool:
        """ユーザーに確認を求める。
        
        Args:
            message: 確認メッセージ
            default: デフォルトの回答
            
        Returns:
            ユーザーの回答
        """
        return Confirm.ask(message, default=default, console=self.console)
    
    def prompt_input(self, message: str, default: Optional[str] = None) -> str:
        """ユーザーに入力を求める。
        
        Args:
            message: 入力促進メッセージ
            default: デフォルト値
            
        Returns:
            ユーザーの入力
        """
        return Prompt.ask(message, default=default, console=self.console)
    
    def select_from_list(self, items: List[str], message: str = "選択してください") -> Optional[str]:
        """リストから項目を選択させる。
        
        Args:
            items: 選択肢のリスト
            message: 選択促進メッセージ
            
        Returns:
            選択された項目（キャンセルの場合はNone）
        """
        if not items:
            self.console.print("[yellow]選択可能な項目がありません。[/yellow]")
            return None
        
        self.console.print(f"\n[bold]{message}[/bold]\n")
        
        for i, item in enumerate(items, 1):
            self.console.print(f"  {i}. {item}")
        
        self.console.print(f"  0. キャンセル\n")
        
        while True:
            try:
                choice = Prompt.ask("番号を入力", default="0")
                choice_num = int(choice)
                
                if choice_num == 0:
                    return None
                elif 1 <= choice_num <= len(items):
                    return items[choice_num - 1]
                else:
                    self.console.print(f"[red]1から{len(items)}の範囲で入力してください。[/red]")
            except ValueError:
                self.console.print("[red]有効な数値を入力してください。[/red]")