"""
株価データの表示フォーマッター。

JSON形式やテーブル形式での株価データの表示を提供し、
Rich ライブラリを使用して美しいコンソール表示を実現します。
"""

import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Union

from rich import box
from rich.console import Console
from rich.table import Table
from rich.text import Text

from ..models.price_history import PriceHistory
from ..models.stock import Stock
from ..models.watchlist import Watchlist
from ..stock_api.data_models import CurrentPrice, PriceHistoryItem, StockData


class StockFormatter:
    """株価データのフォーマッター基底クラス。"""

    def __init__(self, console: Optional[Console] = None):
        """フォーマッターを初期化。

        Args:
            console: Richコンソールインスタンス（オプション）
        """
        self.console = console or Console()

    def format_price(self, price: Union[Decimal, float], currency: str = "JPY") -> str:
        """価格を日本円形式でフォーマット。

        Args:
            price: 価格
            currency: 通貨記号

        Returns:
            フォーマット済み価格文字列
        """
        if price is None:
            return "N/A"

        # Decimalまたはfloatを数値に変換
        price_value = float(price) if isinstance(price, Decimal) else price

        # 3桁区切りでフォーマット
        return f"{currency}{price_value:,.2f}"

    def format_percentage(self, percentage: Union[Decimal, float]) -> str:
        """パーセンテージをフォーマット。

        Args:
            percentage: パーセンテージ値

        Returns:
            フォーマット済みパーセンテージ文字列
        """
        if percentage is None:
            return "N/A"

        percentage_value = (
            float(percentage) if isinstance(percentage, Decimal) else percentage
        )
        return f"{percentage_value:+.2f}%"

    def format_volume(self, volume: int) -> str:
        """取引量をフォーマット。

        Args:
            volume: 取引量

        Returns:
            フォーマット済み取引量文字列
        """
        if volume is None:
            return "N/A"

        # 万単位で表示（日本の慣例）
        if volume >= 10000:
            return f"{volume:,} ({volume/10000:.1f}万)"
        else:
            return f"{volume:,}"

    def get_price_color(self, price_change: Union[Decimal, float]) -> str:
        """価格変動に基づく色を取得。

        Args:
            price_change: 価格変動値

        Returns:
            Rich色名
        """
        if price_change is None:
            return "white"

        change_value = (
            float(price_change) if isinstance(price_change, Decimal) else price_change
        )

        if change_value > 0:
            return "green"
        elif change_value < 0:
            return "red"
        else:
            return "white"

    def to_serializable_dict(self, obj: Any) -> Dict[str, Any]:
        """オブジェクトをシリアライズ可能な辞書に変換。

        Args:
            obj: 変換対象オブジェクト

        Returns:
            シリアライズ可能な辞書
        """
        if isinstance(
            obj,
            (Stock, Watchlist, PriceHistory, CurrentPrice, StockData, PriceHistoryItem),
        ):
            result = {}

            # Pydanticモデルの場合
            if hasattr(obj, "model_dump"):
                result = obj.model_dump()
            # SQLAlchemyモデルの場合
            elif hasattr(obj, "__table__"):
                result = {
                    column.name: getattr(obj, column.name)
                    for column in obj.__table__.columns
                }
            # その他の属性ベースオブジェクト
            else:
                result = {
                    attr: getattr(obj, attr)
                    for attr in dir(obj)
                    if not attr.startswith("_")
                }

            # 特殊な型を変換
            for key, value in result.items():
                if isinstance(value, Decimal):
                    result[key] = float(value)
                elif isinstance(value, (date, datetime)):
                    result[key] = value.isoformat()
                elif hasattr(value, "__dict__"):  # ネストしたオブジェクト
                    result[key] = self.to_serializable_dict(value)

            return result

        return obj


class JSONFormatter(StockFormatter):
    """JSON形式のフォーマッター。"""

    def format_current_price(self, price: CurrentPrice) -> str:
        """現在価格をJSON文字列にフォーマット。"""
        return json.dumps(self.to_serializable_dict(price), ensure_ascii=False)

    def format_json(
        self, items: List[Union[CurrentPrice, StockData, PriceHistoryItem]] | None
    ) -> str:
        """モデル配列をJSON文字列にフォーマット。"""
        if not items:
            return "[]"
        return json.dumps(
            [self.to_serializable_dict(x) for x in items], ensure_ascii=False
        )

    def format_stock(self, stock: Union[Stock, CurrentPrice, StockData]) -> str:
        """株価情報をJSON形式でフォーマット。

        Args:
            stock: 株価データ

        Returns:
            JSON文字列
        """
        stock_dict = self.to_serializable_dict(stock)
        return json.dumps(stock_dict, ensure_ascii=False, indent=2)

    def format_watchlist(self, watchlist_items: List[Watchlist]) -> str:
        """ウォッチリストをJSON形式でフォーマット。

        Args:
            watchlist_items: ウォッチリストアイテムのリスト

        Returns:
            JSON文字列
        """
        items_dict = [self.to_serializable_dict(item) for item in watchlist_items]
        return json.dumps(items_dict, ensure_ascii=False, indent=2)

    def format_price_history(
        self, price_history: List[Union[PriceHistory, PriceHistoryItem]]
    ) -> str:
        """価格履歴をJSON形式でフォーマット。

        Args:
            price_history: 価格履歴データのリスト

        Returns:
            JSON文字列
        """
        history_dict = [self.to_serializable_dict(item) for item in price_history]
        return json.dumps(history_dict, ensure_ascii=False, indent=2)


class TableFormatter(StockFormatter):
    """テーブル形式のフォーマッター。"""

    def format_stock_list(
        self, stocks: List[Union[StockData, CurrentPrice, Stock]]
    ) -> str:
        """複数銘柄をテキストテーブル風にフォーマット。"""
        if not stocks:
            return ""
        lines: List[str] = []
        for s in stocks:
            code = getattr(s, "stock_code", "-")
            name = getattr(s, "company_name", "-")
            current = getattr(s, "current_price", None)
            prev = getattr(s, "previous_close", None)
            change = getattr(s, "price_change", None)
            pct = getattr(s, "price_change_pct", None)
            vol = getattr(s, "volume", None)
            line = (
                f"{code}\t{name}\t"
                f"{self.format_price(current) if current is not None else '-'}\t"
                f"{self.format_price(prev) if prev is not None else '-'}\t"
                f"{self.format_price(change) if change is not None else '-'}\t"
                f"{self.format_percentage(pct) if pct is not None else '-'}\t"
                f"{self.format_volume(vol) if vol is not None else '-'}"
            )
            lines.append(line)
        return "\n".join(lines)

    def format_stock(self, stock: Union[Stock, CurrentPrice, StockData]) -> Table:
        """株価情報をテーブル形式でフォーマット。

        Args:
            stock: 株価データ

        Returns:
            Richテーブル
        """
        table = Table(title="株価情報", box=box.ROUNDED)
        table.add_column("項目", style="cyan")
        table.add_column("値", style="white")

        # 基本情報
        table.add_row("銘柄コード", stock.stock_code)
        table.add_row("会社名", stock.company_name)

        # 価格情報
        current_price_color = self.get_price_color(stock.price_change)
        table.add_row(
            "現在価格",
            Text(self.format_price(stock.current_price), style=current_price_color),
        )
        table.add_row("前日終値", self.format_price(stock.previous_close))

        price_change_text = Text(
            f"{self.format_price(stock.price_change)} ({self.format_percentage(stock.price_change_pct)})",
            style=current_price_color,
        )
        table.add_row("価格変動", price_change_text)

        # 取引量
        table.add_row("出来高", self.format_volume(stock.volume))

        # 市場キャップ（利用可能な場合）
        if hasattr(stock, "market_cap") and stock.market_cap:
            table.add_row("時価総額", self.format_price(stock.market_cap))

        # 追加データ（StockDataの場合）
        if isinstance(stock, StockData):
            if stock.day_high:
                table.add_row("日中高値", self.format_price(stock.day_high))
            if stock.day_low:
                table.add_row("日中安値", self.format_price(stock.day_low))
            if stock.pe_ratio:
                table.add_row("PER", f"{float(stock.pe_ratio):.2f}")
            if stock.dividend_yield:
                table.add_row(
                    "配当利回り", self.format_percentage(stock.dividend_yield)
                )

        return table

    def format_watchlist(self, watchlist_items: List[Watchlist]) -> Table:
        """ウォッチリストをテーブル形式でフォーマット。

        Args:
            watchlist_items: ウォッチリストアイテムのリスト

        Returns:
            Richテーブル
        """
        table = Table(title="ウォッチリスト", box=box.ROUNDED)
        table.add_column("銘柄コード", style="cyan")
        table.add_column("会社名", style="white")
        table.add_column("現在価格", style="white")
        table.add_column("価格変動", style="white")
        table.add_column("高値アラート", style="yellow")
        table.add_column("安値アラート", style="yellow")
        table.add_column("メモ", style="dim")

        for item in watchlist_items:
            stock = item.stock

            if stock:
                # 価格変動の色
                price_color = self.get_price_color(stock.price_change)
                current_price_text = Text(
                    self.format_price(stock.current_price), style=price_color
                )
                price_change_text = Text(
                    f"{self.format_price(stock.price_change)} ({self.format_percentage(stock.price_change_pct)})",
                    style=price_color,
                )

                table.add_row(
                    stock.stock_code,
                    stock.company_name,
                    current_price_text,
                    price_change_text,
                    (
                        self.format_price(item.alert_price_high)
                        if item.alert_price_high
                        else "-"
                    ),
                    (
                        self.format_price(item.alert_price_low)
                        if item.alert_price_low
                        else "-"
                    ),
                    item.notes or "-",
                )
            else:
                table.add_row(
                    item.stock_code,
                    "データ未取得",
                    "-",
                    "-",
                    (
                        self.format_price(item.alert_price_high)
                        if item.alert_price_high
                        else "-"
                    ),
                    (
                        self.format_price(item.alert_price_low)
                        if item.alert_price_low
                        else "-"
                    ),
                    item.notes or "-",
                )

        return table

    def format_price_history(
        self,
        price_history: List[Union[PriceHistory, PriceHistoryItem]],
        stock_code: Optional[str] = None,
    ) -> Table:
        """価格履歴をテーブル形式でフォーマット。

        Args:
            price_history: 価格履歴データのリスト
            stock_code: 銘柄コード（タイトルに表示用）

        Returns:
            Richテーブル
        """
        title = f"価格履歴 - {stock_code}" if stock_code else "価格履歴"
        table = Table(title=title, box=box.ROUNDED)
        table.add_column("日付", style="cyan")
        table.add_column("始値", style="white")
        table.add_column("高値", style="green")
        table.add_column("安値", style="red")
        table.add_column("終値", style="white")
        table.add_column("出来高", style="dim")
        table.add_column("日中変動", style="white")

        for item in price_history:
            # 日中変動を計算
            day_change = item.close_price - item.open_price
            day_change_pct = (
                (day_change / item.open_price * 100) if item.open_price > 0 else 0
            )

            day_change_color = self.get_price_color(day_change)
            day_change_text = Text(
                f"{self.format_price(day_change)} ({day_change_pct:+.2f}%)",
                style=day_change_color,
            )

            table.add_row(
                str(item.date),
                self.format_price(item.open_price),
                self.format_price(item.high_price),
                self.format_price(item.low_price),
                self.format_price(item.close_price),
                self.format_volume(item.volume),
                day_change_text,
            )

        return table

    def format_summary_stats(
        self, price_history: List[Union[PriceHistory, PriceHistoryItem]]
    ) -> Table:
        """価格履歴の統計情報をテーブル形式でフォーマット。

        Args:
            price_history: 価格履歴データのリスト

        Returns:
            Richテーブル
        """
        if not price_history:
            table = Table(title="統計情報", box=box.ROUNDED)
            table.add_column("項目", style="cyan")
            table.add_column("値", style="white")
            table.add_row("データなし", "N/A")
            return table

        # 統計計算
        prices = [float(item.close_price) for item in price_history]
        highs = [float(item.high_price) for item in price_history]
        lows = [float(item.low_price) for item in price_history]
        volumes = [item.volume for item in price_history]

        max_price = max(highs)
        min_price = min(lows)
        avg_price = sum(prices) / len(prices)
        avg_volume = sum(volumes) / len(volumes)

        # 最新と最古の価格で期間パフォーマンスを計算
        latest_price = prices[0]  # リストは新しい順に並んでいる前提
        oldest_price = prices[-1]
        period_change = latest_price - oldest_price
        period_change_pct = (
            (period_change / oldest_price * 100) if oldest_price > 0 else 0
        )

        table = Table(title="統計情報", box=box.ROUNDED)
        table.add_column("項目", style="cyan")
        table.add_column("値", style="white")

        table.add_row("期間高値", self.format_price(max_price))
        table.add_row("期間安値", self.format_price(min_price))
        table.add_row("平均終値", self.format_price(avg_price))
        table.add_row("平均出来高", self.format_volume(int(avg_volume)))

        period_change_color = self.get_price_color(period_change)
        period_change_text = Text(
            f"{self.format_price(period_change)} ({period_change_pct:+.2f}%)",
            style=period_change_color,
        )
        table.add_row("期間パフォーマンス", period_change_text)

        return table


class CompactFormatter(StockFormatter):
    """コンパクト形式のフォーマッター（一行表示用）。"""

    def format_stock_list(
        self, stocks: List[Union[Stock, CurrentPrice, StockData]]
    ) -> str:
        """複数銘柄を一行ずつのコンパクト表示文字列に。"""
        return "\n".join(self.format_stock_compact(s) for s in stocks)

    def format_stock_compact(self, stock: Union[Stock, CurrentPrice, StockData]) -> str:
        """株価情報をコンパクト形式でフォーマット。

        Args:
            stock: 株価データ

        Returns:
            コンパクトな文字列
        """
        price_change_sign = "+" if stock.price_change >= 0 else ""
        return (
            f"{stock.stock_code} {stock.company_name} | "
            f"現在価格: {self.format_price(stock.current_price)} "
            f"({price_change_sign}{self.format_price(stock.price_change)}, "
            f"{price_change_sign}{self.format_percentage(stock.price_change_pct)})"
        )

    def format_watchlist_compact(self, watchlist_items: List[Watchlist]) -> List[str]:
        """ウォッチリストをコンパクト形式でフォーマット。

        Args:
            watchlist_items: ウォッチリストアイテムのリスト

        Returns:
            コンパクトな文字列のリスト
        """
        compact_items = []

        for item in watchlist_items:
            if item.stock:
                compact_line = self.format_stock_compact(item.stock)
                if item.notes:
                    compact_line += f" | メモ: {item.notes}"
                compact_items.append(compact_line)
            else:
                compact_items.append(f"{item.stock_code} (データ未取得)")

        return compact_items


# フォーマッター取得のユーティリティ関数
def get_formatter(
    format_type: str, console: Optional[Console] = None
) -> StockFormatter:
    """指定された形式のフォーマッターを取得。

    Args:
        format_type: フォーマット種類 ('json', 'table', 'compact')
        console: Richコンソールインスタンス（オプション）

    Returns:
        対応するフォーマッター

    Raises:
        ValueError: 未対応のフォーマット種類の場合
    """
    formatters = {
        "json": JSONFormatter,
        "table": TableFormatter,
        "compact": CompactFormatter,
    }

    if format_type not in formatters:
        raise ValueError(
            f"Unsupported format type: {format_type}. "
            f"Available types: {', '.join(formatters.keys())}"
        )

    return formatters[format_type](console)
